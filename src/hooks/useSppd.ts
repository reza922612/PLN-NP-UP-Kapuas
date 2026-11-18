import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { db, handleFirestoreError, OperationType, storage } from '../lib/firebase';
import { logActivity } from '../lib/activityLogger';
import { useAuth } from '../context/AuthContext';
import { SppdAttachment, SppdRequest, SppdStatus } from '../types';

export interface SaveSppdInput {
  existingId?: string;
  existingRequestNumber?: string;
  employeeId?: string | null;
  namaPegawai: string;
  nip: string;
  jabatan: string;
  bidang: string;
  unitKerja: SppdRequest['unitKerja'];
  jenisSppd: SppdRequest['jenisSppd'];
  judulPerjalanan: string;
  tanggalKeberangkatan: string;
  tanggalKembali: string;
  nomorPrk: string;
  nomorCoa: string;
  jenisTransportasi: SppdRequest['jenisTransportasi'];
  kotaKeberangkatan: string;
  kotaTujuan: string;
  existingAttachments: SppdAttachment[];
  pendingFiles: File[];
  targetStatus: 'Draft' | 'Menunggu Approval';
  onUploadProgress?: (statusText: string) => void;
}

const clampStr = (val: string, max: number): string => {
  const clean = (val || '').trim();
  return clean.length > max ? clean.slice(0, max) : clean;
};

const generateRequestNumber = (): string => {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SPPD-${ym}-${rand}`;
};

const toMillis = (ts: any): number => {
  if (!ts) return 0;
  if (typeof ts?.toMillis === 'function') return ts.toMillis();
  if (typeof ts?.seconds === 'number') return ts.seconds * 1000;
  return 0;
};

export const useSppd = (shouldFetch: boolean = true) => {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<SppdRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const isPrivilegedReader =
    profile?.role === 'super_admin' ||
    profile?.role === 'admin' ||
    profile?.role === 'viewer';

  useEffect(() => {
    if (!shouldFetch || !user || !profile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const colRef = collection(db, 'sppd_requests');
    const q = isPrivilegedReader
      ? query(colRef, orderBy('createdAt', 'desc'))
      : query(colRef, where('applicantUid', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as SppdRequest)
        );
        items.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setRequests(items);
        setLoading(false);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'sppd_requests');
        } catch (err) {
          console.error('SPPD listener error:', err);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [shouldFetch, user?.uid, profile?.role, isPrivilegedReader]);

  const sppdStats = useMemo(() => {
    const total = requests.length;
    const draft = requests.filter((r) => r.status === 'Draft').length;
    const pending = requests.filter(
      (r) => r.status === 'Submitted' || r.status === 'Menunggu Approval'
    ).length;
    const approved = requests.filter((r) => r.status === 'Approved').length;
    const rejected = requests.filter((r) => r.status === 'Rejected').length;
    const completed = requests.filter((r) => r.status === 'Completed').length;
    return { total, draft, pending, approved, rejected, completed };
  }, [requests]);

  const uploadAttachment = async (
    file: File,
    uid: string,
    index: number,
    total: number,
    onProgress?: (text: string) => void
  ): Promise<SppdAttachment> => {
    let fileToUpload: File = file;

    if (file.type.startsWith('image/') && file.size > 600 * 1024) {
      onProgress?.(`Mengompresi gambar ${index + 1}/${total}...`);
      try {
        fileToUpload = await imageCompression(file, {
          maxSizeMB: 0.9,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        });
      } catch {
        fileToUpload = file;
      }
    }

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const storagePath = `sppd_documents/${uid}/${Date.now()}_${index}_${safeFileName}`;
    const storageRef = ref(storage, storagePath);

    onProgress?.(`Mengunggah dokumen ${index + 1}/${total}: ${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

    await new Promise<void>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const pct = Math.round(
            (snapshot.bytesTransferred / Math.max(1, snapshot.totalBytes)) * 100
          );
          onProgress?.(`Mengunggah ${file.name} (${pct}%)...`);
        },
        (err) => reject(err),
        () => resolve()
      );
    });

    const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

    return {
      id: `${Date.now()}_${index}`,
      name: clampStr(file.name, 256),
      size: fileToUpload.size,
      type: clampStr(file.type || 'application/octet-stream', 64),
      url: clampStr(downloadUrl, 1024),
      uploadedAt: new Date().toISOString(),
    };
  };

  const saveSppdRequest = async (input: SaveSppdInput): Promise<string> => {
    if (!user || !user.email) {
      throw new Error('Sesi pengguna tidak ditemukan. Silakan masuk ulang.');
    }

    const uploadedAttachments: SppdAttachment[] = [];
    for (let i = 0; i < input.pendingFiles.length; i += 1) {
      const uploaded = await uploadAttachment(
        input.pendingFiles[i],
        user.uid,
        i,
        input.pendingFiles.length,
        input.onUploadProgress
      );
      uploadedAttachments.push(uploaded);
    }

    const combinedDocs = [...input.existingAttachments, ...uploadedAttachments].slice(0, 10);
    const requestNumber = clampStr(
      input.existingRequestNumber || generateRequestNumber(),
      64
    );

    input.onUploadProgress?.('Menyimpan pengajuan SPPD ke database...');

    const basePayload = {
      requestNumber,
      employeeId: input.employeeId ? clampStr(input.employeeId, 128) : null,
      namaPegawai: clampStr(input.namaPegawai, 256),
      nip: clampStr(input.nip, 64),
      jabatan: clampStr(input.jabatan, 256),
      bidang: input.bidang,
      unitKerja: input.unitKerja,
      jenisSppd: input.jenisSppd,
      judulPerjalanan: clampStr(input.judulPerjalanan, 300),
      tanggalKeberangkatan: clampStr(input.tanggalKeberangkatan, 32),
      tanggalKembali: clampStr(input.tanggalKembali, 32),
      nomorPrk: clampStr(input.nomorPrk, 128),
      nomorCoa: clampStr(input.nomorCoa, 128),
      jenisTransportasi: input.jenisTransportasi,
      kotaKeberangkatan: clampStr(input.kotaKeberangkatan, 128),
      kotaTujuan: clampStr(input.kotaTujuan, 128),
      dokumenPendukung: combinedDocs,
      status: input.targetStatus,
      approvalNotes: null,
      approvedByName: null,
      approvedByUid: null,
      submittedAt: input.targetStatus === 'Draft' ? null : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (input.existingId) {
      const path = `sppd_requests/${input.existingId}`;
      try {
        await updateDoc(doc(db, 'sppd_requests', input.existingId), basePayload);
        await logActivity({
          action: 'UPDATE',
          entityType: 'sppd',
          entityId: input.existingId,
          entityName: `${requestNumber} · ${basePayload.namaPegawai}`,
          description:
            input.targetStatus === 'Draft'
              ? `Memperbarui draft SPPD "${basePayload.judulPerjalanan}"`
              : `Mengirim pengajuan SPPD "${basePayload.judulPerjalanan}" (${basePayload.kotaKeberangkatan} → ${basePayload.kotaTujuan})`,
        });
        return input.existingId;
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
        return input.existingId;
      }
    }

    const createPayload = {
      ...basePayload,
      applicantUid: user.uid,
      applicantEmail: clampStr(user.email, 256),
      createdAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, 'sppd_requests'), createPayload);
      await logActivity({
        action: 'CREATE',
        entityType: 'sppd',
        entityId: docRef.id,
        entityName: `${requestNumber} · ${createPayload.namaPegawai}`,
        description:
          input.targetStatus === 'Draft'
            ? `Menyimpan draft pengajuan SPPD "${createPayload.judulPerjalanan}"`
            : `Mengajukan SPPD ${createPayload.jenisSppd} "${createPayload.judulPerjalanan}" (${createPayload.kotaKeberangkatan} → ${createPayload.kotaTujuan})`,
      });
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'sppd_requests');
      return '';
    }
  };

  const updateSppdStatus = async (params: {
    sppd: SppdRequest;
    newStatus: SppdStatus;
    approvalNotes?: string;
  }): Promise<void> => {
    const { sppd, newStatus, approvalNotes } = params;
    if (!sppd.id || !user) return;
    const path = `sppd_requests/${sppd.id}`;
    const actorName = clampStr(
      profile?.displayName || user.displayName || user.email || 'Admin',
      256
    );
    try {
      await updateDoc(doc(db, 'sppd_requests', sppd.id), {
        status: newStatus,
        approvalNotes: approvalNotes ? clampStr(approvalNotes, 512) : null,
        approvedByName: actorName,
        approvedByUid: user.uid,
        ...(newStatus === 'Submitted' || newStatus === 'Menunggu Approval'
          ? { submittedAt: sppd.submittedAt || serverTimestamp() }
          : {}),
        updatedAt: serverTimestamp(),
      });
      await logActivity({
        action: 'UPDATE',
        entityType: 'sppd',
        entityId: sppd.id,
        entityName: `${sppd.requestNumber} · ${sppd.namaPegawai}`,
        description: `Mengubah status SPPD menjadi ${newStatus}${
          approvalNotes ? ` (${approvalNotes})` : ''
        }`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deleteSppdRequest = async (sppd: SppdRequest): Promise<void> => {
    if (!sppd.id) return;
    const path = `sppd_requests/${sppd.id}`;
    try {
      await deleteDoc(doc(db, 'sppd_requests', sppd.id));
      await logActivity({
        action: 'DELETE',
        entityType: 'sppd',
        entityId: sppd.id,
        entityName: `${sppd.requestNumber} · ${sppd.namaPegawai}`,
        description: `Menghapus pengajuan SPPD "${sppd.judulPerjalanan}"`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  return {
    requests,
    loading,
    sppdStats,
    saveSppdRequest,
    updateSppdStatus,
    deleteSppdRequest,
  };
};
