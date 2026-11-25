import React, { useEffect, useMemo, useState } from 'react';
import {
  FileCheck2,
  X,
  Search,
  UserCheck,
  Building2,
  Calendar,
  Phone,
  Hash,
  AlertCircle,
  CheckCircle2,
  Send,
  Loader2,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import {
  Employee,
  LetterClassificationCode,
  LetterCode,
  LetterUnitCode,
} from '../../types';
import { SPPD_BIDANG_OPTIONS } from '../../data/sppdConstants';
import {
  buildWhatsAppPreviewMessage,
  formatNomorSurat,
  formatWhatsAppPhone,
  getDynamicYearOptions,
  getLetterCodeMeta,
  isValidIndonesianWhatsApp,
  isValidLetterCombination,
  LETTER_CLASSIFICATION_OPTIONS,
  LETTER_CODE_OPTIONS,
  LETTER_UNIT_LABELS,
  LETTER_UNIT_OPTIONS,
  mapUnitPelaksanaToLetterUnit,
} from '../../data/letterConstants';
import { SIMAP_WHATSAPP_NUMBER_LOCAL } from '../../data/whatsappConstants';
import { SubmitLetterNumberInput, WhatsAppDispatchResult } from '../../hooks/useLetterNumbers';
import { LetterNumberRequest } from '../../types';
import { cn } from '../../lib/utils';

interface LetterNumberFormModalProps {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  defaultEmployee?: Employee | null;
  getNextSequencePreview: (unitKode: LetterUnitCode, tahun: number) => number;
  onSubmit: (
    input: SubmitLetterNumberInput
  ) => Promise<{ request: LetterNumberRequest; whatsappResult: WhatsAppDispatchResult }>;
  onIssuedSuccess?: (
    request: LetterNumberRequest,
    whatsappResult: WhatsAppDispatchResult
  ) => void;
}

const getTodayDateString = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const LetterNumberFormModal: React.FC<LetterNumberFormModalProps> = ({
  open,
  onClose,
  employees,
  defaultEmployee = null,
  getNextSequencePreview,
  onSubmit,
  onIssuedSuccess,
}) => {
  const yearOptions = useMemo(() => getDynamicYearOptions(), []);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [namaSearch, setNamaSearch] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [namaPengaju, setNamaPengaju] = useState<string>('');
  const [nip, setNip] = useState<string>('');
  const [bidang, setBidang] = useState<string>(SPPD_BIDANG_OPTIONS[12]); // Bidang Business Support
  const [tanggalPengajuan, setTanggalPengajuan] = useState<string>(getTodayDateString());
  const [nomorWhatsapp, setNomorWhatsapp] = useState<string>('+62');

  const [kodeSurat, setKodeSurat] = useState<LetterCode>('SKT');
  const [kodeKlasifikasi, setKodeKlasifikasi] = useState<LetterClassificationCode>('SDM.15.01');
  const [unitKode, setUnitKode] = useState<LetterUnitCode>('UPKS');
  const [tahun, setTahun] = useState<number>(new Date().getFullYear());
  const [perihal, setPerihal] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrorMsg(null);
    setSubmitting(false);
    setDropdownOpen(false);
    setTanggalPengajuan(getTodayDateString());
    setTahun(
      yearOptions.includes(new Date().getFullYear())
        ? new Date().getFullYear()
        : yearOptions[yearOptions.length - 1]
    );

    if (defaultEmployee) {
      setSelectedEmployeeId(defaultEmployee.id || '');
      setNamaPengaju(defaultEmployee.fullName || '');
      setNamaSearch(defaultEmployee.fullName || '');
      setNip(defaultEmployee.nip || '');
      setUnitKode(mapUnitPelaksanaToLetterUnit(defaultEmployee.unitPelaksana));
      setNomorWhatsapp(
        defaultEmployee.noTelepon
          ? formatWhatsAppPhone(defaultEmployee.noTelepon)
          : '+62'
      );
    } else {
      setSelectedEmployeeId('');
      setNamaPengaju('');
      setNamaSearch('');
      setNip('');
      setNomorWhatsapp('+62');
      setUnitKode('UPKS');
    }

    setKodeSurat('SKT');
    setKodeKlasifikasi('SDM.15.01');
    setPerihal('');
  }, [open, defaultEmployee, yearOptions]);

  const filteredEmployees = useMemo(() => {
    const q = namaSearch.trim().toLowerCase();
    const list = employees.slice().sort((a, b) => a.fullName.localeCompare(b.fullName));
    if (!q) return list.slice(0, 12);
    return list
      .filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.nip.toLowerCase().includes(q) ||
          (e.jabatanLengkap || '').toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [employees, namaSearch]);

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployeeId(emp.id || '');
    setNamaPengaju(emp.fullName);
    setNamaSearch(emp.fullName);
    setNip(emp.nip || '');
    setUnitKode(mapUnitPelaksanaToLetterUnit(emp.unitPelaksana));
    if (emp.noTelepon && isValidIndonesianWhatsApp(emp.noTelepon)) {
      setNomorWhatsapp(formatWhatsAppPhone(emp.noTelepon));
    }
    setDropdownOpen(false);
    setErrorMsg(null);
  };

  const handleKodeSuratChange = (nextCode: LetterCode) => {
    setKodeSurat(nextCode);
    const meta = getLetterCodeMeta(nextCode);
    if (!meta.allowedClassifications.includes(kodeKlasifikasi)) {
      setKodeKlasifikasi(meta.recommendedClassification);
    }
    setErrorMsg(null);
  };

  const comboCheck = useMemo(
    () => isValidLetterCombination(kodeSurat, kodeKlasifikasi),
    [kodeSurat, kodeKlasifikasi]
  );

  const normalizedWa = useMemo(() => formatWhatsAppPhone(nomorWhatsapp), [nomorWhatsapp]);
  const waValid = useMemo(() => isValidIndonesianWhatsApp(nomorWhatsapp), [nomorWhatsapp]);

  const estimatedSeq = useMemo(
    () => getNextSequencePreview(unitKode, tahun),
    [getNextSequencePreview, unitKode, tahun]
  );

  const previewNomorSurat = useMemo(
    () => formatNomorSurat(estimatedSeq, kodeSurat, kodeKlasifikasi, unitKode, tahun),
    [estimatedSeq, kodeSurat, kodeKlasifikasi, unitKode, tahun]
  );

  const waPreviewText = useMemo(
    () =>
      buildWhatsAppPreviewMessage({
        namaPengaju: namaPengaju || '[Nama Pegawai]',
        nomorSurat: previewNomorSurat,
        nip: nip || '[NIP]',
        bidang,
        tanggalPengajuan: tanggalPengajuan || getTodayDateString(),
        unitLabel: LETTER_UNIT_LABELS[unitKode],
      }),
    [namaPengaju, previewNomorSurat, nip, bidang, tanggalPengajuan, unitKode]
  );

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!namaPengaju.trim() || !nip.trim()) {
      setErrorMsg('Silakan pilih Nama Pegawai dari daftar Database Pegawai sehingga NIP terisi otomatis.');
      return;
    }

    if (!waValid) {
      setErrorMsg('Nomor WhatsApp aktif wajib menggunakan format Indonesia yang valid (+628xxxxxxxxxx).');
      return;
    }

    if (!comboCheck.valid) {
      setErrorMsg(comboCheck.reason || 'Kombinasi Kode Surat dan Kode Klasifikasi tidak sesuai ketentuan.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmit({
        applicantEmployeeId: selectedEmployeeId || null,
        namaPengaju: namaPengaju.trim(),
        nip: nip.trim(),
        bidang,
        tanggalPengajuan,
        nomorWhatsapp: normalizedWa,
        kodeSurat,
        kodeKlasifikasi,
        unitKode,
        tahun,
        perihal: perihal.trim(),
      });
      onIssuedSuccess?.(result.request, result.whatsappResult);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan saat menerbitkan nomor surat.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#071120]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white dark:bg-[#0E1A2E] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto"
      >
        {/* Corporate Modal Header */}
        <div className="pln-gradient px-6 py-5 text-white flex items-center justify-between gap-4 relative">
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-[#F9D423]" />
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <FileCheck2 size={22} className="text-[#F9D423]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight truncate">
                Pengajuan Nomor Surat &amp; Berita Acara
              </h2>
              <p className="text-xs text-[#72C8F1] font-medium truncate">
                Penomoran Otomatis Berurutan &amp; Notifikasi WhatsApp · PT PLN Nusantara Power UP Kapuas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
            aria-label="Tutup Form"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[82vh] overflow-y-auto space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs font-bold flex items-start gap-3">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Live Nomor Preview Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-[#EAF6FC] via-white to-[#FFFDF4] dark:from-[#0B172A] dark:via-[#11223B] dark:to-[#0B172A] border border-[#72C8F1]/50 dark:border-[#0072BC]/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#0072BC] dark:text-[#72C8F1]">
                <Sparkles size={12} className="text-[#F9D423]" />
                Pratinjau Nomor Surat Otomatis (Unit {unitKode} · Tahun {tahun})
              </span>
              <p className="text-lg sm:text-xl font-black font-mono tracking-tight text-[#173B65] dark:text-white break-all">
                {previewNomorSurat}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Nomor akhir dikunci secara atomik saat tombol SUBMIT ditekan untuk mencegah duplikasi antar pengaju.
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-start sm:items-end gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Urutan Berikutnya
              </span>
              <span className="px-3.5 py-1.5 rounded-xl bg-[#0072BC] text-white font-mono text-sm font-black shadow-xs">
                #{String(estimatedSeq).padStart(3, '0')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section A: Data Pengaju */}
            <div className="rounded-2xl bg-[#F8FBFD] dark:bg-[#0B172A]/80 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/70 dark:border-slate-800">
                <UserCheck size={16} className="text-[#0072BC] dark:text-[#72C8F1]" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#173B65] dark:text-slate-100">
                  A. Data Pengaju
                </h3>
              </div>

              {/* 1. Nama (Autocomplete from Database Pegawai) */}
              <div className="relative space-y-1.5">
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  1. Nama Pegawai <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0072BC] dark:text-[#72C8F1]"
                  />
                  <input
                    type="text"
                    value={namaSearch}
                    onFocus={() => {
                      if (!defaultEmployee) setDropdownOpen(true);
                    }}
                    onChange={(e) => {
                      if (defaultEmployee) return;
                      setNamaSearch(e.target.value);
                      setNamaPengaju('');
                      setNip('');
                      setSelectedEmployeeId('');
                      setDropdownOpen(true);
                    }}
                    readOnly={!!defaultEmployee}
                    placeholder="Ketik nama atau NIP pegawai dari database SIMAP..."
                    className={cn(
                      'w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all',
                      defaultEmployee
                        ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-not-allowed'
                        : 'bg-white dark:bg-[#0E1A2E] border-slate-200 dark:border-slate-700 text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC]'
                    )}
                  />
                </div>

                {dropdownOpen && !defaultEmployee && (
                  <div className="absolute z-30 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredEmployees.length > 0 ? (
                      filteredEmployees.map((emp) => (
                        <button
                          key={emp.id || emp.nip}
                          type="button"
                          onClick={() => handleSelectEmployee(emp)}
                          className="w-full px-3.5 py-2.5 text-left hover:bg-[#EAF6FC] dark:hover:bg-[#0072BC]/20 transition-colors flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#173B65] dark:text-slate-100 truncate">
                              {emp.fullName}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {emp.jabatanLengkap || 'Pegawai'} · {emp.unitPelaksana || 'UP Kapuas'}
                            </p>
                          </div>
                          <span className="shrink-0 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#EAF6FC] dark:bg-slate-800 text-[#0072BC] dark:text-[#72C8F1]">
                            {emp.nip}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400">
                        Pegawai tidak ditemukan di database SIMAP.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. NIP Auto-filled */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  2. NIP (Terisi Otomatis) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    readOnly
                    value={nip}
                    placeholder="Otomatis terisi setelah memilih Nama Pegawai"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-[#173B65] dark:text-slate-200 outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              {/* 3. Bidang (sama persis dengan Pengajuan SPPD) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  3. Bidang <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0072BC] dark:text-[#72C8F1]"
                  />
                  <select
                    value={bidang}
                    onChange={(e) => setBidang(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none"
                  >
                    {SPPD_BIDANG_OPTIONS.map((b) => (
                      <option key={b} value={b} className="dark:bg-slate-900">
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4. Tanggal Pengajuan */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  4. Tanggal Pengajuan <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0072BC] dark:text-[#72C8F1]"
                  />
                  <input
                    type="date"
                    required
                    value={tanggalPengajuan}
                    onChange={(e) => setTanggalPengajuan(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none"
                  />
                </div>
              </div>

              {/* 5. Nomor WhatsApp (+62) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  5. Nomor WhatsApp Aktif (+62) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400"
                  />
                  <input
                    type="tel"
                    required
                    value={nomorWhatsapp}
                    onChange={(e) => setNomorWhatsapp(e.target.value)}
                    onBlur={() => {
                      if (nomorWhatsapp.trim()) {
                        setNomorWhatsapp(formatWhatsAppPhone(nomorWhatsapp));
                      }
                    }}
                    placeholder="+6281234567890"
                    className={cn(
                      'w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0E1A2E] border text-xs font-mono font-bold text-[#173B65] dark:text-slate-100 focus:ring-2 outline-none',
                      nomorWhatsapp.length > 3 && !waValid
                        ? 'border-red-400 focus:ring-red-400'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-[#0072BC]'
                    )}
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Format +62. Detail nomor surat dikirim dari WhatsApp SIMAP ({SIMAP_WHATSAPP_NUMBER_LOCAL}) setelah submit.
                </p>
              </div>
            </div>

            {/* Section B: Data Penomoran */}
            <div className="rounded-2xl bg-[#F8FBFD] dark:bg-[#0B172A]/80 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/70 dark:border-slate-800">
                <FileCheck2 size={16} className="text-[#0072BC] dark:text-[#72C8F1]" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#173B65] dark:text-slate-100">
                  B. Data Penomoran Surat &amp; Berita Acara
                </h3>
              </div>

              {/* 6. Nomor Surat (Otomatis) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  6. Nomor Urut Sistem (Otomatis)
                </label>
                <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-black text-[#0072BC] dark:text-[#72C8F1]">
                    {previewNomorSurat}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                    Auto-Increment
                  </span>
                </div>
              </div>

              {/* 7. Kode Surat */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  7. Kode Surat <span className="text-red-500">*</span>
                </label>
                <select
                  value={kodeSurat}
                  onChange={(e) => handleKodeSuratChange(e.target.value as LetterCode)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none"
                >
                  {LETTER_CODE_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code} className="dark:bg-slate-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {getLetterCodeMeta(kodeSurat).description}
                </p>
              </div>

              {/* 8. Kode Klasifikasi */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  8. Kode Klasifikasi <span className="text-red-500">*</span>
                </label>
                <select
                  value={kodeKlasifikasi}
                  onChange={(e) => setKodeKlasifikasi(e.target.value as LetterClassificationCode)}
                  className={cn(
                    'w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E1A2E] border text-xs font-semibold text-[#173B65] dark:text-slate-100 focus:ring-2 outline-none',
                    comboCheck.valid
                      ? 'border-slate-200 dark:border-slate-700 focus:ring-[#0072BC]'
                      : 'border-red-400 focus:ring-red-400'
                  )}
                >
                  {LETTER_CLASSIFICATION_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code} className="dark:bg-slate-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
                {comboCheck.valid ? (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Kombinasi {kodeSurat} / {kodeKlasifikasi} sesuai ketentuan tata naskah dinas.
                  </p>
                ) : (
                  <p className="text-[10px] text-red-600 dark:text-red-400 font-bold flex items-start gap-1">
                    <AlertCircle size={12} className="shrink-0 mt-0.5" />
                    <span>{comboCheck.reason}</span>
                  </p>
                )}
              </div>

              {/* 9. Unit & 10. Tahun */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                    9. Unit <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={unitKode}
                    onChange={(e) => setUnitKode(e.target.value as LetterUnitCode)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none"
                  >
                    {LETTER_UNIT_OPTIONS.map((u) => (
                      <option key={u.code} value={u.code} className="dark:bg-slate-900">
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                    10. Tahun <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={tahun}
                    onChange={(e) => setTahun(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y} className="dark:bg-slate-900">
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional Perihal */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                  Perihal / Keterangan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  maxLength={300}
                  value={perihal}
                  onChange={(e) => setPerihal(e.target.value)}
                  placeholder="Contoh: Pembayaran Jasa Operasi & Pemeliharaan Bulan November..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-xs font-medium text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none"
                />
              </div>
            </div>
          </div>

          {/* WhatsApp Message Preview */}
          <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                <MessageSquare size={14} />
                Pratinjau Pesan WhatsApp SIMAP ({SIMAP_WHATSAPP_NUMBER_LOCAL})
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300">
                Tujuan: {waValid ? normalizedWa : '+62...'}
              </span>
            </div>
            <pre className="text-[11px] leading-relaxed font-sans text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-white/80 dark:bg-[#0B172A]/80 rounded-xl p-3.5 border border-emerald-100 dark:border-emerald-900/40 max-h-40 overflow-y-auto">
              {waPreviewText}
            </pre>
          </div>

          {/* Modal Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Nomor yang telah diterbitkan tersimpan permanen dan tidak digunakan ulang meski dibatalkan.
            </p>
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting || !comboCheck.valid}
                className="relative overflow-hidden inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0072BC] to-[#173B65] text-white text-xs font-extrabold hover:brightness-110 transition-all shadow-md disabled:opacity-50"
              >
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-[#F9D423]" />
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin text-[#F9D423]" />
                    Memproses &amp; Mengirim WA...
                  </>
                ) : (
                  <>
                    <Send size={15} className="text-[#F9D423]" />
                    SUBMIT &amp; Terbitkan Nomor
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

export default LetterNumberFormModal;
