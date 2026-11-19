import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Eye,
  FileCheck2,
  FileText,
  Hash,
  Loader2,
  MapPin,
  Paperclip,
  Plane,
  RotateCcw,
  Save,
  Search,
  Send,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Employee, SppdAttachment, SppdRequest, SppdTransportType, SppdType, SppdUnitWork } from '../../types';
import {
  mapUnitPelaksanaToSppdUnit,
  SPPD_BIDANG_OPTIONS,
  SPPD_CITY_SUGGESTIONS,
  SPPD_JENIS_OPTIONS,
  SPPD_TRANSPORT_OPTIONS,
  SPPD_UNIT_KERJA_OPTIONS,
} from '../../data/sppdConstants';
import { SaveSppdInput } from '../../hooks/useSppd';
import { cn } from '../../lib/utils';
import { ConfirmDialog } from '../common/DashboardUI';
import { StoredImage, StoredFileFrame } from '../common/StoredFileUI';

interface SppdFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (input: SaveSppdInput) => Promise<string>;
  employees?: Employee[];
  defaultEmployee?: Employee | null;
  initialSppd?: SppdRequest | null;
  onSavedSuccess?: (status: 'Draft' | 'Menunggu Approval', title: string) => void;
}

interface PendingFileItem {
  id: string;
  file: File;
  previewUrl: string;
  isImage: boolean;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_TOTAL_FILES = 10;
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const SppdFormModal: React.FC<SppdFormModalProps> = ({
  open,
  onClose,
  onSave,
  employees = [],
  defaultEmployee = null,
  initialSppd = null,
  onSavedSuccess,
}) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [namaPegawai, setNamaPegawai] = useState('');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [bidang, setBidang] = useState<string>('');
  const [unitKerja, setUnitKerja] = useState<SppdUnitWork>('UP Kapuas');

  const [jenisSppd, setJenisSppd] = useState<SppdType>('SPPD Non Diklat');
  const [judulPerjalanan, setJudulPerjalanan] = useState('');
  const [tanggalKeberangkatan, setTanggalKeberangkatan] = useState('');
  const [tanggalKembali, setTanggalKembali] = useState('');
  const [nomorPrk, setNomorPrk] = useState('');
  const [nomorCoa, setNomorCoa] = useState('');

  const [jenisTransportasi, setJenisTransportasi] = useState<SppdTransportType>(
    'Pesawat (Angkutan Udara)'
  );
  const [kotaKeberangkatan, setKotaKeberangkatan] = useState('');
  const [kotaTujuan, setKotaTujuan] = useState('');

  const [existingAttachments, setExistingAttachments] = useState<SppdAttachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFileItem[]>([]);
  const [previewDoc, setPreviewDoc] = useState<{
    name: string;
    url: string;
    isImage: boolean;
  } | null>(null);

  // Interactive dropdown states
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);
  const [bidangDropdownOpen, setBidangDropdownOpen] = useState(false);
  const [bidangSearch, setBidangSearch] = useState('');
  const [originDropdownOpen, setOriginDropdownOpen] = useState(false);
  const [destDropdownOpen, setDestDropdownOpen] = useState(false);

  // Validation, confirm & submission state
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progressText, setProgressText] = useState('');

  const empRef = useRef<HTMLDivElement>(null);
  const bidangRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initializeForm = () => {
    setTouched({});
    setSubmitAttempted(false);
    setFileError(null);
    setSubmitError(null);
    setProgressText('');
    setBidangSearch('');
    setPreviewDoc(null);

    if (initialSppd) {
      setSelectedEmployeeId(initialSppd.employeeId || null);
      setNamaPegawai(initialSppd.namaPegawai || '');
      setNip(initialSppd.nip || '');
      setJabatan(initialSppd.jabatan || '');
      setBidang(initialSppd.bidang || '');
      setUnitKerja(initialSppd.unitKerja || 'UP Kapuas');
      setJenisSppd(initialSppd.jenisSppd || 'SPPD Non Diklat');
      setJudulPerjalanan(initialSppd.judulPerjalanan || '');
      setTanggalKeberangkatan(initialSppd.tanggalKeberangkatan || '');
      setTanggalKembali(initialSppd.tanggalKembali || '');
      setNomorPrk(initialSppd.nomorPrk || '');
      setNomorCoa(initialSppd.nomorCoa || '');
      setJenisTransportasi(initialSppd.jenisTransportasi || 'Pesawat (Angkutan Udara)');
      setKotaKeberangkatan(initialSppd.kotaKeberangkatan || '');
      setKotaTujuan(initialSppd.kotaTujuan || '');
      setExistingAttachments(initialSppd.dokumenPendukung || []);
      setPendingFiles([]);
      return;
    }

    if (defaultEmployee) {
      setSelectedEmployeeId(defaultEmployee.id || null);
      setNamaPegawai(defaultEmployee.fullName || '');
      setNip(defaultEmployee.nip || '');
      setJabatan(defaultEmployee.jabatanLengkap || '');
      setUnitKerja(mapUnitPelaksanaToSppdUnit(defaultEmployee.unitPelaksana));
    } else {
      setSelectedEmployeeId(null);
      setNamaPegawai('');
      setNip('');
      setJabatan('');
      setUnitKerja('UP Kapuas');
    }

    setBidang('');
    setJenisSppd('SPPD Non Diklat');
    setJudulPerjalanan('');
    setTanggalKeberangkatan('');
    setTanggalKembali('');
    setNomorPrk('');
    setNomorCoa('');
    setJenisTransportasi('Pesawat (Angkutan Udara)');
    setKotaKeberangkatan('Pontianak');
    setKotaTujuan('');
    setExistingAttachments([]);
    setPendingFiles([]);
  };

  useEffect(() => {
    if (open) {
      initializeForm();
    }
  }, [open, initialSppd?.id, defaultEmployee?.id]);

  // Close popovers on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (empRef.current && !empRef.current.contains(target)) setEmpDropdownOpen(false);
      if (bidangRef.current && !bidangRef.current.contains(target)) setBidangDropdownOpen(false);
      if (originRef.current && !originRef.current.contains(target)) setOriginDropdownOpen(false);
      if (destRef.current && !destRef.current.contains(target)) setDestDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Revoke preview URLs on unmount
  useEffect(() => {
    return () => {
      pendingFiles.forEach((pf) => URL.revokeObjectURL(pf.previewUrl));
    };
  }, [pendingFiles]);

  const filteredEmployees = useMemo(() => {
    const q = namaPegawai.trim().toLowerCase();
    if (!q) return employees.slice(0, 12);
    return employees
      .filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.nip.toLowerCase().includes(q) ||
          (e.jabatanLengkap || '').toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [employees, namaPegawai]);

  const filteredBidang = useMemo(() => {
    const q = bidangSearch.trim().toLowerCase();
    if (!q) return [...SPPD_BIDANG_OPTIONS];
    return SPPD_BIDANG_OPTIONS.filter((b) => b.toLowerCase().includes(q));
  }, [bidangSearch]);

  const filteredOriginCities = useMemo(() => {
    const q = kotaKeberangkatan.trim().toLowerCase();
    if (!q) return SPPD_CITY_SUGGESTIONS.slice(0, 8);
    return SPPD_CITY_SUGGESTIONS.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
  }, [kotaKeberangkatan]);

  const filteredDestCities = useMemo(() => {
    const q = kotaTujuan.trim().toLowerCase();
    if (!q) return SPPD_CITY_SUGGESTIONS.slice(0, 8);
    return SPPD_CITY_SUGGESTIONS.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
  }, [kotaTujuan]);

  const tripDays = useMemo(() => {
    if (!tanggalKeberangkatan || !tanggalKembali) return null;
    try {
      const diff = differenceInCalendarDays(
        parseISO(tanggalKembali),
        parseISO(tanggalKeberangkatan)
      );
      return diff >= 0 ? diff + 1 : null;
    } catch {
      return null;
    }
  }, [tanggalKeberangkatan, tanggalKembali]);

  const fieldErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!namaPegawai.trim()) errs.namaPegawai = 'Nama pegawai wajib diisi.';
    if (!nip.trim()) errs.nip = 'NIP wajib diisi.';
    if (!jabatan.trim()) errs.jabatan = 'Jabatan wajib diisi.';
    if (!bidang) errs.bidang = 'Pilih bidang penugasan.';
    if (!unitKerja) errs.unitKerja = 'Pilih unit kerja.';
    if (!judulPerjalanan.trim()) errs.judulPerjalanan = 'Judul / maksud perjalanan dinas wajib diisi.';
    if (!tanggalKeberangkatan) errs.tanggalKeberangkatan = 'Tanggal keberangkatan wajib diisi.';
    if (!tanggalKembali) {
      errs.tanggalKembali = 'Tanggal kembali wajib diisi.';
    } else if (tanggalKeberangkatan && tanggalKembali < tanggalKeberangkatan) {
      errs.tanggalKembali = 'Tanggal kembali tidak boleh lebih awal dari tanggal keberangkatan.';
    }
    if (!nomorPrk.trim()) errs.nomorPrk = 'Nomor PRK wajib diisi.';
    if (!nomorCoa.trim()) errs.nomorCoa = 'Nomor COA wajib diisi.';
    if (!kotaKeberangkatan.trim()) errs.kotaKeberangkatan = 'Kota keberangkatan wajib diisi.';
    if (!kotaTujuan.trim()) errs.kotaTujuan = 'Kota tujuan wajib diisi.';
    return errs;
  }, [
    namaPegawai,
    nip,
    jabatan,
    bidang,
    unitKerja,
    judulPerjalanan,
    tanggalKeberangkatan,
    tanggalKembali,
    nomorPrk,
    nomorCoa,
    kotaKeberangkatan,
    kotaTujuan,
  ]);

  const showError = (field: string): string | undefined => {
    if (submitAttempted || touched[field]) return fieldErrors[field];
    return undefined;
  };

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployeeId(emp.id || null);
    setNamaPegawai(emp.fullName);
    setNip(emp.nip);
    setJabatan(emp.jabatanLengkap || '');
    setUnitKerja(mapUnitPelaksanaToSppdUnit(emp.unitPelaksana));
    setEmpDropdownOpen(false);
    setTouched((prev) => ({ ...prev, namaPegawai: true, nip: true, jabatan: true }));
  };

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setFileError(null);

    const currentTotal = existingAttachments.length + pendingFiles.length;
    const incomingFiles = Array.from(fileList);

    if (currentTotal + incomingFiles.length > MAX_TOTAL_FILES) {
      setFileError(`Maksimal ${MAX_TOTAL_FILES} dokumen pendukung per pengajuan.`);
      return;
    }

    const accepted: PendingFileItem[] = [];
    for (const file of incomingFiles) {
      const lowerName = file.name.toLowerCase();
      const validMime = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
      const validExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

      if (!validMime && !validExt) {
        setFileError(
          `Format "${file.name}" tidak didukung. Hanya menerima PDF, JPG, JPEG, atau PNG.`
        );
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileError(`Ukuran file "${file.name}" melebihi batas 10 MB.`);
        continue;
      }

      const isImage =
        file.type.startsWith('image/') ||
        lowerName.endsWith('.jpg') ||
        lowerName.endsWith('.jpeg') ||
        lowerName.endsWith('.png');

      accepted.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        isImage,
      });
    }

    if (accepted.length > 0) {
      setPendingFiles((prev) => [...prev, ...accepted]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePendingFile = (id: string) => {
    setPendingFiles((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleRemoveExistingAttachment = (id: string) => {
    setExistingAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const executePersist = async (targetStatus: 'Draft' | 'Menunggu Approval') => {
    setSubmitError(null);
    setSubmitting(true);
    setProgressText(
      targetStatus === 'Draft' ? 'Menyimpan draft SPPD...' : 'Memproses pengajuan SPPD...'
    );

    try {
      await onSave({
        existingId: initialSppd?.id,
        existingRequestNumber: initialSppd?.requestNumber,
        employeeId: selectedEmployeeId,
        namaPegawai,
        nip,
        jabatan,
        bidang,
        unitKerja,
        jenisSppd,
        judulPerjalanan,
        tanggalKeberangkatan,
        tanggalKembali,
        nomorPrk,
        nomorCoa,
        jenisTransportasi,
        kotaKeberangkatan,
        kotaTujuan,
        existingAttachments,
        pendingFiles: pendingFiles.map((p) => p.file),
        targetStatus,
        onUploadProgress: (txt) => setProgressText(txt),
      });

      setConfirmOpen(false);
      onSavedSuccess?.(targetStatus, judulPerjalanan.trim() || 'Pengajuan SPPD');
      onClose();
    } catch (err: any) {
      setConfirmOpen(false);
      setSubmitError(err?.message || 'Gagal menyimpan pengajuan SPPD. Silakan coba kembali.');
    } finally {
      setSubmitting(false);
      setProgressText('');
    }
  };

  const handleSaveDraft = () => {
    setSubmitAttempted(true);
    // For Draft, still require basic identification + valid enum fields so Firestore validation passes cleanly
    if (Object.keys(fieldErrors).length > 0) {
      setSubmitError(
        'Lengkapi seluruh kolom bertanda wajib (*) sebelum menyimpan draft atau mengirim pengajuan.'
      );
      return;
    }
    executePersist('Draft');
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setSubmitError(null);
    if (Object.keys(fieldErrors).length > 0) {
      setSubmitError('Mohon periksa kembali kolom yang wajib diisi atau masih memiliki kesalahan.');
      return;
    }
    setConfirmOpen(true);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#071120]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sppd-modal-title"
    >
      <div className="bg-white dark:bg-[#0E1A2E] w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Corporate Gradient Modal Header */}
        <div className="bg-gradient-to-r from-[#173B65] via-[#0072BC] to-[#009CE0] px-6 py-5 text-white relative shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-xs border border-white/25 flex items-center justify-center shrink-0">
                <Plane size={21} className="text-[#F9D423]" />
              </div>
              <div>
                <h2 id="sppd-modal-title" className="text-lg font-extrabold tracking-tight">
                  {initialSppd ? `Edit Pengajuan SPPD (${initialSppd.requestNumber})` : 'Form Input Pengajuan SPPD'}
                </h2>
                <p className="text-xs text-blue-100/90 mt-0.5">
                  PT PLN Nusantara Power UP Kapuas · Pengajuan Surat Perjalanan Dinas Terintegrasi
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Tutup Form SPPD"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-1 bg-[#F9D423]"
          />
        </div>

        {/* Scrollable 4-Section Form */}
        <form onSubmit={handleRequestSubmit} className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-7">
          {submitError && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 flex items-start gap-2.5 text-xs font-semibold"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* SECTION 1: DATA PEGAWAI */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center">
                  <User size={15} />
                </span>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#173B65] dark:text-slate-100">
                    Section 1 – Data Pegawai &amp; Unit Kerja
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Pilih pegawai dari database untuk pengisian otomatis atau ketik manual
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                <span className="text-red-500">*</span> Wajib diisi
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Nama Pegawai (Autocomplete) */}
              <div className="space-y-1.5 relative" ref={empRef}>
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  Nama Pegawai <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0072BC] dark:text-[#72C8F1]"
                  />
                  <input
                    type="text"
                    value={namaPegawai}
                    maxLength={256}
                    onFocus={() => setEmpDropdownOpen(true)}
                    onChange={(e) => {
                      setNamaPegawai(e.target.value);
                      setSelectedEmployeeId(null);
                      setEmpDropdownOpen(true);
                      setTouched((p) => ({ ...p, namaPegawai: true }));
                    }}
                    onBlur={() => setTouched((p) => ({ ...p, namaPegawai: true }))}
                    placeholder={
                      employees.length > 0
                        ? 'Ketik nama atau NIP untuk mencari pegawai...'
                        : 'Masukkan nama lengkap pegawai'
                    }
                    className={cn(
                      'w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]',
                      showError('namaPegawai')
                        ? 'border-red-400'
                        : 'border-slate-200 dark:border-slate-700'
                    )}
                  />
                </div>
                {showError('namaPegawai') && (
                  <p className="text-[11px] text-red-500 font-semibold">{showError('namaPegawai')}</p>
                )}

                {empDropdownOpen && filteredEmployees.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-2xl bg-white dark:bg-[#0B172A] border border-slate-200 dark:border-slate-700 shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredEmployees.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => handleSelectEmployee(emp)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-[#EAF6FC] dark:hover:bg-[#0072BC]/20 transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#173B65] dark:text-slate-100 truncate">
                            {emp.fullName}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {emp.jabatanLengkap || '-'} · {emp.unitPelaksana}
                          </p>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-[#0072BC] dark:text-[#72C8F1] shrink-0">
                          {emp.nip}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. NIP */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  NIP <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={nip}
                    maxLength={64}
                    onChange={(e) => setNip(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, nip: true }))}
                    placeholder="Nomor Induk Pegawai"
                    className={cn(
                      'w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border text-xs font-semibold font-mono text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]',
                      showError('nip') ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'
                    )}
                  />
                </div>
                {showError('nip') && (
                  <p className="text-[11px] text-red-500 font-semibold">{showError('nip')}</p>
                )}
              </div>

              {/* 3. Jabatan */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  Jabatan <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Briefcase
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={jabatan}
                    maxLength={256}
                    onChange={(e) => setJabatan(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, jabatan: true }))}
                    placeholder="Contoh: Team Leader Rendal Pemeliharaan"
                    className={cn(
                      'w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]',
                      showError('jabatan')
                        ? 'border-red-400'
                        : 'border-slate-200 dark:border-slate-700'
                    )}
                  />
                </div>
                {showError('jabatan') && (
                  <p className="text-[11px] text-red-500 font-semibold">{showError('jabatan')}</p>
                )}
              </div>

              {/* 4. Bidang (Searchable Dropdown) */}
              <div className="space-y-1.5 relative" ref={bidangRef}>
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  Bidang <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setBidangDropdownOpen((prev) => !prev);
                    setTouched((p) => ({ ...p, bidang: true }));
                  }}
                  className={cn(
                    'w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border text-xs font-semibold text-left flex items-center justify-between gap-2 outline-none focus:ring-2 focus:ring-[#0072BC]',
                    showError('bidang')
                      ? 'border-red-400'
                      : 'border-slate-200 dark:border-slate-700',
                    bidang ? 'text-[#173B65] dark:text-slate-100' : 'text-slate-400'
                  )}
                >
                  <span className="truncate">{bidang || 'Pilih Bidang...'}</span>
                  <ChevronDown size={15} className="shrink-0 text-slate-400" />
                </button>
                {showError('bidang') && (
                  <p className="text-[11px] text-red-500 font-semibold">{showError('bidang')}</p>
                )}

                {bidangDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1 rounded-2xl bg-white dark:bg-[#0B172A] border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="relative">
                        <Search
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="text"
                          value={bidangSearch}
                          onChange={(e) => setBidangSearch(e.target.value)}
                          placeholder="Cari nama bidang..."
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#F4F8FB] dark:bg-slate-800 text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none"
                        />
                      </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/60">
                      {filteredBidang.length === 0 ? (
                        <p className="p-3 text-xs text-slate-400 text-center">
                          Bidang tidak ditemukan
                        </p>
                      ) : (
                        filteredBidang.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setBidang(option);
                              setBidangDropdownOpen(false);
                              setBidangSearch('');
                            }}
                            className={cn(
                              'w-full text-left px-3.5 py-2.5 text-xs font-semibold transition-colors flex items-center justify-between gap-2',
                              bidang === option
                                ? 'bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1] font-bold'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                            )}
                          >
                            <span>{option}</span>
                            {bidang === option && <CheckCircle2 size={14} className="shrink-0" />}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Unit Kerja */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  Unit Kerja <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0072BC] dark:text-[#72C8F1]"
                  />
                  <select
                    value={unitKerja}
                    onChange={(e) => setUnitKerja(e.target.value as SppdUnitWork)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                  >
                    {SPPD_UNIT_KERJA_OPTIONS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: INFORMASI PERJALANAN DINAS */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center">
                  <Calendar size={15} />
                </span>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#173B65] dark:text-slate-100">
                    Section 2 – Informasi Perjalanan Dinas
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Kategori SPPD, maksud penugasan, periode tanggal, serta pembebanan PRK &amp; COA
                  </p>
                </div>
              </div>
              {tripDays !== null && (
                <span className="text-xs font-extrabold text-[#0072BC] dark:text-[#72C8F1] tabular-nums">
                  Durasi: {tripDays} Hari
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 6. Jenis SPPD */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  Jenis SPPD <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  {SPPD_JENIS_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setJenisSppd(opt)}
                      className={cn(
                        'py-2 px-3 rounded-lg text-xs font-bold transition-all',
                        jenisSppd === opt
                          ? 'bg-[#0072BC] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-[#173B65]'
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 7. Judul Perjalanan Dinas */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  Judul Perjalanan Dinas <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={judulPerjalanan}
                  maxLength={300}
                  onChange={(e) => setJudulPerjalanan(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, judulPerjalanan: true }))}
                  placeholder="Contoh: Rapat Koordinasi Overhaul & Keandalan Pembangkit"
                  className={cn(
                    'w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]',
                    showError('judulPerjalanan')
                      ? 'border-red-400'
                      : 'border-slate-200 dark:border-slate-700'
                  )}
                />
                {showError('judulPerjalanan') && (
                  <p className="text-[11px] text-red-500 font-semibold">
                    {showError('judulPerjalanan')}
                  </p>
                )}
              </div>

              {/* 8. Tanggal Keberangkatan */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  Tanggal Keberangkatan <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={tanggalKeberangkatan}
                  onChange={(e) => setTanggalKeberangkatan(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, tanggalKeberangkatan: true }))}
                  className={cn(
                    'w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]',
                    showError('tanggalKeberangkatan')
                      ? 'border-red-400'
                      : 'border-slate-200 dark:border-slate-700'
                  )}
                />
                {showError('tanggalKeberangkatan') && (
                  <p className="text-[11px] text-red-500 font-semibold">
                    {showError('tanggalKeberangkatan')}
                  </p>
                )}
              </div>

              {/* 9. Tanggal Kembali */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  Tanggal Kembali <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  min={tanggalKeberangkatan || undefined}
                  value={tanggalKembali}
                  onChange={(e) => {
                    setTanggalKembali(e.target.value);
                    setTouched((p) => ({ ...p, tanggalKembali: true }));
                  }}
                  onBlur={() => setTouched((p) => ({ ...p, tanggalKembali: true }))}
                  className={cn(
                    'w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]',
                    showError('tanggalKembali')
                      ? 'border-red-400'
                      : 'border-slate-200 dark:border-slate-700'
                  )}
                />
                {showError('tanggalKembali') && (
                  <p className="text-[11px] text-red-500 font-semibold">
                    {showError('tanggalKembali')}
                  </p>
                )}
              </div>

              {/* 10. Nomor PRK */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  Nomor PRK <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nomorPrk}
                  maxLength={128}
                  onChange={(e) => setNomorPrk(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, nomorPrk: true }))}
                  placeholder="Contoh: PRK.KPS.2026.014"
                  className={cn(
                    'w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border text-xs font-semibold font-mono text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]',
                    showError('nomorPrk')
                      ? 'border-red-400'
                      : 'border-slate-200 dark:border-slate-700'
                  )}
                />
                {showError('nomorPrk') && (
                  <p className="text-[11px] text-red-500 font-semibold">{showError('nomorPrk')}</p>
                )}
              </div>

              {/* 11. Nomor COA */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  Nomor COA <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nomorCoa}
                  maxLength={128}
                  onChange={(e) => setNomorCoa(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, nomorCoa: true }))}
                  placeholder="Contoh: 51320101"
                  className={cn(
                    'w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border text-xs font-semibold font-mono text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]',
                    showError('nomorCoa')
                      ? 'border-red-400'
                      : 'border-slate-200 dark:border-slate-700'
                  )}
                />
                {showError('nomorCoa') && (
                  <p className="text-[11px] text-red-500 font-semibold">{showError('nomorCoa')}</p>
                )}
              </div>
            </div>
          </section>

          {/* SECTION 3: TRANSPORTASI */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center">
                <Plane size={15} />
              </span>
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#173B65] dark:text-slate-100">
                  Section 3 – Transportasi &amp; Rute Perjalanan
                </h3>
                <p className="text-[11px] text-slate-400">
                  Moda transportasi utama serta kota asal dan tujuan perjalanan dinas
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 12. Jenis Transportasi */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  Jenis Transportasi <span className="text-red-500">*</span>
                </label>
                <select
                  value={jenisTransportasi}
                  onChange={(e) => setJenisTransportasi(e.target.value as SppdTransportType)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                >
                  {SPPD_TRANSPORT_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* 13. Kota Keberangkatan (Autocomplete) */}
              <div className="space-y-1.5 relative" ref={originRef}>
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  Kota Keberangkatan <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0072BC] dark:text-[#72C8F1]"
                  />
                  <input
                    type="text"
                    value={kotaKeberangkatan}
                    maxLength={128}
                    onFocus={() => setOriginDropdownOpen(true)}
                    onChange={(e) => {
                      setKotaKeberangkatan(e.target.value);
                      setOriginDropdownOpen(true);
                    }}
                    onBlur={() => setTouched((p) => ({ ...p, kotaKeberangkatan: true }))}
                    placeholder="Contoh: Pontianak"
                    className={cn(
                      'w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]',
                      showError('kotaKeberangkatan')
                        ? 'border-red-400'
                        : 'border-slate-200 dark:border-slate-700'
                    )}
                  />
                </div>
                {showError('kotaKeberangkatan') && (
                  <p className="text-[11px] text-red-500 font-semibold">
                    {showError('kotaKeberangkatan')}
                  </p>
                )}
                {originDropdownOpen && filteredOriginCities.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-1 max-h-44 overflow-y-auto rounded-xl bg-white dark:bg-[#0B172A] border border-slate-200 dark:border-slate-700 shadow-lg divide-y divide-slate-50 dark:divide-slate-800">
                    {filteredOriginCities.map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          setKotaKeberangkatan(city);
                          setOriginDropdownOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#173B65] dark:text-slate-200 hover:bg-[#EAF6FC] dark:hover:bg-[#0072BC]/20"
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 14. Kota Tujuan (Autocomplete) */}
              <div className="space-y-1.5 relative" ref={destRef}>
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  Kota Tujuan <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#F9D423]"
                  />
                  <input
                    type="text"
                    value={kotaTujuan}
                    maxLength={128}
                    onFocus={() => setDestDropdownOpen(true)}
                    onChange={(e) => {
                      setKotaTujuan(e.target.value);
                      setDestDropdownOpen(true);
                    }}
                    onBlur={() => setTouched((p) => ({ ...p, kotaTujuan: true }))}
                    placeholder="Contoh: Jakarta"
                    className={cn(
                      'w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]',
                      showError('kotaTujuan')
                        ? 'border-red-400'
                        : 'border-slate-200 dark:border-slate-700'
                    )}
                  />
                </div>
                {showError('kotaTujuan') && (
                  <p className="text-[11px] text-red-500 font-semibold">
                    {showError('kotaTujuan')}
                  </p>
                )}
                {destDropdownOpen && filteredDestCities.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-1 max-h-44 overflow-y-auto rounded-xl bg-white dark:bg-[#0B172A] border border-slate-200 dark:border-slate-700 shadow-lg divide-y divide-slate-50 dark:divide-slate-800">
                    {filteredDestCities.map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          setKotaTujuan(city);
                          setDestDropdownOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#173B65] dark:text-slate-200 hover:bg-[#EAF6FC] dark:hover:bg-[#0072BC]/20"
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* SECTION 4: DOKUMEN PENDUKUNG */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center">
                  <Paperclip size={15} />
                </span>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#173B65] dark:text-slate-100">
                    Section 4 – Dokumen Pendukung
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Upload Surat Penugasan, Undangan, Tiket, Karcis Transportasi, dan Hotel (PDF, JPG, JPEG, PNG)
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#0072BC] dark:text-[#72C8F1] tabular-nums">
                {existingAttachments.length + pendingFiles.length}/{MAX_TOTAL_FILES} File
              </span>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFilesSelected(e.dataTransfer.files);
              }}
              className="rounded-2xl border-2 border-dashed border-[#72C8F1]/60 dark:border-slate-700 bg-[#F4F8FB] dark:bg-slate-800/40 p-6 text-center space-y-3"
            >
              <div className="w-11 h-11 rounded-2xl bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center mx-auto">
                <Upload size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#173B65] dark:text-slate-100">
                  Tarik &amp; lepas file di sini atau klik tombol untuk memilih banyak dokumen
                </p>
                <p className="text-[11px] text-slate-400">
                  Format didukung: PDF, JPG, JPEG, PNG · Maksimal 10 MB per file (hingga 10 lampiran)
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  className="hidden"
                  id="sppd-file-upload"
                />
                <label
                  htmlFor="sppd-file-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#0072BC] dark:text-[#72C8F1] hover:border-[#0072BC] cursor-pointer shadow-xs transition-colors"
                >
                  <Upload size={14} />
                  Pilih File Dokumen
                </label>
              </div>
            </div>

            {fileError && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{fileError}</span>
              </div>
            )}

            {/* Uploaded + Staged Files List */}
            {(existingAttachments.length > 0 || pendingFiles.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {existingAttachments.map((att) => {
                  const isImg = att.type.startsWith('image/');
                  return (
                    <div
                      key={att.id}
                      className="p-3 rounded-xl bg-white dark:bg-[#0B172A] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isImg ? (
                          <StoredImage
                            src={att.url}
                            alt={att.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center shrink-0">
                            <FileText size={18} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#173B65] dark:text-slate-100 truncate">
                            {att.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatBytes(att.size)} · Tersimpan
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewDoc({ name: att.name, url: att.url, isImage: isImg })
                          }
                          title="Pratinjau Dokumen"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#0072BC] hover:bg-[#EAF6FC] dark:hover:bg-slate-800 transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingAttachment(att.id)}
                          title="Hapus Lampiran"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {pendingFiles.map((pf) => (
                  <div
                    key={pf.id}
                    className="p-3 rounded-xl bg-white dark:bg-[#0B172A] border border-[#72C8F1]/40 dark:border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {pf.isImage ? (
                        <img
                          src={pf.previewUrl}
                          alt={pf.file.name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center shrink-0">
                          <FileCheck2 size={18} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#173B65] dark:text-slate-100 truncate">
                          {pf.file.name}
                        </p>
                        <p className="text-[11px] text-[#0072BC] dark:text-[#72C8F1] font-medium">
                          {formatBytes(pf.file.size)} · Siap diunggah
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewDoc({
                            name: pf.file.name,
                            url: pf.previewUrl,
                            isImage: pf.isImage,
                          })
                        }
                        title="Pratinjau Dokumen"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#0072BC] hover:bg-[#EAF6FC] dark:hover:bg-slate-800 transition-colors"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePendingFile(pf.id)}
                        title="Hapus File"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {submitting && progressText && (
            <div className="p-3.5 rounded-xl bg-[#EAF6FC] dark:bg-[#0072BC]/20 border border-[#72C8F1]/40 text-[#173B65] dark:text-[#72C8F1] flex items-center gap-2.5 text-xs font-bold">
              <Loader2 size={16} className="animate-spin shrink-0" />
              <span>{progressText}</span>
            </div>
          )}

          {/* Footer Action Bar */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={initializeForm}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <RotateCcw size={14} />
                Reset
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EAF6FC] dark:bg-[#0072BC]/20 border border-[#72C8F1]/40 text-[#173B65] dark:text-[#72C8F1] text-xs font-bold hover:bg-[#72C8F1]/25 transition-colors disabled:opacity-50"
              >
                <Save size={14} />
                Simpan Draft
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="relative overflow-hidden inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0072BC] to-[#173B65] text-white text-xs font-bold hover:brightness-110 transition-all shadow-md disabled:opacity-50"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-[#F9D423]"
                />
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send size={14} className="text-[#F9D423]" />
                    Submit Pengajuan
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* File Preview Lightbox */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-[60] bg-[#071120]/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white dark:bg-[#0E1A2E] rounded-2xl border border-slate-200 dark:border-slate-700 max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <p className="text-xs font-extrabold text-[#173B65] dark:text-slate-100 truncate">
                Pratinjau: {previewDoc.name}
              </p>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-50 dark:bg-slate-950 flex items-center justify-center min-h-[360px]">
              {previewDoc.isImage ? (
                <StoredImage
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="max-w-full max-h-[72vh] object-contain rounded-lg shadow-sm"
                />
              ) : (
                <StoredFileFrame url={previewDoc.url} title={previewDoc.name} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Before Submit */}
      <ConfirmDialog
        open={confirmOpen}
        title="Konfirmasi Pengajuan SPPD"
        confirmLabel="Ya, Submit Pengajuan"
        cancelLabel="Tinjau Kembali"
        variant="info"
        loading={submitting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => executePersist('Menunggu Approval')}
        description={
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>Pastikan data pengajuan perjalanan dinas berikut sudah benar:</p>
            <div className="p-3 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 space-y-1 text-[11px]">
              <p>
                <span className="font-bold text-[#173B65] dark:text-white">Pegawai:</span>{' '}
                {namaPegawai} ({nip})
              </p>
              <p>
                <span className="font-bold text-[#173B65] dark:text-white">Unit / Bidang:</span>{' '}
                {unitKerja} · {bidang}
              </p>
              <p>
                <span className="font-bold text-[#173B65] dark:text-white">Judul:</span>{' '}
                {judulPerjalanan} ({jenisSppd})
              </p>
              <p>
                <span className="font-bold text-[#173B65] dark:text-white">Rute &amp; Tanggal:</span>{' '}
                {kotaKeberangkatan} → {kotaTujuan} ({tanggalKeberangkatan} s.d. {tanggalKembali})
              </p>
              <p>
                <span className="font-bold text-[#173B65] dark:text-white">PRK / COA:</span>{' '}
                {nomorPrk} / {nomorCoa}
              </p>
              <p>
                <span className="font-bold text-[#173B65] dark:text-white">Dokumen Pendukung:</span>{' '}
                {existingAttachments.length + pendingFiles.length} lampiran
              </p>
            </div>
          </div>
        }
      />
    </div>
  );
};

export default SppdFormModal;
