import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  ArrowLeftRight,
  UserCheck,
  Building2,
  Briefcase,
  FileText,
  Upload,
  AlertCircle,
  Loader2,
  Search,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  Employee,
  EmployeeStatus,
  ExternalMutationDirection,
  MutationCategory,
  MutationType,
} from '../../types';
import {
  EXTERNAL_ENTITY_SUGGESTIONS,
  EXTERNAL_MUTATION_SUBTYPES,
  INTERNAL_MUTATION_SUBTYPES,
  MUTATION_CATEGORY_OPTIONS,
  MUTATION_UNIT_KERJA_OPTIONS,
  getBidangOptionsByUnit,
  resolveCurrentBidang,
} from '../../data/mutationConstants';
import { mapUnitPelaksanaToSppdUnit } from '../../data/sppdConstants';
import { SubmitMutationInput } from '../../hooks/useMutations';
import { cn } from '../../lib/utils';

interface MutationFormModalProps {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  defaultEmployee?: Employee | null;
  onSubmit: (input: SubmitMutationInput) => Promise<string>;
  onSuccess?: (message: string) => void;
}

const MAX_FILE_BYTES = 50 * 1024 * 1024;

const MutationFormModal: React.FC<MutationFormModalProps> = ({
  open,
  onClose,
  employees,
  defaultEmployee = null,
  onSubmit,
  onSuccess,
}) => {
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [jenisMutasi, setJenisMutasi] = useState<MutationType>('Internal');
  const [arahMutasi, setArahMutasi] = useState<ExternalMutationDirection>('Masuk');
  const [subJenisMutasi, setSubJenisMutasi] = useState<string>(INTERNAL_MUTATION_SUBTYPES[0]);
  const [kategoriMutasi, setKategoriMutasi] = useState<MutationCategory>('Mutasi Unit');
  const [jabatanBaru, setJabatanBaru] = useState('');
  const [unitKerjaBaru, setUnitKerjaBaru] = useState<string>('UP Kapuas');
  const [bidangBaru, setBidangBaru] = useState<string>('Manager UP');
  const [statusBaru, setStatusBaru] = useState<EmployeeStatus>('Pegawai Organik');
  const [entitasEksternal, setEntitasEksternal] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [nomorSk, setNomorSk] = useState('');
  const [tanggalSk, setTanggalSk] = useState('');
  const [alasanMutasi, setAlasanMutasi] = useState('');
  const [dokumenFile, setDokumenFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const todayIso = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  }, []);

  const filteredEmployees = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    return [...employees]
      .filter((e) => {
        if (!q) return true;
        return (
          e.fullName.toLowerCase().includes(q) ||
          e.nip.toLowerCase().includes(q) ||
          (e.jabatanLengkap || '').toLowerCase().includes(q) ||
          (e.unitPelaksana || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [employees, empSearch]);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedEmpId) || null,
    [employees, selectedEmpId]
  );

  const currentBidang = useMemo(() => {
    if (!selectedEmployee) return '-';
    return resolveCurrentBidang(
      selectedEmployee.bidang,
      selectedEmployee.subUnit,
      selectedEmployee.unitPelaksana
    );
  }, [selectedEmployee]);

  const currentUnitMapped = useMemo(() => {
    if (!selectedEmployee) return 'UP Kapuas';
    return mapUnitPelaksanaToSppdUnit(selectedEmployee.unitPelaksana);
  }, [selectedEmployee]);

  // Reset form when opening
  useEffect(() => {
    if (!open) return;
    setErrorMsg(null);
    setEmpSearch('');
    setDokumenFile(null);
    setEffectiveDate(todayIso);
    setTanggalSk(todayIso);
    setNomorSk('');
    setAlasanMutasi('');
    setEntitasEksternal('');
    setJenisMutasi('Internal');
    setArahMutasi('Masuk');
    setSubJenisMutasi(INTERNAL_MUTATION_SUBTYPES[0]);
    setKategoriMutasi('Mutasi Unit');

    const initialEmp = defaultEmployee || employees[0] || null;
    if (initialEmp?.id) {
      setSelectedEmpId(initialEmp.id);
      setJabatanBaru(initialEmp.jabatanLengkap || '');
      const mappedUnit = mapUnitPelaksanaToSppdUnit(initialEmp.unitPelaksana);
      setUnitKerjaBaru(mappedUnit);
      const validBidangs = getBidangOptionsByUnit(mappedUnit);
      const curBid = resolveCurrentBidang(
        initialEmp.bidang,
        initialEmp.subUnit,
        initialEmp.unitPelaksana
      );
      setBidangBaru(validBidangs.includes(curBid) ? curBid : validBidangs[0]);
      setStatusBaru(initialEmp.status || 'Pegawai Organik');
    } else {
      setSelectedEmpId('');
    }
  }, [open, defaultEmployee, employees, todayIso]);

  // Sync current employee fields whenever selected employee changes
  useEffect(() => {
    if (!selectedEmployee) return;
    setJabatanBaru(selectedEmployee.jabatanLengkap || '');
    const mappedUnit = mapUnitPelaksanaToSppdUnit(selectedEmployee.unitPelaksana);
    setUnitKerjaBaru(mappedUnit);
    const validBidangs = getBidangOptionsByUnit(mappedUnit);
    const curBid = resolveCurrentBidang(
      selectedEmployee.bidang,
      selectedEmployee.subUnit,
      selectedEmployee.unitPelaksana
    );
    setBidangBaru(validBidangs.includes(curBid) ? curBid : validBidangs[0]);
    setStatusBaru(selectedEmployee.status || 'Pegawai Organik');
  }, [selectedEmployee]);

  // Keep subJenisMutasi synchronized with jenisMutasi / arahMutasi
  useEffect(() => {
    if (jenisMutasi === 'Internal') {
      if (!(INTERNAL_MUTATION_SUBTYPES as readonly string[]).includes(subJenisMutasi)) {
        setSubJenisMutasi(INTERNAL_MUTATION_SUBTYPES[0]);
      }
    } else {
      const list = EXTERNAL_MUTATION_SUBTYPES[arahMutasi];
      if (!list.includes(subJenisMutasi)) {
        setSubJenisMutasi(list[0]);
      }
    }
  }, [jenisMutasi, arahMutasi, subJenisMutasi]);

  // Dynamically adapt bidang options based on unitKerjaBaru
  const availableBidangOptions = useMemo(
    () => getBidangOptionsByUnit(unitKerjaBaru),
    [unitKerjaBaru]
  );

  useEffect(() => {
    if (!availableBidangOptions.includes(bidangBaru)) {
      setBidangBaru(availableBidangOptions[0] || '');
    }
  }, [availableBidangOptions, bidangBaru]);

  // Lock/sync fields automatically when kategoriMutasi changes
  const isUnitLocked =
    jenisMutasi === 'Internal' && kategoriMutasi === 'Mutasi Jabatan';
  const isJabatanLocked =
    jenisMutasi === 'Internal' && kategoriMutasi === 'Mutasi Unit';

  useEffect(() => {
    if (!selectedEmployee) return;
    if (isUnitLocked) {
      setUnitKerjaBaru(currentUnitMapped);
    }
    if (isJabatanLocked) {
      setJabatanBaru(selectedEmployee.jabatanLengkap || '');
    }
  }, [isUnitLocked, isJabatanLocked, selectedEmployee, currentUnitMapped]);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > MAX_FILE_BYTES) {
      setErrorMsg('Ukuran dokumen SK Mutasi maksimal 50 MB.');
      return;
    }
    setErrorMsg(null);
    setDokumenFile(file);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedEmployee) {
      setErrorMsg('Silakan pilih pegawai terlebih dahulu.');
      return;
    }
    if (!jabatanBaru.trim()) {
      setErrorMsg('Jabatan Baru wajib diisi.');
      return;
    }
    if (!bidangBaru.trim() || !unitKerjaBaru.trim()) {
      setErrorMsg('Unit Kerja Baru dan Bidang Baru wajib dipilih.');
      return;
    }
    if (jenisMutasi === 'Eksternal' && !entitasEksternal.trim()) {
      setErrorMsg('Perusahaan / Entitas Asal atau Tujuan wajib diisi untuk mutasi eksternal.');
      return;
    }
    if (!effectiveDate || !nomorSk.trim() || !tanggalSk) {
      setErrorMsg('Tanggal Efektif, Nomor SK Mutasi, dan Tanggal SK wajib dilengkapi.');
      return;
    }
    if (!alasanMutasi.trim()) {
      setErrorMsg('Alasan / keterangan mutasi wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        employee: selectedEmployee,
        jenisMutasi,
        arahMutasi: jenisMutasi === 'Eksternal' ? arahMutasi : null,
        subJenisMutasi,
        kategoriMutasi,
        jabatanBaru: jabatanBaru.trim(),
        bidangBaru: bidangBaru.trim(),
        unitKerjaBaru: unitKerjaBaru.trim(),
        statusKepegawaianBaru: statusBaru,
        entitasEksternal: jenisMutasi === 'Eksternal' ? entitasEksternal.trim() : null,
        effectiveDate,
        nomorSk: nomorSk.trim(),
        tanggalSk,
        alasanMutasi: alasanMutasi.trim(),
        dokumenFile,
      });

      onSuccess?.(
        `Pengajuan mutasi ${selectedEmployee.fullName} (SK ${nomorSk.trim()}) berhasil disimpan dan menunggu persetujuan pejabat berwenang.`
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan pengajuan mutasi. Periksa data dan ulangi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#071120]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={() => !submitting && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white dark:bg-[#0E1A2E] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="pln-gradient px-6 py-4 text-white flex items-center justify-between gap-4 shrink-0 border-b-2 border-[#F9D423]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <ArrowLeftRight size={19} className="text-[#F9D423]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold tracking-tight truncate">
                Form Pengajuan Mutasi Unit &amp; Jabatan
              </h3>
              <p className="text-[11px] text-white/80 truncate">
                SIMAP Employee Movement Management · PT PLN Nusantara Power UP Kapuas
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Tutup Form"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs font-bold flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SECTION A: DATA PEGAWAI */}
          <div className="space-y-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-[#F8FBFD] dark:bg-[#0B172A]/70 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck size={16} className="text-[#0072BC] dark:text-[#72C8F1]" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#173B65] dark:text-slate-100">
                  A. Data Pegawai Saat Ini
                </h4>
              </div>
              {!defaultEmployee && (
                <div className="relative sm:w-64">
                  <Search
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    placeholder="Filter nama / NIP pegawai..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-2 space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  1. Nama Pegawai <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedEmpId}
                  disabled={Boolean(defaultEmployee)}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none disabled:opacity-75"
                >
                  <option value="">-- Pilih Pegawai --</option>
                  {filteredEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id} className="dark:bg-slate-900">
                      {emp.fullName} — {emp.nip} ({emp.unitPelaksana})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  2. NIP (Otomatis)
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedEmployee?.nip || '-'}
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-[#173B65] dark:text-slate-200 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  3. Jabatan Saat Ini
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedEmployee?.jabatanLengkap || '-'}
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#173B65] dark:text-slate-200 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  4. Bidang Saat Ini
                </label>
                <input
                  type="text"
                  readOnly
                  value={currentBidang}
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#173B65] dark:text-slate-200 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  5. Unit Kerja Saat Ini
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedEmployee?.unitPelaksana || '-'}
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#173B65] dark:text-slate-200 outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION B: INFORMASI MUTASI */}
          <div className="space-y-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0E1A2E] p-4 sm:p-5">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Building2 size={16} className="text-[#0072BC] dark:text-[#72C8F1]" />
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#173B65] dark:text-slate-100">
                B. Informasi &amp; Target Penempatan Mutasi
              </h4>
            </div>

            {/* Jenis & Kategori */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  6. Jenis Mutasi <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Internal', 'Eksternal'] as MutationType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setJenisMutasi(type)}
                      className={cn(
                        'py-2.5 px-3 rounded-xl text-xs font-extrabold border transition-all',
                        jenisMutasi === type
                          ? 'bg-[#0072BC] text-white border-[#0072BC] shadow-xs'
                          : 'bg-[#F4F8FB] dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#0072BC]'
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {jenisMutasi === 'Eksternal' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Arah Mutasi Eksternal <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Masuk', 'Keluar'] as ExternalMutationDirection[]).map((dir) => (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => setArahMutasi(dir)}
                        className={cn(
                          'py-2.5 px-3 rounded-xl text-xs font-extrabold border transition-all',
                          arahMutasi === dir
                            ? dir === 'Masuk'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-amber-600 text-white border-amber-600'
                            : 'bg-[#F4F8FB] dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        )}
                      >
                        Mutasi {dir}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div
                className={cn(
                  'space-y-1.5',
                  jenisMutasi === 'Internal' ? 'sm:col-span-1 lg:col-span-2' : ''
                )}
              >
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  7. Kategori Mutasi <span className="text-red-500">*</span>
                </label>
                <select
                  value={kategoriMutasi}
                  onChange={(e) => setKategoriMutasi(e.target.value as MutationCategory)}
                  className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none"
                >
                  {MUTATION_CATEGORY_OPTIONS.map((kat) => (
                    <option key={kat} value={kat} className="dark:bg-slate-900">
                      {kat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sub-jenis & Entitas Eksternal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Rincian Skema Mutasi <span className="text-red-500">*</span>
                </label>
                <select
                  value={subJenisMutasi}
                  onChange={(e) => setSubJenisMutasi(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none"
                >
                  {(jenisMutasi === 'Internal'
                    ? INTERNAL_MUTATION_SUBTYPES
                    : EXTERNAL_MUTATION_SUBTYPES[arahMutasi]
                  ).map((sub) => (
                    <option key={sub} value={sub} className="dark:bg-slate-900">
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {jenisMutasi === 'Eksternal' ? (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    11. Perusahaan / Entitas {arahMutasi === 'Masuk' ? 'Asal' : 'Tujuan'}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="external-entities-list"
                    value={entitasEksternal}
                    onChange={(e) => setEntitasEksternal(e.target.value)}
                    placeholder="Contoh: PT PLN Nusantara Power UP Muara Karang"
                    className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none"
                  />
                  <datalist id="external-entities-list">
                    {EXTERNAL_ENTITY_SUGGESTIONS.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Status Kepegawaian Setelah Mutasi
                  </label>
                  <select
                    value={statusBaru}
                    onChange={(e) => setStatusBaru(e.target.value as EmployeeStatus)}
                    className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none"
                  >
                    <option value="Pegawai Organik" className="dark:bg-slate-900">
                      Pegawai Organik
                    </option>
                    <option value="Pegawai Tugas Khusus" className="dark:bg-slate-900">
                      Pegawai Tugas Khusus
                    </option>
                    <option value="Tenaga Alih Daya" className="dark:bg-slate-900">
                      Tenaga Alih Daya
                    </option>
                  </select>
                </div>
              )}
            </div>

            {jenisMutasi === 'Eksternal' && arahMutasi === 'Keluar' && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
                <Info size={16} className="shrink-0 mt-0.5" />
                <span>
                  Untuk <strong>Mutasi Keluar</strong>, identitas pegawai, NIP, dan seluruh riwayat
                  tetap tersimpan permanen. Status penempatan pegawai akan otomatis diperbarui
                  menjadi <strong>Mutasi Keluar</strong> setelah disetujui.
                </span>
              </div>
            )}

            {/* Unit Kerja Baru, Bidang Baru, Jabatan Baru */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  10. Unit Kerja Baru <span className="text-red-500">*</span>
                </label>
                <select
                  value={unitKerjaBaru}
                  disabled={isUnitLocked}
                  onChange={(e) => setUnitKerjaBaru(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none disabled:opacity-60"
                >
                  {MUTATION_UNIT_KERJA_OPTIONS.map((unit) => (
                    <option key={unit} value={unit} className="dark:bg-slate-900">
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  9. Bidang Baru <span className="text-red-500">*</span>
                </label>
                <select
                  value={bidangBaru}
                  onChange={(e) => setBidangBaru(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none"
                >
                  {availableBidangOptions.map((b) => (
                    <option key={b} value={b} className="dark:bg-slate-900">
                      {b}
                    </option>
                  ))}
                </select>
                <span className="block text-[10px] text-slate-400 font-medium">
                  Menyesuaikan unit kerja {unitKerjaBaru}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  8. Jabatan Baru <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={jabatanBaru}
                  disabled={isJabatanLocked}
                  onChange={(e) => setJabatanBaru(e.target.value)}
                  placeholder="Contoh: Team Leader SDM, Umum dan CSR"
                  className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none disabled:opacity-60"
                />
                {isJabatanLocked && (
                  <span className="block text-[10px] text-slate-400 font-medium">
                    Tetap pada kategori Mutasi Unit
                  </span>
                )}
              </div>
            </div>

            {/* SK, Dates, Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  12. Tanggal Efektif Mutasi <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  13. Nomor SK Mutasi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nomorSk}
                  onChange={(e) => setNomorSk(e.target.value)}
                  placeholder="Contoh: 045.K/SDM.02.01/PLN-NP/2026"
                  className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  14. Tanggal SK Mutasi <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={tanggalSk}
                  onChange={(e) => setTanggalSk(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none"
                />
              </div>
            </div>

            {/* Reason & Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  15. Alasan / Keterangan Mutasi <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={alasanMutasi}
                  onChange={(e) => setAlasanMutasi(e.target.value)}
                  placeholder="Tuliskan dasar kebutuhan organisasi, rotasi kompetensi, atau keterangan SK mutasi..."
                  className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  16. Upload Dokumen Pendukung (SK Mutasi / Surat Keputusan)
                </label>
                <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-[#F4F8FB] dark:bg-slate-800/50 hover:border-[#0072BC] transition-colors cursor-pointer min-h-[86px]">
                  <Upload size={18} className="text-[#0072BC] dark:text-[#72C8F1]" />
                  {dokumenFile ? (
                    <div className="text-center">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate max-w-[260px]">
                        {dokumenFile.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {(dokumenFile.size / 1024).toFixed(1)} KB · Klik untuk ganti file
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-xs font-bold text-[#173B65] dark:text-slate-200">
                        Pilih PDF / Gambar SK Mutasi
                      </p>
                      <p className="text-[10px] text-slate-400">Maksimal 50 MB (Opsional)</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Live Before -> After Summary */}
            {selectedEmployee && (
              <div className="p-4 rounded-xl bg-[#EAF6FC]/65 dark:bg-[#0072BC]/15 border border-[#72C8F1]/40 dark:border-[#0072BC]/40 grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
                <div className="md:col-span-5 space-y-0.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Posisi Saat Ini
                  </p>
                  <p className="text-xs font-extrabold text-[#173B65] dark:text-slate-100">
                    {selectedEmployee.jabatanLengkap}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {selectedEmployee.unitPelaksana} · {currentBidang}
                  </p>
                </div>
                <div className="md:col-span-1 flex justify-center">
                  <div className="w-8 h-8 rounded-full bg-[#0072BC] text-white flex items-center justify-center">
                    <ArrowRight size={15} />
                  </div>
                </div>
                <div className="md:col-span-5 space-y-0.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#0072BC] dark:text-[#72C8F1]">
                    Rencana Penempatan Baru
                  </p>
                  <p className="text-xs font-extrabold text-[#173B65] dark:text-white">
                    {jabatanBaru || '-'}
                  </p>
                  <p className="text-[11px] text-[#0072BC] dark:text-[#72C8F1] font-semibold">
                    {unitKerjaBaru} · {bidangBaru}
                    {jenisMutasi === 'Eksternal' && entitasEksternal
                      ? ` (${arahMutasi}: ${entitasEksternal})`
                      : ''}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Briefcase size={13} className="text-[#0072BC]" />
              Pengajuan berstatus <strong>Menunggu Persetujuan</strong> sampai disetujui pejabat.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedEmployee}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0072BC] to-[#173B65] text-white text-xs font-bold hover:brightness-110 transition-all shadow-md disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Menyimpan Pengajuan...
                  </>
                ) : (
                  <>
                    <FileText size={15} className="text-[#F9D423]" />
                    Ajukan Mutasi Pegawai
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

export default MutationFormModal;
