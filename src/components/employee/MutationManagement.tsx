import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Briefcase,
  Layers,
  Eye,
  Edit3,
  ArrowRight,
  RotateCcw,
  X,
  AlertCircle,
  Loader2,
  Calendar,
  ShieldCheck,
  History,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Employee, EmployeeMutation, MutationApprovalStatus } from '../../types';
import { useMutations, getTodayIsoDate } from '../../hooks/useMutations';
import {
  MUTATION_ALL_BIDANG_OPTIONS,
  MUTATION_STATUS_META,
  MUTATION_UNIT_KERJA_OPTIONS,
  inferMutationTypeBadge,
} from '../../data/mutationConstants';
import { formatDate, cn } from '../../lib/utils';
import {
  PageHeader,
  MetricCard,
  SectionCard,
  EmptyState,
  TableSkeleton,
} from '../common/DashboardUI';
import { StoredFileLink } from '../common/StoredFileUI';
import MutationFormModal from './MutationFormModal';
import MutationCorrectionModal from './MutationCorrectionModal';

interface MutationManagementProps {
  employees: Employee[];
  canManage: boolean;
  onSelectEmployee?: (emp: Employee) => void;
}

const MutationManagement: React.FC<MutationManagementProps> = ({
  employees,
  canManage,
  onSelectEmployee,
}) => {
  const {
    mutations,
    loading,
    mutationStats,
    submitMutation,
    approveOrRejectMutation,
    applyScheduledMutation,
    correctMutation,
  } = useMutations({ enabled: true, autoApplyScheduled: canManage });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJenis, setFilterJenis] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterUnitAsal, setFilterUnitAsal] = useState<string>('All');
  const [filterUnitTujuan, setFilterUnitTujuan] = useState<string>('All');
  const [filterBidangAsal, setFilterBidangAsal] = useState<string>('All');
  const [filterBidangTujuan, setFilterBidangTujuan] = useState<string>('All');
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Modals & Toasts
  const [formOpen, setFormOpen] = useState(false);
  const [detailMutation, setDetailMutation] = useState<EmployeeMutation | null>(null);
  const [correctingMutation, setCorrectingMutation] = useState<EmployeeMutation | null>(null);
  const [approvalDialog, setApprovalDialog] = useState<{
    mutation: EmployeeMutation;
    mode: 'approve' | 'reject';
  } | null>(null);
  const [approvalInput, setApprovalInput] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const todayStr = getTodayIsoDate();

  const filteredMutations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return mutations.filter((m) => {
      const matchesSearch =
        !q ||
        m.employeeName.toLowerCase().includes(q) ||
        m.employeeNip.toLowerCase().includes(q) ||
        m.nomorSk.toLowerCase().includes(q) ||
        m.jabatanBaru.toLowerCase().includes(q) ||
        m.jabatanSebelumnya.toLowerCase().includes(q);
      const matchesJenis = filterJenis === 'All' || m.jenisMutasi === filterJenis;
      const matchesStatus = filterStatus === 'All' || m.status === filterStatus;
      const matchesUnitAsal =
        filterUnitAsal === 'All' || m.unitKerjaSebelumnya === filterUnitAsal;
      const matchesUnitTujuan =
        filterUnitTujuan === 'All' || m.unitKerjaBaru === filterUnitTujuan;
      const matchesBidangAsal =
        filterBidangAsal === 'All' || m.bidangSebelumnya === filterBidangAsal;
      const matchesBidangTujuan =
        filterBidangTujuan === 'All' || m.bidangBaru === filterBidangTujuan;
      const matchesPeriodStart = !periodStart || m.effectiveDate >= periodStart;
      const matchesPeriodEnd = !periodEnd || m.effectiveDate <= periodEnd;
      return (
        matchesSearch &&
        matchesJenis &&
        matchesStatus &&
        matchesUnitAsal &&
        matchesUnitTujuan &&
        matchesBidangAsal &&
        matchesBidangTujuan &&
        matchesPeriodStart &&
        matchesPeriodEnd
      );
    });
  }, [
    mutations,
    searchTerm,
    filterJenis,
    filterStatus,
    filterUnitAsal,
    filterUnitTujuan,
    filterBidangAsal,
    filterBidangTujuan,
    periodStart,
    periodEnd,
  ]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterJenis('All');
    setFilterStatus('All');
    setFilterUnitAsal('All');
    setFilterUnitTujuan('All');
    setFilterBidangAsal('All');
    setFilterBidangTujuan('All');
    setPeriodStart('');
    setPeriodEnd('');
  };

  const exportExcel = () => {
    const rows = filteredMutations.map((m) => ({
      'Tanggal Efektif': formatDate(m.effectiveDate),
      NIP: m.employeeNip,
      'Nama Pegawai': m.employeeName,
      'Jenis Mutasi': inferMutationTypeBadge(m.jenisMutasi, m.arahMutasi),
      'Kategori Mutasi': m.kategoriMutasi,
      'Unit Kerja Asal': m.unitKerjaSebelumnya,
      'Bidang Asal': m.bidangSebelumnya,
      'Jabatan Asal': m.jabatanSebelumnya,
      'Unit Kerja Tujuan': m.unitKerjaBaru,
      'Bidang Tujuan': m.bidangBaru,
      'Jabatan Baru': m.jabatanBaru,
      'Entitas Eksternal': m.entitasEksternal || '-',
      'Nomor SK': m.nomorSk,
      'Tanggal SK': formatDate(m.tanggalSk),
      Status: MUTATION_STATUS_META[m.status]?.label || m.status,
      'Pejabat Persetujuan': m.approvedByName || '-',
      Keterangan: m.alasanMutasi,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Histori Mutasi');
    XLSX.writeFile(wb, `Histori_Mutasi_SIMAP_UP_Kapuas_${todayStr}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(13);
    doc.text('Laporan Riwayat Mutasi Pegawai - PT PLN Nusantara Power UP Kapuas', 14, 15);
    doc.setFontSize(9);
    doc.text(`Dicetak pada: ${formatDate(todayStr)} · Total Data: ${filteredMutations.length}`, 14, 21);

    (doc as any).autoTable({
      startY: 26,
      styles: { fontSize: 7.5 },
      head: [
        [
          'Efektif',
          'NIP',
          'Nama Pegawai',
          'Jenis / Kategori',
          'Penempatan Asal',
          'Penempatan Baru',
          'Nomor SK',
          'Status',
        ],
      ],
      body: filteredMutations.map((m) => [
        formatDate(m.effectiveDate),
        m.employeeNip,
        m.employeeName,
        `${inferMutationTypeBadge(m.jenisMutasi, m.arahMutasi)}\n${m.kategoriMutasi}`,
        `${m.unitKerjaSebelumnya}\n${m.jabatanSebelumnya}`,
        `${m.unitKerjaBaru}\n${m.jabatanBaru}`,
        m.nomorSk,
        MUTATION_STATUS_META[m.status]?.label || m.status,
      ]),
    });
    doc.save(`Laporan_Mutasi_SIMAP_UP_Kapuas_${todayStr}.pdf`);
  };

  const handleConfirmApproval = async () => {
    if (!approvalDialog) return;
    const { mutation, mode } = approvalDialog;
    if (mode === 'reject' && !approvalInput.trim()) {
      showToast('error', 'Alasan penolakan mutasi wajib diisi.');
      return;
    }

    setProcessingId(mutation.id || null);
    try {
      const outcome = await approveOrRejectMutation(
        mutation,
        mode === 'approve',
        approvalInput.trim()
      );
      if (outcome === 'applied') {
        showToast(
          'success',
          `Mutasi ${mutation.employeeName} disetujui dan langsung diterapkan ke Data Pegawai.`
        );
      } else if (outcome === 'scheduled') {
        showToast(
          'success',
          `Mutasi ${mutation.employeeName} disetujui dan dijadwalkan aktif pada ${formatDate(
            mutation.effectiveDate
          )}.`
        );
      } else if (outcome === 'rejected') {
        showToast('success', `Pengajuan mutasi ${mutation.employeeName} telah ditolak.`);
      }
      setApprovalDialog(null);
      setApprovalInput('');
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal memproses persetujuan mutasi.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApplyScheduled = async (m: EmployeeMutation) => {
    if (!m.id) return;
    setProcessingId(m.id);
    try {
      const outcome = await applyScheduledMutation(m);
      if (outcome === 'applied') {
        showToast('success', `Penempatan baru ${m.employeeName} berhasil diterapkan ke Data Pegawai.`);
      } else {
        showToast('error', `Tanggal efektif mutasi (${formatDate(m.effectiveDate)}) belum tiba.`);
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menerapkan mutasi terjadwal.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Mutasi Unit & Mutasi Jabatan Pegawai"
        subtitle="Employee Movement Management System · Satu Pegawai – Satu NIP – Satu Data Terbaru – Histori Tersimpan Selamanya"
        icon={ArrowLeftRight}
        badge={`${mutationStats.totalRecords} Catatan Mutasi`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportExcel}
              disabled={filteredMutations.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold hover:border-emerald-500 transition-colors disabled:opacity-40"
            >
              <FileSpreadsheet size={14} />
              Excel
            </button>
            <button
              type="button"
              onClick={exportPDF}
              disabled={filteredMutations.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold hover:border-red-500 transition-colors disabled:opacity-40"
            >
              <FileText size={14} />
              PDF
            </button>
            {canManage && (
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="relative overflow-hidden inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0072BC] to-[#173B65] text-white rounded-xl text-xs font-bold hover:brightness-110 transition-all shadow-sm"
              >
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-[#F9D423]" />
                <Plus size={15} className="text-[#F9D423]" />
                Ajukan Mutasi Pegawai
              </button>
            )}
          </div>
        }
      />

      {toast && (
        <div
          role="status"
          className={cn(
            'p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold',
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300'
          )}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0" />
            ) : (
              <AlertCircle size={16} className="shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button type="button" onClick={() => setToast(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* 7 Monitoring KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3.5">
        <MetricCard
          title="Mutasi Internal"
          value={mutationStats.totalInternal}
          subtitle="Antarunit / Bidang / Jabatan"
          icon={ArrowLeftRight}
          accent="blue"
        />
        <MetricCard
          title="Mutasi Eksternal"
          value={mutationStats.totalEksternal}
          subtitle={`${mutationStats.eksternalMasuk} Masuk · ${mutationStats.eksternalKeluar} Keluar`}
          icon={Building2}
          accent="cyan"
        />
        <MetricCard
          title="Mutasi Antarunit"
          value={mutationStats.antarUnit}
          subtitle="Perpindahan lokasi unit"
          icon={Layers}
          accent="navy"
        />
        <MetricCard
          title="Mutasi Antarbidang"
          value={mutationStats.antarBidang}
          subtitle="Rotasi lintas bidang"
          icon={Briefcase}
          accent="blue"
        />
        <MetricCard
          title="Mutasi Jabatan"
          value={mutationStats.mutasiJabatan}
          subtitle="Promosi / rotasi peran"
          icon={ShieldCheck}
          accent="emerald"
        />
        <MetricCard
          title="Menunggu Approval"
          value={mutationStats.menungguPersetujuan}
          subtitle="Perlu verifikasi pejabat"
          icon={Clock}
          accent={mutationStats.menungguPersetujuan > 0 ? 'amber' : 'emerald'}
        />
        <MetricCard
          title={`Tahun ${mutationStats.currentYear}`}
          value={mutationStats.tahunBerjalan}
          subtitle="Riwayat tahun berjalan"
          icon={Calendar}
          accent="yellow"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard
          title="Tren Mutasi per Tahun"
          subtitle="Perbandingan Internal vs Eksternal"
          icon={Calendar}
        >
          {mutationStats.byYear.length > 0 ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mutationStats.byYear}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="internal" name="Internal" fill="#0072BC" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="eksternal" name="Eksternal" fill="#72C8F1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-14">Belum ada data grafik tahunan.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Mutasi Berdasarkan Unit Kerja"
          subtitle="Unit kerja penempatan tujuan"
          icon={Building2}
        >
          {mutationStats.byUnit.length > 0 ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mutationStats.byUnit} layout="vertical" margin={{ left: 10, right: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94a3b8" strokeOpacity={0.2} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Bar dataKey="tujuan" name="Mutasi Masuk Unit" fill="#0072BC" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-14">Belum ada data mutasi unit.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Mutasi Berdasarkan Bidang"
          subtitle="Distribusi bidang penempatan baru"
          icon={Briefcase}
        >
          {mutationStats.byBidang.length > 0 ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mutationStats.byBidang.slice(0, 6)} layout="vertical" margin={{ left: 10, right: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94a3b8" strokeOpacity={0.2} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={115}
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Bar dataKey="total" name="Total Mutasi" fill="#F9D423" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-14">Belum ada data mutasi bidang.</p>
          )}
        </SectionCard>
      </div>

      {/* Main Table + Search & Filters */}
      <div className="corporate-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-[#F8FBFD] dark:bg-[#11223B]/50 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari Nama, NIP, Nomor SK, atau Jabatan..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterJenis}
                onChange={(e) => setFilterJenis(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#173B65] dark:text-slate-200 outline-none"
              >
                <option value="All">Semua Jenis</option>
                <option value="Internal">Internal</option>
                <option value="Eksternal">Eksternal</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#173B65] dark:text-slate-200 outline-none"
              >
                <option value="All">Semua Status</option>
                <option value="Menunggu Persetujuan">Menunggu Persetujuan</option>
                <option value="Disetujui">Disetujui (Terjadwal)</option>
                <option value="Diterapkan">Diterapkan</option>
                <option value="Ditolak">Ditolak</option>
              </select>

              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-colors',
                  showFilters
                    ? 'bg-[#0072BC] text-white border-[#0072BC]'
                    : 'bg-white dark:bg-[#0E1A2E] border-slate-200 dark:border-slate-700 text-[#173B65] dark:text-slate-200'
                )}
              >
                <Filter size={13} />
                Filter Lanjutan
              </button>

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1A2E] text-xs font-bold text-slate-500 hover:text-[#0072BC]"
              >
                <RotateCcw size={13} />
                Reset
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-slate-200/70 dark:border-slate-800">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Unit Kerja Asal
                </label>
                <select
                  value={filterUnitAsal}
                  onChange={(e) => setFilterUnitAsal(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#173B65] dark:text-slate-200"
                >
                  <option value="All">Semua Unit Asal</option>
                  {MUTATION_UNIT_KERJA_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Unit Kerja Tujuan
                </label>
                <select
                  value={filterUnitTujuan}
                  onChange={(e) => setFilterUnitTujuan(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#173B65] dark:text-slate-200"
                >
                  <option value="All">Semua Unit Tujuan</option>
                  {MUTATION_UNIT_KERJA_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Bidang Asal
                </label>
                <select
                  value={filterBidangAsal}
                  onChange={(e) => setFilterBidangAsal(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#173B65] dark:text-slate-200"
                >
                  <option value="All">Semua Bidang Asal</option>
                  {MUTATION_ALL_BIDANG_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Bidang Tujuan
                </label>
                <select
                  value={filterBidangTujuan}
                  onChange={(e) => setFilterBidangTujuan(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#173B65] dark:text-slate-200"
                >
                  <option value="All">Semua Bidang Tujuan</option>
                  {MUTATION_ALL_BIDANG_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Periode Efektif (Dari)
                </label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#173B65] dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Periode Efektif (Sampai)
                </label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#173B65] dark:text-slate-200"
                />
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : filteredMutations.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="Belum ada data mutasi pegawai"
            description="Ajukan mutasi unit atau jabatan melalui tombol Ajukan Mutasi Pegawai atau ubah kriteria filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F4F8FB] dark:bg-[#0B172A] border-b border-slate-100 dark:border-slate-800">
                <tr className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  <th className="px-5 py-3.5">Pegawai (NIP)</th>
                  <th className="px-5 py-3.5">Jenis &amp; Kategori</th>
                  <th className="px-5 py-3.5">Perpindahan Penempatan &amp; Jabatan</th>
                  <th className="px-5 py-3.5">SK &amp; Tgl Efektif</th>
                  <th className="px-5 py-3.5">Status Persetujuan</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredMutations.map((m) => {
                  const statusMeta =
                    MUTATION_STATUS_META[m.status as MutationApprovalStatus] ||
                    MUTATION_STATUS_META['Menunggu Persetujuan'];
                  const empObj = employees.find((e) => e.id === m.employeeId);
                  const isDueScheduled =
                    m.status === 'Disetujui' && !m.appliedToEmployee && m.effectiveDate <= todayStr;

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-[#EAF6FC]/35 dark:hover:bg-[#0072BC]/10 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => empObj && onSelectEmployee?.(empObj)}
                          className="text-left group"
                        >
                          <p className="font-bold text-[#173B65] dark:text-slate-100 group-hover:text-[#0072BC] dark:group-hover:text-[#72C8F1]">
                            {m.employeeName}
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                            NIP {m.employeeNip}
                          </p>
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            'inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide',
                            m.jenisMutasi === 'Internal'
                              ? 'bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1]'
                              : m.arahMutasi === 'Keluar'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          )}
                        >
                          {inferMutationTypeBadge(m.jenisMutasi, m.arahMutasi)}
                        </span>
                        <p className="text-[11px] font-bold text-[#173B65] dark:text-slate-200 mt-1">
                          {m.kategoriMutasi}
                        </p>
                      </td>
                      <td className="px-5 py-4 max-w-[330px]">
                        <div className="space-y-1">
                          <p className="text-[11px] text-slate-400 line-through decoration-slate-300 truncate">
                            {m.unitKerjaSebelumnya} · {m.jabatanSebelumnya}
                          </p>
                          <p className="text-xs font-bold text-[#173B65] dark:text-slate-100 flex items-center gap-1.5">
                            <ArrowRight size={12} className="text-[#0072BC] shrink-0" />
                            <span className="truncate">
                              {m.unitKerjaBaru} · {m.jabatanBaru}
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            Bidang: {m.bidangBaru}
                            {m.entitasEksternal ? ` · ${m.entitasEksternal}` : ''}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-mono font-bold text-[#173B65] dark:text-slate-200">
                          {m.nomorSk}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                          Efektif: {formatDate(m.effectiveDate)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            'inline-block px-2.5 py-0.5 rounded-md text-[10px] font-extrabold',
                            statusMeta.badgeClass
                          )}
                        >
                          {statusMeta.label}
                        </span>
                        {m.approvedByName && (
                          <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[160px]">
                            Pejabat: {m.approvedByName}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && m.status === 'Menunggu Persetujuan' && (
                            <>
                              <button
                                type="button"
                                disabled={processingId === m.id}
                                onClick={() => {
                                  setApprovalInput('');
                                  setApprovalDialog({ mutation: m, mode: 'approve' });
                                }}
                                title="Setujui Mutasi"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-colors"
                              >
                                <CheckCircle2 size={12} />
                                Setujui
                              </button>
                              <button
                                type="button"
                                disabled={processingId === m.id}
                                onClick={() => {
                                  setApprovalInput('');
                                  setApprovalDialog({ mutation: m, mode: 'reject' });
                                }}
                                title="Tolak Mutasi"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 text-[11px] font-bold hover:bg-red-100"
                              >
                                <XCircle size={12} />
                                Tolak
                              </button>
                            </>
                          )}
                          {canManage && isDueScheduled && (
                            <button
                              type="button"
                              disabled={processingId === m.id}
                              onClick={() => handleApplyScheduled(m)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0072BC] text-white text-[11px] font-bold hover:bg-[#173B65]"
                            >
                              {processingId === m.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={12} />
                              )}
                              Terapkan
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDetailMutation(m)}
                            title="Lihat Rincian Mutasi"
                            className="p-1.5 rounded-lg bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] hover:bg-[#0072BC] hover:text-white transition-colors"
                          >
                            <Eye size={14} />
                          </button>
                          {canManage && m.status !== 'Ditolak' && (
                            <button
                              type="button"
                              onClick={() => setCorrectingMutation(m)}
                              title="Koreksi Data Mutasi"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#0072BC] hover:bg-[#EAF6FC] dark:hover:bg-slate-800 transition-colors"
                            >
                              <Edit3 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Mutation Modal */}
      <MutationFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        employees={employees}
        onSubmit={submitMutation}
        onSuccess={(msg) => showToast('success', msg)}
      />

      {/* Correction Modal */}
      <MutationCorrectionModal
        mutation={correctingMutation}
        onClose={() => setCorrectingMutation(null)}
        onCorrect={correctMutation}
        onSuccess={(msg) => showToast('success', msg)}
      />

      {/* Approval / Rejection Modal */}
      {approvalDialog && (
        <div
          className="fixed inset-0 z-50 bg-[#071120]/65 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !processingId && setApprovalDialog(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-[#0E1A2E] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
          >
            <h4 className="text-sm font-extrabold text-[#173B65] dark:text-white">
              {approvalDialog.mode === 'approve'
                ? 'Konfirmasi Persetujuan Mutasi'
                : 'Konfirmasi Penolakan Mutasi'}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {approvalDialog.mode === 'approve' ? (
                <>
                  Anda akan menyetujui mutasi{' '}
                  <strong>{approvalDialog.mutation.employeeName}</strong> (SK{' '}
                  <strong>{approvalDialog.mutation.nomorSk}</strong>).
                  {approvalDialog.mutation.effectiveDate <= todayStr
                    ? ' Karena tanggal efektif sudah tiba, data unit, bidang, dan jabatan pegawai akan otomatis diperbarui sekarang.'
                    : ` Data pegawai akan diperbarui otomatis sesuai tanggal efektif (${formatDate(
                        approvalDialog.mutation.effectiveDate
                      )}).`}
                </>
              ) : (
                <>
                  Pengajuan mutasi <strong>{approvalDialog.mutation.employeeName}</strong> akan
                  ditolak dan tidak mengubah data pegawai saat ini.
                </>
              )}
            </p>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {approvalDialog.mode === 'approve'
                  ? 'Catatan Pejabat (Opsional)'
                  : 'Alasan Penolakan (Wajib) *'}
              </label>
              <textarea
                rows={3}
                value={approvalInput}
                onChange={(e) => setApprovalInput(e.target.value)}
                placeholder={
                  approvalDialog.mode === 'approve'
                    ? 'Catatan tambahan persetujuan...'
                    : 'Tuliskan alasan penolakan mutasi...'
                }
                className="w-full px-3.5 py-2 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC] resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={Boolean(processingId)}
                onClick={() => setApprovalDialog(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={Boolean(processingId)}
                onClick={handleConfirmApproval}
                className={cn(
                  'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white',
                  approvalDialog.mode === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                )}
              >
                {processingId && <Loader2 size={14} className="animate-spin" />}
                {approvalDialog.mode === 'approve' ? 'Setujui Mutasi' : 'Tolak Pengajuan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Mutation Drawer / Modal */}
      {detailMutation && (
        <div
          className="fixed inset-0 z-50 bg-[#071120]/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setDetailMutation(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white dark:bg-[#0E1A2E] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
          >
            <div className="pln-gradient px-6 py-4 text-white flex items-center justify-between border-b-2 border-[#F9D423]">
              <div>
                <h4 className="text-sm font-extrabold">{detailMutation.employeeName}</h4>
                <p className="text-[11px] font-mono text-white/80">
                  NIP {detailMutation.employeeNip} · SK {detailMutation.nomorSk}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailMutation(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <span
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-extrabold',
                    MUTATION_STATUS_META[detailMutation.status]?.badgeClass
                  )}
                >
                  {MUTATION_STATUS_META[detailMutation.status]?.label || detailMutation.status}
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-semibold">
                  Efektif: <strong className="text-[#173B65] dark:text-white">{formatDate(detailMutation.effectiveDate)}</strong> · Tgl SK: {formatDate(detailMutation.tanggalSk)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Data Sebelum Mutasi
                  </p>
                  <p className="font-bold text-[#173B65] dark:text-slate-100">
                    {detailMutation.jabatanSebelumnya}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    Unit: {detailMutation.unitKerjaSebelumnya}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    Bidang: {detailMutation.bidangSebelumnya}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    Status: {detailMutation.statusKepegawaianSebelumnya}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#EAF6FC]/70 dark:bg-[#0072BC]/15 border border-[#72C8F1]/40 space-y-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#0072BC] dark:text-[#72C8F1]">
                    Penempatan Baru ({detailMutation.kategoriMutasi})
                  </p>
                  <p className="font-extrabold text-[#173B65] dark:text-white">
                    {detailMutation.jabatanBaru}
                  </p>
                  <p className="text-[#173B65] dark:text-slate-200 font-semibold">
                    Unit: {detailMutation.unitKerjaBaru}
                  </p>
                  <p className="text-[#173B65] dark:text-slate-200">
                    Bidang: {detailMutation.bidangBaru}
                  </p>
                  {detailMutation.entitasEksternal && (
                    <p className="text-[#0072BC] dark:text-[#72C8F1] font-bold">
                      Entitas: {detailMutation.entitasEksternal}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Alasan / Keterangan
                </p>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                  {detailMutation.alasanMutasi}
                </p>
              </div>

              {detailMutation.rejectionReason && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300">
                  <strong>Alasan Penolakan:</strong> {detailMutation.rejectionReason}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Petugas Penginput</p>
                  <p className="font-bold text-[#173B65] dark:text-slate-200 mt-0.5">
                    {detailMutation.createdByName}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Pejabat Persetujuan</p>
                  <p className="font-bold text-[#173B65] dark:text-slate-200 mt-0.5">
                    {detailMutation.approvedByName || 'Menunggu Verifikasi'}
                  </p>
                </div>
              </div>

              {detailMutation.dokumenPendukung?.url && (
                <StoredFileLink
                  url={detailMutation.dokumenPendukung.url}
                  fileName={detailMutation.dokumenPendukung.name}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] font-bold hover:bg-[#0072BC] hover:text-white transition-colors"
                >
                  <FileText size={15} />
                  Buka Dokumen Pendukung SK ({detailMutation.dokumenPendukung.name})
                </StoredFileLink>
              )}

              {detailMutation.correctionHistory && detailMutation.correctionHistory.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <History size={13} />
                    Jejak Audit Koreksi ({detailMutation.correctionHistory.length})
                  </p>
                  <div className="space-y-2">
                    {detailMutation.correctionHistory.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1"
                      >
                        <p className="font-bold text-[#173B65] dark:text-slate-200">
                          {c.correctedByName} · {formatDate(c.correctedAt)}
                        </p>
                        <p className="text-slate-600 dark:text-slate-300">Alasan: {c.reason}</p>
                        <p className="text-[11px] text-slate-400">
                          Sebelum: {c.previousSummary}
                        </p>
                        <p className="text-[11px] text-[#0072BC] dark:text-[#72C8F1]">
                          Sesudah: {c.newSummary}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MutationManagement;
