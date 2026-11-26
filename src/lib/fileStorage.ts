import { doc, getDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes, uploadBytesResumable, UploadTask } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import firebaseConfig from '../../firebase-applet-config.json';
import { auth, db, storage } from './firebase';

export const MAX_UPLOAD_SIZE_MB = 50;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
export const STORED_FILE_PREFIX = 'stored-file://';

export type FileCategory =
  | 'photo'
  | 'dossier'
  | 'training_cert'
  | 'certification_cert'
  | 'scan_doc'
  | 'unit_photo'
  | 'sppd_attachment'
  | 'ksf_evidence'
  | 'cop_evidence'
  | 'inovasi_doc'
  | 'sop_doc'
  | 'regulasi_doc'
  | 'perdir_doc'
  | 'publication_media'
  | 'mutation_doc';

export interface UploadFileSmartOptions {
  file: File | Blob;
  fileName?: string;
  storagePath: string;
  category: FileCategory;
  label?: string;
  onProgress?: (percent: number, stage?: 'optimizing' | 'uploading') => void;
  signal?: AbortSignal;
}

export interface ResolvedStoredFile {
  blobUrl: string;
  fileName: string;
  mimeType: string;
}

const INLINE_THRESHOLD_BYTES = 450 * 1024; // ~600 KB base64 -> fits safely in 1 Firestore doc
const CHUNK_SIZE_BYTES = 500 * 1024; // ~667 KB base64 per chunk -> < 800 KB rule limit
const CHUNK_UPLOAD_CONCURRENCY = 6;
const CHUNK_DOWNLOAD_BATCH = 8;
const COMPRESSION_TIMEOUT_MS = 2500;
const STORAGE_STALL_TIMEOUT_MS = 12000;

let bucketAvailableCache: boolean | null = null;
let bucketCheckPromise: Promise<boolean> | null = null;

const resolvedFileCache = new Map<string, Promise<ResolvedStoredFile>>();

export const isStoredFileUrl = (url?: string | null): boolean =>
  typeof url === 'string' && url.startsWith(STORED_FILE_PREFIX);

export const extractStoredFileId = (url: string): string =>
  url.slice(STORED_FILE_PREFIX.length);

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const withTimeout = <T,>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const sliceSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += sliceSize) {
    const chunk = bytes.subarray(i, i + sliceSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
};

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const optimizeImageFast = async (
  file: File | Blob,
  category: FileCategory
): Promise<File | Blob> => {
  const mime = file.type || '';
  if (!mime.startsWith('image/') || file.size > 15 * 1024 * 1024) {
    return file;
  }

  const isAvatar = category === 'photo' || category === 'unit_photo';
  const minThreshold = isAvatar ? 180 * 1024 : 500 * 1024;
  if (file.size <= minThreshold) {
    return file;
  }

  try {
    const asFile =
      file instanceof File
        ? file
        : new File([file], `image_${Date.now()}.jpg`, { type: mime || 'image/jpeg' });

    const compressed = await withTimeout(
      imageCompression(asFile, {
        maxSizeMB: isAvatar ? 0.3 : 0.85,
        maxWidthOrHeight: isAvatar ? 1024 : 1600,
        useWebWorker: false,
        initialQuality: isAvatar ? 0.78 : 0.8,
      }),
      COMPRESSION_TIMEOUT_MS,
      'Image compression timeout'
    );
    return compressed.size < file.size ? compressed : file;
  } catch {
    return file;
  }
};

const isFirebaseStorageBucketAvailable = async (): Promise<boolean> => {
  if (bucketAvailableCache !== null) return bucketAvailableCache;
  if (bucketCheckPromise) return bucketCheckPromise;

  const bucket = (firebaseConfig as { storageBucket?: string }).storageBucket;
  if (!bucket) {
    bucketAvailableCache = false;
    return false;
  }

  bucketCheckPromise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    try {
      const res = await fetch(
        `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o?maxResults=1`,
        { method: 'GET', signal: controller.signal }
      );
      // 404 means the Storage bucket does not exist on this Firebase project
      const exists = res.status !== 404;
      bucketAvailableCache = exists;
      return exists;
    } catch {
      bucketAvailableCache = false;
      return false;
    } finally {
      clearTimeout(timer);
      bucketCheckPromise = null;
    }
  })();

  return bucketCheckPromise;
};

const uploadToFirebaseStorage = async (
  fileToUpload: File | Blob,
  safeName: string,
  storagePath: string,
  label: string,
  onProgress?: (percent: number, stage?: 'optimizing' | 'uploading') => void,
  signal?: AbortSignal
): Promise<string> => {
  if (signal?.aborted) {
    throw new Error(`Unggahan ${label} dibatalkan.`);
  }

  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const storageRef = ref(storage, `${storagePath}/${uniqueSuffix}_${safeName}`);
  const metadata = {
    contentType: fileToUpload.type || undefined,
    cacheControl: 'public,max-age=31536000',
  };

  if (fileToUpload.size <= 512 * 1024) {
    const snapshot = await withTimeout(
      uploadBytes(storageRef, fileToUpload, metadata),
      STORAGE_STALL_TIMEOUT_MS,
      `Waktu unggah ${label} habis.`
    );
    if (signal?.aborted) throw new Error(`Unggahan ${label} dibatalkan.`);
    onProgress?.(100, 'uploading');
    return getDownloadURL(snapshot.ref);
  }

  return new Promise<string>((resolve, reject) => {
    const task: UploadTask = uploadBytesResumable(storageRef, fileToUpload, metadata);
    let lastBytes = -1;
    let stallTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (stallTimer) {
        clearTimeout(stallTimer);
        stallTimer = null;
      }
      signal?.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      cleanup();
      try {
        task.cancel();
      } catch {
        // ignore
      }
      reject(new Error(`Unggahan ${label} dibatalkan.`));
    };

    const resetStall = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        try {
          task.cancel();
        } catch {
          // ignore
        }
        cleanup();
        reject(new Error(`Unggahan ${label} terhenti terlalu lama.`));
      }, STORAGE_STALL_TIMEOUT_MS);
    };

    signal?.addEventListener('abort', onAbort, { once: true });
    resetStall();

    task.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.bytesTransferred > lastBytes) {
          lastBytes = snapshot.bytesTransferred;
          resetStall();
        }
        const pct = snapshot.totalBytes
          ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          : 0;
        onProgress?.(pct, 'uploading');
      },
      (err) => {
        cleanup();
        reject(err);
      },
      async () => {
        cleanup();
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          onProgress?.(100, 'uploading');
          resolve(url);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
};

const uploadToFirestoreStorage = async (
  fileToUpload: File | Blob,
  originalName: string,
  category: FileCategory,
  label: string,
  onProgress?: (percent: number, stage?: 'optimizing' | 'uploading') => void,
  signal?: AbortSignal
): Promise<string> => {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('Sesi pengguna tidak ditemukan. Silakan masuk ulang sebelum mengunggah.');
  }
  if (signal?.aborted) {
    throw new Error(`Unggahan ${label} dibatalkan.`);
  }

  const fileId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const cleanFileName = (originalName || 'dokumen').trim().slice(0, 256) || 'dokumen';
  const mimeType = (fileToUpload.type || 'application/octet-stream').slice(0, 128);
  const isPublic =
    category === 'photo' ||
    category === 'unit_photo' ||
    category === 'ksf_evidence' ||
    category === 'inovasi_doc' ||
    category === 'publication_media';

  // Fast single-document inline upload for files <= 450 KB
  if (fileToUpload.size <= INLINE_THRESHOLD_BYTES) {
    onProgress?.(25, 'uploading');
    const buffer = await fileToUpload.arrayBuffer();
    if (signal?.aborted) {
      throw new Error(`Unggahan ${label} dibatalkan.`);
    }
    const base64 = arrayBufferToBase64(buffer);
    onProgress?.(65, 'uploading');

    await setDoc(doc(db, 'stored_files', fileId), {
      fileId,
      fileName: cleanFileName,
      mimeType,
      sizeBytes: fileToUpload.size,
      category,
      isPublic,
      chunkCount: 0,
      inlineData: base64,
      uploadedByUid: uid,
      createdAt: serverTimestamp(),
    });

    onProgress?.(100, 'uploading');
    return `${STORED_FILE_PREFIX}${fileId}`;
  }

  // Parallel chunked upload for larger files up to 50 MB
  const chunkCount = Math.ceil(fileToUpload.size / CHUNK_SIZE_BYTES);
  onProgress?.(5, 'uploading');

  const metaRef = doc(db, 'stored_files', fileId);
  await setDoc(metaRef, {
    fileId,
    fileName: cleanFileName,
    mimeType,
    sizeBytes: fileToUpload.size,
    category,
    isPublic,
    chunkCount,
    inlineData: null,
    uploadedByUid: uid,
    createdAt: serverTimestamp(),
  });

  let nextChunkIndex = 0;
  let completedChunks = 0;

  const uploadNextChunk = async (): Promise<void> => {
    while (nextChunkIndex < chunkCount) {
      if (signal?.aborted) {
        throw new Error(`Unggahan ${label} dibatalkan.`);
      }
      const idx = nextChunkIndex;
      nextChunkIndex += 1;

      const start = idx * CHUNK_SIZE_BYTES;
      const end = Math.min(fileToUpload.size, start + CHUNK_SIZE_BYTES);
      const buffer = await fileToUpload.slice(start, end).arrayBuffer();
      if (signal?.aborted) {
        throw new Error(`Unggahan ${label} dibatalkan.`);
      }

      const data = arrayBufferToBase64(buffer);
      await setDoc(doc(db, 'stored_files', fileId, 'chunks', String(idx)), {
        fileId,
        index: idx,
        data,
        uploadedByUid: uid,
      });

      completedChunks += 1;
      const pct = Math.min(99, 5 + Math.round((completedChunks / chunkCount) * 94));
      onProgress?.(pct, 'uploading');
    }
  };

  try {
    const workerCount = Math.min(CHUNK_UPLOAD_CONCURRENCY, chunkCount);
    await Promise.all(Array.from({ length: workerCount }, () => uploadNextChunk()));
  } catch (err) {
    // Clean up orphaned metadata on failure/cancellation
    deleteDoc(metaRef).catch(() => {});
    throw err;
  }

  onProgress?.(100, 'uploading');
  return `${STORED_FILE_PREFIX}${fileId}`;
};

export const uploadFileSmart = async (options: UploadFileSmartOptions): Promise<string> => {
  const {
    file,
    fileName,
    storagePath,
    category,
    label = 'Berkas',
    onProgress,
    signal,
  } = options;

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error(
      `Ukuran ${label} (${formatFileSize(file.size)}) melebihi batas maksimal ${MAX_UPLOAD_SIZE_MB} MB.`
    );
  }

  if (signal?.aborted) {
    throw new Error(`Unggahan ${label} dibatalkan.`);
  }

  const originalName =
    fileName || (file instanceof File ? file.name : `${category}_${Date.now()}`);
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');

  onProgress?.(2, 'optimizing');
  const fileToUpload = await optimizeImageFast(file, category);

  if (signal?.aborted) {
    throw new Error(`Unggahan ${label} dibatalkan.`);
  }

  onProgress?.(8, 'uploading');

  const hasBucket = await isFirebaseStorageBucketAvailable();
  if (hasBucket) {
    try {
      return await uploadToFirebaseStorage(
        fileToUpload,
        safeName,
        storagePath,
        label,
        onProgress,
        signal
      );
    } catch (err) {
      if (signal?.aborted) {
        throw err;
      }
      const code = (err as { code?: string })?.code || '';
      const msg = err instanceof Error ? err.message : '';
      const isStorageUnavailable =
        code.includes('storage/retry-limit-exceeded') ||
        code.includes('storage/bucket-not-found') ||
        code.includes('storage/unauthorized') ||
        code.includes('storage/unknown') ||
        msg.includes('terhenti') ||
        msg.includes('habis');

      if (!isStorageUnavailable) {
        throw err;
      }
      // Cache unavailability and transparently fall back to Firestore storage
      bucketAvailableCache = false;
    }
  }

  return uploadToFirestoreStorage(
    fileToUpload,
    originalName,
    category,
    label,
    onProgress,
    signal
  );
};

export const resolveStoredFile = (url: string): Promise<ResolvedStoredFile> => {
  if (!isStoredFileUrl(url)) {
    return Promise.resolve({
      blobUrl: url,
      fileName: 'Dokumen',
      mimeType: '',
    });
  }

  const cached = resolvedFileCache.get(url);
  if (cached) return cached;

  const promise = (async () => {
    const fileId = extractStoredFileId(url);
    const metaSnap = await getDoc(doc(db, 'stored_files', fileId));
    if (!metaSnap.exists()) {
      throw new Error('Berkas tidak ditemukan di penyimpanan.');
    }

    const meta = metaSnap.data() as {
      fileName?: string;
      mimeType?: string;
      chunkCount?: number;
      inlineData?: string | null;
    };

    const mimeType = meta.mimeType || 'application/octet-stream';
    const fileName = meta.fileName || 'dokumen';

    if (typeof meta.inlineData === 'string') {
      const bytes = base64ToUint8Array(meta.inlineData);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
      return {
        blobUrl: URL.createObjectURL(blob),
        fileName,
        mimeType,
      };
    }

    const chunkCount = meta.chunkCount || 0;
    const partBuffers: ArrayBuffer[] = new Array(chunkCount);

    for (let start = 0; start < chunkCount; start += CHUNK_DOWNLOAD_BATCH) {
      const indices: number[] = [];
      for (let i = start; i < Math.min(chunkCount, start + CHUNK_DOWNLOAD_BATCH); i += 1) {
        indices.push(i);
      }
      await Promise.all(
        indices.map(async (idx) => {
          const chunkSnap = await getDoc(doc(db, 'stored_files', fileId, 'chunks', String(idx)));
          if (!chunkSnap.exists()) {
            throw new Error(`Bagian berkas ke-${idx + 1} tidak ditemukan.`);
          }
          const chunkData = chunkSnap.data() as { data: string };
          partBuffers[idx] = base64ToUint8Array(chunkData.data).buffer as ArrayBuffer;
        })
      );
    }

    const blob = new Blob(partBuffers, { type: mimeType });
    return {
      blobUrl: URL.createObjectURL(blob),
      fileName,
      mimeType,
    };
  })().catch((err) => {
    resolvedFileCache.delete(url);
    throw err;
  });

  resolvedFileCache.set(url, promise);
  return promise;
};
