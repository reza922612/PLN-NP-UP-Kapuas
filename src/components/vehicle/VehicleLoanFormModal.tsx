import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  Search,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Employee, VehicleLoanRequest } from '../../types';
import { SPPD_BIDANG_OPTIONS } from '../../data/sppdConstants';
import {
  formatWhatsAppPhone,
  isValidIndonesianWhatsApp,
  SIMAP_WHATSAPP_NUMBER_LOCAL,
} from '../../data/whatsappConstants';
import {
  calculateTimeDurationLabel,
  SaveVehicleLoanInput,
} from '../../hooks/useVehicleManagement';
import { cn } from '../../lib/utils';

interface VehicleLoanFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (input: SaveVehicleLoanInput) => Promise<string>;
  employees: Employee[];
  defaultEmployee?: Employee | null;
  initialLoan?: VehicleLoanRequest | null;
}

const SearchableEmployeeSelector: React.FC<{
  label: string;
  required?: boolean;
  placeholder: string;
  employees: Employee[];
  selectedId: string | null;
  valueName: string;
  valueJabatan: string;
  onSelect: (emp: Employee) => void;
  onManualChange: (name: string) => void;
}> = ({
  label,
  required,
  placeholder,
  employees,
  valueName,
  valueJabatan,
  onSelect,
  onManualChange,
}) => {
  const [openDropdown, setOpenDropdown] = useState(false);

  const filtered = useMemo(() => {
    const q = valueName.trim().toLowerCase();
    if (!q) return employees.slice(0, 12);
    return employees
      .filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          (e.nip || '').toLowerCase().includes(q) ||
          (e.jabatanLengkap || '').toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [employees, valueName]);

  return (
    <div className="space-y-1.5 relative">
      <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0072BC] dark:text-[#72C8F1]"
        />
        <input
          type="text"
          value={valueName}
          onFocus={() => setOpenDropdown(true)}
          onBlur={() => setTimeout(() => setOpenDropdown(false), 180)}
          onChange={(e) => {
            onManualChange(e.target.value);
            setOpenDropdown(true);
          }}
          placeholder={placeholder}
          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
        />
      </div>
      {valueJabatan && (
        <p className="text-[11px] text-slate-400 truncate">Jabatan: {valueJabatan}</p>
      )}
      {openDropdown && filtered.length > 0 && (
        <div className="absolute z-40 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-2xl bg-white dark:bg-[#0B172A] border border-slate-200 dark:border-slate-700 shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((emp) => (
            <button
              key={emp.id || emp.nip}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(emp);
                setOpenDropdown(false);
              }}
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
              <span className="text-[10px] font-mono font-bold text-[#0072BC] dark:text-[#72C8F1] shrink-0">
                {emp.nip}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const VehicleLoanFormModal: React.FC<VehicleLoanFormModalProps> = ({
  open,
  onClose,
  onSave,
  employees,
  defaultEmployee = null,
  initialLoan = null,
}) => {
  const [nama, setNama] = useState('');
  const [jumlahPenumpang, setJumlahPenumpang] = useState<number>(2);
  const [tujuan, setTujuan] = useState('');
  const [tanggalDipergunakan, setTanggalDipergunakan] = useState('');
  const [bidang, setBidang] = useState<string>(SPPD_BIDANG_OPTIONS[0]);
  const [keperluan, setKeperluan] = useState('');
  const [jamMulai, setJamMulai] = useState('08:00');
  const [jamSelesai, setJamSelesai] = useState('16:00');

  const [pemohonId, setPemohonId] = useState<string | null>(null);
  const [pemohonNama, setPemohonNama] = useState('');
  const [pemohonNip, setPemohonNip] = useState('');
  const [pemohonJabatan, setPemohonJabatan] = useState('');
  const [nomorWhatsapp, setNomorWhatsapp] = useState('');

  const [atasanId, setAtasanId] = useState<string | null>(null);
  const [atasanNama, setAtasanNama] = useState('');
  const [atasanJabatan, setAtasanJabatan] = useState('');

  const [asmanId, setAsmanId] = useState<string | null>(null);
  const [asmanNama, setAsmanNama] = useState('');
  const [asmanJabatan, setAsmanJabatan] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultAsman = useMemo(() => {
    return (
      employees.find((e) => {
        const j = (e.jabatanLengkap || '').toLowerCase();
        return (
          (j.includes('assistant manager') || j.includes('asman')) &&
          j.includes('business support')
        );
      }) || null
    );
  }, [employees]);

  useEffect(() => {
    if (!open) return;
    setError(null);

    if (initialLoan) {
      setNama(initialLoan.nama || '');
      setJumlahPenumpang(initialLoan.jumlahPenumpang || 1);
      setTujuan(initialLoan.tujuan || '');
      setTanggalDipergunakan(initialLoan.tanggalDipergunakan || '');
      setBidang(initialLoan.bidang || SPPD_BIDANG_OPTIONS[0]);
      setKeperluan(initialLoan.keperluan || '');
      setJamMulai(initialLoan.jamMulai || '08:00');
      setJamSelesai(initialLoan.jamSelesai || '16:00');
      setPemohonId(initialLoan.pemohonEmployeeId || null);
      setPemohonNama(initialLoan.pemohonNama || '');
      setPemohonNip(initialLoan.pemohonNip || '');
      setPemohonJabatan(initialLoan.pemohonJabatan || '');
      setNomorWhatsapp(initialLoan.nomorWhatsapp || '');
      setAtasanId(initialLoan.atasanLangsungEmployeeId || null);
      setAtasanNama(initialLoan.atasanLangsungNama || '');
      setAtasanJabatan(initialLoan.atasanLangsungJabatan || '');
      setAsmanId(initialLoan.asmanBisnisSupportEmployeeId || null);
      setAsmanNama(initialLoan.asmanBisnisSupportNama || '');
      setAsmanJabatan(initialLoan.asmanBisnisSupportJabatan || '');
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    setTanggalDipergunakan(todayStr);
    setJumlahPenumpang(2);
    setTujuan('');
    setBidang(SPPD_BIDANG_OPTIONS[0]);
    setKeperluan('');
    setJamMulai('08:00');
    setJamSelesai('16:00');

    if (defaultEmployee) {
      setNama(defaultEmployee.fullName || '');
      setPemohonId(defaultEmployee.id || null);
      setPemohonNama(defaultEmployee.fullName || '');
      setPemohonNip(defaultEmployee.nip || '');
      setPemohonJabatan(defaultEmployee.jabatanLengkap || '');
      setNomorWhatsapp(
        defaultEmployee.noTelepon ? formatWhatsAppPhone(defaultEmployee.noTelepon) : ''
      );

      if (defaultEmployee.atasanId || defaultEmployee.atasanNama) {
        const sup = employees.find((e) => e.id === defaultEmployee.atasanId);
        setAtasanId(sup?.id || defaultEmployee.atasanId || null);
        setAtasanNama(sup?.fullName || defaultEmployee.atasanNama || '');
        setAtasanJabatan(sup?.jabatanLengkap || defaultEmployee.atasanJabatan || '');
      } else {
        setAtasanId(null);
        setAtasanNama('');
        setAtasanJabatan('');
      }
    } else {
      setNama('');
      setPemohonId(null);
      setPemohonNama('');
      setPemohonNip('');
      setPemohonJabatan('');
      setNomorWhatsapp('');
      setAtasanId(null);
      setAtasanNama('');
      setAtasanJabatan('');
    }

    if (defaultAsman) {
      setAsmanId(defaultAsman.id || null);
      setAsmanNama(defaultAsman.fullName);
      setAsmanJabatan(defaultAsman.jabatanLengkap || 'Assistant Manager Business Support');
    } else {
      setAsmanId(null);
      setAsmanNama('');
      setAsmanJabatan('Assistant Manager Business Support');
    }
  }, [open, initialLoan?.id, defaultEmployee?.id, defaultAsman?.id]);

  const durasiJamLabel = useMemo(
    () => calculateTimeDurationLabel(jamMulai, jamSelesai),
    [jamMulai, jamSelesai]
  );

  const handleSelectPemohon = (emp: Employee) => {
    setPemohonId(emp.id || null);
    setPemohonNama(emp.fullName);
    setPemohonNip(emp.nip || '');
    setPemohonJabatan(emp.jabatanLengkap || '');
    if (emp.noTelepon) {
      setNomorWhatsapp(formatWhatsAppPhone(emp.noTelepon));
    }
    if (!nama.trim()) {
      setNama(emp.fullName);
    }

    if (emp.atasanId || emp.atasanNama) {
      const sup = employees.find((e) => e.id === emp.atasanId);
      setAtasanId(sup?.id || emp.atasanId || null);
      setAtasanNama(sup?.fullName || emp.atasanNama || '');
      setAtasanJabatan(sup?.jabatanLengkap || emp.atasanJabatan || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nama.trim()) return setError('Kolom Nama wajib diisi.');
    if (!tujuan.trim()) return setError('Kolom Tujuan wajib diisi.');
    if (!tanggalDipergunakan) return setError('Tanggal Dipergunakan wajib diisi.');
    if (!bidang) return setError('Bidang wajib dipilih.');
    if (!keperluan.trim()) return setError('Kolom Keperluan wajib diisi.');
    if (!jamMulai || !jamSelesai) return setError('Jam Mulai dan Jam Selesai wajib diisi.');
    if (!pemohonNama.trim()) return setError('Pemohon (data pegawai) wajib diisi.');
    if (!atasanNama.trim()) return setError('Atasan Langsung wajib diisi.');
    if (!asmanNama.trim()) {
      return setError('Menyetujui Assistant Manager Business Support wajib diisi.');
    }
    if (nomorWhatsapp.trim() && !isValidIndonesianWhatsApp(nomorWhatsapp)) {
      return setError('Format Nomor WhatsApp tidak valid. Gunakan format 08xx atau +628xx.');
    }

    setSubmitting(true);
    try {
      await onSave({
        existingId: initialLoan?.id,
        existingLoanNumber: initialLoan?.loanNumber,
        existingStatus: initialLoan?.status,
        nama,
        jumlahPenumpang,
        tujuan,
        tanggalDipergunakan,
        bidang,
        keperluan,
        jamMulai,
        jamSelesai,
        pemohonEmployeeId: pemohonId,
        pemohonNama,
        pemohonNip,
        pemohonJabatan,
        nomorWhatsapp: nomorWhatsapp.trim() ? formatWhatsAppPhone(nomorWhatsapp) : null,
        atasanLangsungEmployeeId: atasanId,
        atasanLangsungNama: atasanNama,
        atasanLangsungJabatan: atasanJabatan,
        asmanBisnisSupportEmployeeId: asmanId,
        asmanBisnisSupportNama: asmanNama,
        asmanBisnisSupportJabatan: asmanJabatan,
      });
      onClose();
    } catch (err: any) {
      const rawMsg = err?.message || 'Gagal mengirim pengajuan peminjaman kendaraan.';
      try {
        const parsed = JSON.parse(rawMsg);
        if (parsed && typeof parsed === 'object' && parsed.error) {
          const emailInfo = parsed.authInfo?.email ? ` (Akun: ${parsed.authInfo.email})` : '';
          const pathInfo = parsed.path ? ` [Path: ${parsed.operationType || 'write'} ${parsed.path}]` : '';
          if (String(parsed.error).toLowerCase().includes('permission')) {
            setError(
              `Akses penyimpanan pengajuan kendaraan ditolak oleh aturan keamanan Firestore${emailInfo}${pathInfo}. Pastikan akun Anda terdaftar aktif lalu muat ulang halaman.`
            );
          } else {
            setError(`${parsed.error}${emailInfo}${pathInfo}`);
          }
          return;
        }
      } catch {
        // Fallback to raw message
      }
      setError(rawMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#071120]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vehicle-loan-modal-title"
    >
      <div className="bg-white dark:bg-[#0E1A2E] w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#173B65] via-[#0072BC] to-[#009CE0] px-6 py-5 text-white relative shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                <Car size={21} className="text-[#F9D423]" />
              </div>
              <div>
                <h2 id="vehicle-loan-modal-title" className="text-lg font-extrabold tracking-tight">
                  {initialLoan
                    ? `Edit Pengajuan Kendaraan (${initialLoan.loanNumber})`
                    : 'Pengajuan Peminjaman Kendaraan Dinas'}
                </h2>
                <p className="text-xs text-blue-100/90 mt-0.5">
                  Formulir peminjaman kendaraan operasional PT PLN Nusantara Power UP Kapuas
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Tutup Modal Peminjaman Kendaraan"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-[#F9D423]" />
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 flex items-start gap-2.5 text-xs font-semibold">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span className="min-w-0 break-words">{error}</span>
            </div>
          )}

          {/* Row 1: Nama & Jumlah Penumpang */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                Nama <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nama}
                maxLength={256}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama pengguna / penanggung jawab kendaraan"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                Jumlah Penumpang <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Users
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0072BC] dark:text-[#72C8F1]"
                />
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={jumlahPenumpang}
                  onChange={(e) => setJumlahPenumpang(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Tujuan, Tanggal Dipergunakan, Bidang */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                Tujuan <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0072BC] dark:text-[#72C8F1]"
                />
                <input
                  type="text"
                  value={tujuan}
                  maxLength={300}
                  onChange={(e) => setTujuan(e.target.value)}
                  placeholder="Contoh: ULPLTD Sei Raya / Kantor PLN UID Kalbar"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                Tanggal Dipergunakan <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0072BC] dark:text-[#72C8F1]"
                />
                <input
                  type="date"
                  value={tanggalDipergunakan}
                  onChange={(e) => setTanggalDipergunakan(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                Bidang (Sesuai Pengajuan SPPD) <span className="text-red-500">*</span>
              </label>
              <select
                value={bidang}
                onChange={(e) => setBidang(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
              >
                {SPPD_BIDANG_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                Nomor WhatsApp Peminjam{' '}
                <span className="text-[10px] font-semibold text-[#0072BC] dark:text-[#72C8F1]">
                  (WA SIMAP {SIMAP_WHATSAPP_NUMBER_LOCAL})
                </span>
              </label>
              <div className="relative">
                <MessageSquare
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400"
                />
                <input
                  type="tel"
                  value={nomorWhatsapp}
                  maxLength={32}
                  onChange={(e) => setNomorWhatsapp(e.target.value)}
                  placeholder="Contoh: 0812xxxx atau +62812xxxx"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold font-mono text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
              Keperluan <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FileText
                size={14}
                className="absolute left-3.5 top-3 text-[#0072BC] dark:text-[#72C8F1]"
              />
              <textarea
                rows={2}
                value={keperluan}
                maxLength={500}
                onChange={(e) => setKeperluan(e.target.value)}
                placeholder="Jelaskan keperluan perjalanan / dinas..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
              />
            </div>
          </div>

          {/* Jam Mulai, Jam Selesai, Hitung Durasi */}
          <div className="p-4 rounded-2xl bg-[#F8FBFD] dark:bg-[#0B172A] border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                Jam Mulai <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={jamMulai}
                onChange={(e) => setJamMulai(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#173B65] dark:text-slate-200">
                Jam Selesai <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={jamSelesai}
                onChange={(e) => setJamSelesai(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-[#EAF6FC] dark:bg-[#0072BC]/20 border border-[#72C8F1]/40 flex items-center gap-2.5">
              <Clock size={16} className="text-[#0072BC] dark:text-[#72C8F1] shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-[#0072BC] dark:text-[#72C8F1]">
                  Durasi Peminjaman
                </p>
                <p className="text-xs font-extrabold text-[#173B65] dark:text-white truncate tabular-nums">
                  {durasiJamLabel}
                </p>
              </div>
            </div>
          </div>

          {/* Employee Pickers: Pemohon, Atasan Langsung, Menyetujui Assistant Manager Business Support */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#173B65] dark:text-slate-100">
              <UserCheck size={15} className="text-[#0072BC]" />
              Pemohon &amp; Persetujuan Pejabat (Sinkron Data Pegawai)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SearchableEmployeeSelector
                label="Pemohon"
                required
                placeholder="Cari nama/NIP pemohon..."
                employees={employees}
                selectedId={pemohonId}
                valueName={pemohonNama}
                valueJabatan={pemohonJabatan}
                onSelect={handleSelectPemohon}
                onManualChange={(val) => {
                  setPemohonId(null);
                  setPemohonNama(val);
                }}
              />

              <SearchableEmployeeSelector
                label="Atasan Langsung"
                required
                placeholder="Cari atasan langsung..."
                employees={employees}
                selectedId={atasanId}
                valueName={atasanNama}
                valueJabatan={atasanJabatan}
                onSelect={(emp) => {
                  setAtasanId(emp.id || null);
                  setAtasanNama(emp.fullName);
                  setAtasanJabatan(emp.jabatanLengkap || '');
                }}
                onManualChange={(val) => {
                  setAtasanId(null);
                  setAtasanNama(val);
                }}
              />

              <SearchableEmployeeSelector
                label="Menyetujui Assistant Manager Business Support"
                required
                placeholder="Cari Asman Business Support..."
                employees={employees}
                selectedId={asmanId}
                valueName={asmanNama}
                valueJabatan={asmanJabatan}
                onSelect={(emp) => {
                  setAsmanId(emp.id || null);
                  setAsmanNama(emp.fullName);
                  setAsmanJabatan(emp.jabatanLengkap || '');
                }}
                onManualChange={(val) => {
                  setAsmanId(null);
                  setAsmanNama(val);
                }}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0072BC] to-[#173B65] text-white text-xs font-bold hover:brightness-110 transition-all shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} className="text-[#F9D423]" />
                  {initialLoan ? 'Simpan Perubahan' : 'Ajukan Peminjaman'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VehicleLoanFormModal;
