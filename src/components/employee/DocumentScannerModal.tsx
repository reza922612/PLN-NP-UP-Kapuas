import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  X,
  RotateCcw,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  SwitchCamera,
  Sparkles,
  FileImage,
  ScanLine,
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { Employee, ScannedDocument, Certification, Training } from '../../types';
import { cn } from '../../lib/utils';

interface DocumentScannerModalProps {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onSaveScan: (updates: Partial<Employee>, activityDetail: string) => Promise<void>;
}

type ScanTargetType = 'certification' | 'training' | 'document';

const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({
  employee,
  isOpen,
  onClose,
  onSaveScan,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [enhanceScan, setEnhanceScan] = useState(true);

  const [targetType, setTargetType] = useState<ScanTargetType>('certification');
  const [title, setTitle] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState('');
  const [docCategory, setDocCategory] = useState('Sertifikat / Piagam');
  const [notes, setNotes] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Browser tidak mendukung akses kamera langsung. Gunakan unggah file di bawah.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setCameraError('Izin kamera ditolak. Berikan izin kamera di browser atau pilih file gambar secara manual.');
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setCameraError('Perangkat kamera tidak ditemukan. Silakan pilih file gambar dokumen.');
      } else {
        setCameraError('Kamera tidak tersedia saat ini. Anda tetap dapat mengunggah foto dokumen dari perangkat.');
      }
    }
  }, [stopCamera]);

  useEffect(() => {
    if (isOpen && !capturedPreview) {
      startCamera(facingMode);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, capturedPreview, startCamera, stopCamera]);

  useEffect(() => {
    return () => {
      if (capturedPreview) {
        URL.revokeObjectURL(capturedPreview);
      }
    };
  }, [capturedPreview]);

  if (!isOpen) return null;

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (enhanceScan) {
      ctx.filter = 'contrast(1.22) brightness(1.04) saturate(0.85)';
    } else {
      ctx.filter = 'none';
    }
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (capturedPreview) URL.revokeObjectURL(capturedPreview);
        const previewUrl = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setCapturedPreview(previewUrl);
        stopCamera();
      },
      'image/jpeg',
      0.92
    );
  };

  const handleManualFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (capturedPreview) URL.revokeObjectURL(capturedPreview);
    setCapturedBlob(file);
    setCapturedPreview(URL.createObjectURL(file));
    stopCamera();
    setCameraError(null);
  };

  const handleRetake = () => {
    if (capturedPreview) URL.revokeObjectURL(capturedPreview);
    setCapturedBlob(null);
    setCapturedPreview(null);
    setSubmitError(null);
  };

  const handleClose = () => {
    stopCamera();
    handleRetake();
    onClose();
  };

  const handleUploadAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!capturedBlob) {
      setSubmitError('Silakan ambil foto dokumen terlebih dahulu.');
      return;
    }
    if (!title.trim()) {
      setSubmitError('Judul atau nama dokumen wajib diisi.');
      return;
    }
    if (targetType === 'certification' && !expiryDate) {
      setSubmitError('Tanggal masa berlaku sertifikasi wajib diisi.');
      return;
    }
    if (!employee.id) {
      setSubmitError('ID pegawai tidak ditemukan.');
      return;
    }

    setUploading(true);
    setUploadProgress(5);

    try {
      const fileToCompress =
        capturedBlob instanceof File
          ? capturedBlob
          : new File([capturedBlob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });

      const compressedFile = await imageCompression(fileToCompress, {
        maxSizeMB: 0.7,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        initialQuality: 0.82,
      });

      const storagePath = `documents/scans/${employee.id}/${Date.now()}_${targetType}.jpg`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, compressedFile);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(pct);
          },
          (err) => reject(err),
          () => resolve()
        );
      });

      const downloadUrl = await getDownloadURL(storageRef);

      if (targetType === 'certification') {
        const newCert: Certification = {
          id: `cert_${Date.now()}`,
          namaSertifikasi: title.trim(),
          tanggalPelaksanaan: issueDate,
          masaBerlaku: expiryDate,
          certificateUrl: downloadUrl,
        };
        const updatedCerts = [...(employee.certifications || []), newCert];
        await onSaveScan(
          { certifications: updatedCerts },
          `Memindai sertifikasi "${title.trim()}" untuk ${employee.fullName}`
        );
      } else if (targetType === 'training') {
        const newTraining: Training = {
          id: `trn_${Date.now()}`,
          namaPelatihan: title.trim(),
          tanggalPelaksanaan: issueDate,
          certificateUrl: downloadUrl,
        };
        const updatedTrainings = [...(employee.trainings || []), newTraining];
        await onSaveScan(
          { trainings: updatedTrainings },
          `Memindai sertifikat pelatihan "${title.trim()}" untuk ${employee.fullName}`
        );
      } else {
        const trimmedNotes = notes.trim();
        const newDoc: ScannedDocument = {
          id: `doc_${Date.now()}`,
          title: title.trim(),
          category: docCategory,
          fileUrl: downloadUrl,
          scannedAt: new Date().toISOString(),
          ...(trimmedNotes ? { notes: trimmedNotes } : {}),
        };
        const updatedDocs = [...(employee.scannedDocuments || []), newDoc];
        await onSaveScan(
          { scannedDocuments: updatedDocs },
          `Memindai dokumen fisik "${title.trim()}" (${docCategory}) untuk ${employee.fullName}`
        );
      }

      handleClose();
    } catch (err: any) {
      console.error('Document scan upload error:', err);
      setSubmitError('Gagal mengunggah hasil pindaian ke penyimpanan cloud. Periksa koneksi Anda.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#071120]/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0E1A2E] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl overflow-hidden my-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-[#F8FBFD] dark:bg-[#11223B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0072BC] text-white flex items-center justify-center shadow-xs">
              <ScanLine size={20} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#173B65] dark:text-slate-100 tracking-tight">
                Pemindai Dokumen &amp; Sertifikat
              </h3>
              <p className="text-[11px] font-bold text-[#0072BC] dark:text-[#72C8F1]">
                {employee.fullName} · NIP {employee.nip}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleUploadAndSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Left: Camera / Capture Preview */}
          <div className="space-y-4">
            <div className="relative aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center">
              {capturedPreview ? (
                <img
                  src={capturedPreview}
                  alt="Hasil Pindaian"
                  className="w-full h-full object-contain bg-slate-900"
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={cn(
                      'w-full h-full object-cover',
                      enhanceScan && 'contrast-125 brightness-105 saturate-75',
                      !cameraActive && 'hidden'
                    )}
                  />

                  {/* Scanner Alignment Guide */}
                  {cameraActive && (
                    <div className="absolute inset-6 pointer-events-none">
                      <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />
                    </div>
                  )}

                  {!cameraActive && (
                    <div className="p-6 text-center space-y-3 text-white/80">
                      <Camera size={40} className="mx-auto text-slate-500" />
                      <p className="text-xs font-medium leading-relaxed max-w-xs mx-auto">
                        {cameraError || 'Menginisialisasi kamera perangkat...'}
                      </p>
                    </div>
                  )}
                </>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Camera Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {!capturedPreview ? (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <SwitchCamera size={14} />
                      Ganti Kamera
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnhanceScan((prev) => !prev)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-colors',
                        enhanceScan
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-pln-blue dark:text-cyan-400 border-blue-200 dark:border-blue-800'
                          : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      )}
                    >
                      <Sparkles size={13} />
                      Mode Scan {enhanceScan ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                      <FileImage size={14} />
                      Pilih File
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleManualFile}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={!cameraActive}
                      onClick={handleCapture}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-pln-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-pln-dark transition-all shadow-lg shadow-blue-100 dark:shadow-blue-950/40 disabled:opacity-40"
                    >
                      <Camera size={15} />
                      Ambil Foto
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                    <CheckCircle2 size={14} /> Gambar siap diunggah
                  </span>
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <RotateCcw size={14} />
                    Foto Ulang
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Document Metadata */}
          <div className="flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Simpan Sebagai
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'certification', label: 'Sertifikasi' },
                    { id: 'training', label: 'Pelatihan' },
                    { id: 'document', label: 'Arsip Fisik' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTargetType(opt.id as ScanTargetType)}
                      className={cn(
                        'py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all',
                        targetType === opt.id
                          ? 'bg-pln-blue text-white border-pln-blue shadow-md shadow-blue-100 dark:shadow-blue-950/40'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  {targetType === 'certification'
                    ? 'Nama Sertifikasi'
                    : targetType === 'training'
                    ? 'Nama Pelatihan'
                    : 'Judul Dokumen'}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    targetType === 'certification'
                      ? 'Contoh: Sertifikat Ahli K3 Listrik'
                      : targetType === 'training'
                      ? 'Contoh: Diklat Operasi PLTD'
                      : 'Contoh: SK Pengangkatan Pegawai'
                  }
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-pln-blue outline-none"
                />
              </div>

              {targetType === 'certification' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Tgl Pelaksanaan
                    </label>
                    <input
                      type="date"
                      required
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-pln-blue outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Masa Berlaku s/d
                    </label>
                    <input
                      type="date"
                      required
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-pln-blue outline-none"
                    />
                  </div>
                </div>
              )}

              {targetType === 'training' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Tanggal Pelaksanaan
                  </label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-pln-blue outline-none"
                  />
                </div>
              )}

              {targetType === 'document' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Kategori Dokumen
                    </label>
                    <select
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-pln-blue outline-none"
                    >
                      <option value="Sertifikat / Piagam">Sertifikat / Piagam</option>
                      <option value="SK Kepegawaian">SK Kepegawaian</option>
                      <option value="Identitas (KTP/NPWP/BPJS)">Identitas (KTP/NPWP/BPJS)</option>
                      <option value="Ijazah / Transkrip">Ijazah / Transkrip</option>
                      <option value="Dokumen Medis / K3">Dokumen Medis / K3</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Catatan (Opsional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Nomor surat atau keterangan singkat..."
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-pln-blue outline-none"
                    />
                  </div>
                </>
              )}

              {submitError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900/50 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-[11px] font-bold">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {uploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-black text-pln-blue dark:text-cyan-400 uppercase tracking-widest">
                    <span>Mengunggah Hasil Scan...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pln-blue transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={uploading}
                onClick={handleClose}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={uploading || !capturedBlob}
                className="inline-flex items-center gap-2 px-6 py-2.5 pln-gradient text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/15 hover:brightness-110 transition-all disabled:opacity-40"
              >
                {uploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    Simpan ke Profil
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentScannerModal;
