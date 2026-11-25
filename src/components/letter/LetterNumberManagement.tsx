import React, { useMemo, useState } from 'react';
import {
  FileCheck2,
  Plus,
  Search,
  Filter,
  Building2,
  Calendar,
  FileSpreadsheet,
  FileText,
  Eye,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Copy,
  Check,
  BarChart3,
  ListChecks,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Ban,
  ShieldCheck,
  X,
  User,
  ExternalLink,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../context/AuthContext';
import {
  Employee,
  LetterCode,
  LetterNumberRequest,
  LetterUnitCode,
} from '../../types';
import { useLetterNumbers, WhatsAppDispatchResult } from '../../hooks/useLetterNumbers';
import {
  buildWhatsAppPreviewMessage,
  getDynamicYearOptions,
  LETTER_CODE_OPTIONS,
  LETTER_STATUS_META,
  LETTER_UNIT_LABELS,
  LETTER_UNIT_OPTIONS,
  WHATSAPP_STATUS_META,
} from '../../data/letterConstants';
import LetterNumberFormModal from './LetterNumberFormModal';
import {
  PageHeader,
  MetricCard,
  SectionCard,
  EmptyState,
  TableSkeleton,
} from '../common/DashboardUI';
import { cn } from '../../lib/utils';

interface LetterNumberManagementProps {
  employees: Employee[];
  defaultEmployee?: Employee | null;
  canManage?: boolean;
  compactHeader?: boolean;
}

const CHART_COLORS = ['#0072BC', '#72C8F1', '#F9D423', '#10B981', '#173B65'];

const LetterNumberManagement: React.FC<LetterNumberManagementProps> = ({
  employees,
  defaultEmployee = null,
  canManage = false,
  compactHeader = false,
}) => {
  const { user } = useAuth();
  const {
    requests,
    loading,
    stats,
    gatewayStatus,
    getNextSequencePreview,
    submitLetterNumberRequest,
    resendWhatsAppNotification,
    cancelLetterNumberRequest,
  } = useLetterNumbers(true);

  const [activeView, setActiveView] = useState<'overview' | 'history'>('overview');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<LetterNumberRequest | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [unitFilter, setUnitFilter] = useState<'ALL' | LetterUnitCode>('ALL');
  const [codeFilter, setCodeFilter] = useState<'ALL' | LetterCode>('ALL');
  const [employeeFilter, setEmployeeFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bannerFeedback, setBannerFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  const [cancelReason, setCancelReason] = useState('');
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const yearOptions = useMemo(() => {
    const dyn = getDynamicYearOptions();
    const fromData = requests.map((r) => Number(r.tahun)).filter((n) => !Number.isNaN(n));
    return Array.from(new Set([...dyn, ...fromData])).sort((a, b) => b - a);
  }, [requests]);

  const applicantNameOptions = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      if (r.namaPengaju) set.add(r.namaPengaju);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return requests.filter((req) => {
      const matchYear = yearFilter === 'ALL' || String(req.tahun) === yearFilter;
      const matchUnit = unitFilter === 'ALL' || req.unitKode === unitFilter;
      const matchCode = codeFilter === 'ALL' || req.kodeSurat === codeFilter;
      const matchEmp = employeeFilter === 'ALL' || req.namaPengaju === employeeFilter;
      const matchQuery =
        !q ||
        req.nomorSurat.toLowerCase().includes(q) ||
        req.namaPengaju.toLowerCase().includes(q) ||
        req.nip.toLowerCase().includes(q) ||
        req.bidang.toLowerCase().includes(q) ||
        req.nomorWhatsapp.toLowerCase().includes(q) ||
        (req.perihal || '').toLowerCase().includes(q);

      return matchYear && matchUnit && matchCode && matchEmp && matchQuery;
    });
  }, [requests, searchTerm, yearFilter, unitFilter, codeFilter, employeeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIdx, startIdx + itemsPerPage);

  const activeSelectedDetail = useMemo(() => {
    if (!selectedDetail) return null;
    return (
      requests.find((r) => (r.requestId || r.id) === (selectedDetail.requestId || selectedDetail.id)) ||
      selectedDetail
    );
  }, [requests, selectedDetail]);

  const handleCopyNumber = async (nomor: string, id: string) => {
    try {
      await navigator.clipboard.writeText(nomor);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const handleIssuedSuccess = (
    req: LetterNumberRequest,
    waResult: WhatsAppDispatchResult
  ) => {
    if (waResult.sent) {
      setBannerFeedback({
        type: 'success',
        message: `Nomor surat ${req.nomorSurat} berhasil diterbitkan dan notifikasi WhatsApp terkirim ke ${req.nomorWhatsapp}.`,
      });
    } else {
      setBannerFeedback({
        type: 'warning',
        message: `Nomor surat ${req.nomorSurat} berhasil diterbitkan, namun pengiriman WhatsApp gagal: ${
          waResult.error || 'Gateway belum terkonfigurasi.'
        } Gunakan tombol Kirim Ulang pada tabel riwayat.`,
      });
    }
    setActiveView('history');
  };

  const handleResendWa = async (req: LetterNumberRequest) => {
    const id = req.requestId || req.id || '';
    setResendingId(id);
    setBannerFeedback(null);
    try {
      const result = await resendWhatsAppNotification(req);
      if (result.sent) {
        setBannerFeedback({
          type: 'success',
          message: `Notifikasi WhatsApp untuk ${req.nomorSurat} berhasil dikirim ulang ke ${req.nomorWhatsapp}.`,
        });
      } else {
        setBannerFeedback({
          type: 'error',
          message: `Kirim ulang WhatsApp untuk ${req.nomorSurat} gagal: ${
            result.error || 'Gateway tidak merespons.'
          }`,
        });
      }
    } catch (err: any) {
      setBannerFeedback({
        type: 'error',
        message: err?.message || 'Gagal mengirim ulang notifikasi WhatsApp.',
      });
    } finally {
      setResendingId(null);
    }
  };

  const handleCancelRequest = async () => {
    if (!activeSelectedDetail) return;
    if (!cancelReason.trim()) return;
    setCancelling(true);
    try {
      await cancelLetterNumberRequest(activeSelectedDetail, cancelReason);
      setShowCancelPrompt(false);
      setCancelReason('');
      setBannerFeedback({
        type: 'warning',
        message: `Pengajuan ${activeSelectedDetail.nomorSurat} telah ditandai Dibatalkan. Nomor tetap terkunci dan tidak akan digunakan kembali.`,
      });
    } catch (err: any) {
      setBannerFeedback({
        type: 'error',
        message: err?.message || 'Gagal membatalkan pengajuan nomor surat.',
      });
    } finally {
      setCancelling(false);
    }
  };

  const exportExcel = () => {
    const rows = filteredRequests.map((r, idx) => ({
      No: idx + 1,
      'Nomor Surat': r.nomorSurat,
      'Nama Pengaju': r.namaPengaju,
      NIP: r.nip,
      Bidang: r.bidang,
      'Kode Surat': r.kodeSurat,
      'Kode Klasifikasi': r.kodeKlasifikasi,
      Unit: `${r.unitKode} (${r.unitLabel || LETTER_UNIT_LABELS[r.unitKode]})`,
      Tahun: r.tahun,
      'Tanggal Pengajuan': r.tanggalPengajuan,
      'Nomor WhatsApp': r.nomorWhatsapp,
      Perihal: r.perihal || '-',
      'Status Pengajuan': r.status,
      'Status Notifikasi WA': r.whatsappStatus,
      'WA Message ID': r.whatsappMessageId || '-',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Nomor Surat');
    XLSX.writeFile(wb, 'Riwayat_Nomor_Surat_SIMAP_UP_Kapuas.xlsx');
  };

  const exportPdf = () => {
    const docPdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    docPdf.setFontSize(13);
    docPdf.text('REKAPITULASI PENGAJUAN NOMOR SURAT & BERITA ACARA', 14, 15);
    docPdf.setFontSize(9);
    docPdf.text(
      `PT PLN Nusantara Power Unit Pembangkitan Kapuas · Dicetak ${new Date().toLocaleDateString('id-ID')}`,
      14,
      21
    );

    autoTable(docPdf, {
      startY: 26,
      head: [[
        'Nomor Surat',
        'Nama Pengaju',
        'NIP',
        'Bidang',
        'Kode',
        'Klasifikasi',
        'Unit',
        'Tahun',
        'Tanggal',
        'WhatsApp',
        'Status',
        'Status WA',
      ]],
      body: filteredRequests.map((r) => [
        r.nomorSurat,
        r.namaPengaju,
        r.nip,
        r.bidang,
        r.kodeSurat,
        r.kodeKlasifikasi,
        r.unitKode,
        String(r.tahun),
        r.tanggalPengajuan,
        r.nomorWhatsapp,
        r.status,
        r.whatsappStatus,
      ]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [0, 114, 188], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [244, 248, 251] },
    });

    docPdf.save('Riwayat_Nomor_Surat_SIMAP_UP_Kapuas.pdf');
  };

  return (
    <div className="space-y-6 pb-20">
      {!compactHeader ? (
        <PageHeader
          title="Pengajuan Nomor Surat & Berita Acara"
          subtitle="Layanan penomoran surat digital otomatis, berurutan, anti-duplikasi, dengan notifikasi WhatsApp otomatis"
          icon={FileCheck2}
          badge="PT PLN Nusantara Power UP Kapuas"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setActiveView('overview')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                    activeView === 'overview'
                      ? 'bg-white dark:bg-[#0E1A2E] text-[#0072BC] dark:text-[#72C8F1] shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-[#173B65]'
                  )}
                >
                  <BarChart3 size={14} />
                  Statistik &amp; Ringkasan
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('history')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                    activeView === 'history'
                      ? 'bg-white dark:bg-[#0E1A2E] text-[#0072BC] dark:text-[#72C8F1] shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-[#173B65]'
                  )}
                >
                  <ListChecks size={14} />
                  Riwayat ({requests.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="relative overflow-hidden inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0072BC] to-[#173B65] text-white text-xs font-extrabold hover:brightness-110 transition-all shadow-md"
              >
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-[#F9D423]" />
                <Plus size={15} className="text-[#F9D423]" />
                Ajukan Nomor Surat
              </button>
            </div>
          }
        />
      ) : (
        <div className="corporate-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0072BC] to-[#173B65] text-white flex items-center justify-center shrink-0">
              <FileCheck2 size={20} className="text-[#F9D423]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#173B65] dark:text-white">
                Pengajuan Nomor Surat &amp; Berita Acara
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Penomoran otomatis berurutan &amp; notifikasi WhatsApp resmi SIMAP UP Kapuas
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveView(activeView === 'overview' ? 'history' : 'overview')}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#173B65] dark:text-slate-200 hover:border-[#0072BC]"
            >
              {activeView === 'overview' ? `Lihat Riwayat (${requests.length})` : 'Lihat Statistik'}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="relative overflow-hidden inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0072BC] to-[#173B65] text-white text-xs font-bold shadow-sm"
            >
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-[#F9D423]" />
              <Plus size={15} className="text-[#F9D423]" />
              Ajukan Nomor Surat
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp Gateway Configuration Status Strip */}
      <div
        className={cn(
          'rounded-2xl px-4 py-3 border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs',
          gatewayStatus.configured
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300'
            : !gatewayStatus.backendAvailable
            ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300'
            : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300'
        )}
      >
        <div className="flex items-center gap-2.5">
          <MessageSquare size={16} className="shrink-0" />
          {gatewayStatus.configured ? (
            <span>
              <strong>WhatsApp Gateway Aktif</strong> ({gatewayStatus.provider?.toUpperCase()}): Notifikasi otomatis dikirim segera setelah nomor surat diterbitkan.
            </span>
          ) : !gatewayStatus.backendAvailable ? (
            <span>
              <strong>Layanan API WhatsApp Server Belum Aktif (404):</strong> Penerbitan nomor surat tetap aman &amp; atomik. Anda dapat mengirim notifikasi melalui tautan WhatsApp pada Detail Pengajuan, atau jalankan server full-stack (<code className="font-mono font-bold">npm run start</code>).
            </span>
          ) : (
            <span>
              <strong>Konfigurasi WhatsApp Gateway Diperlukan di Server Environment:</strong> Penerbitan nomor surat tetap berjalan normal &amp; atomik; untuk pengiriman WhatsApp otomatis, lengkapi <code className="font-mono font-bold">WHATSAPP_PHONE_NUMBER_ID</code> + <code className="font-mono font-bold">WHATSAPP_ACCESS_TOKEN</code> atau <code className="font-mono font-bold">WHATSAPP_GATEWAY_URL</code> + <code className="font-mono font-bold">WHATSAPP_GATEWAY_TOKEN</code>.
            </span>
          )}
        </div>
        <span className="shrink-0 font-bold text-[11px] uppercase tracking-wider">
          {gatewayStatus.configured
            ? 'Terhubung'
            : !gatewayStatus.backendAvailable
            ? 'API Tidak Terjangkau'
            : 'Mode Siaga'}
        </span>
      </div>

      {bannerFeedback && (
        <div
          role="status"
          className={cn(
            'p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs font-bold',
            bannerFeedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : bannerFeedback.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
              : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          )}
        >
          <div className="flex items-start gap-2.5">
            {bannerFeedback.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
            )}
            <span>{bannerFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/5 shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Nomor Diterbitkan"
          value={stats.totalIssued}
          subtitle={`${stats.activeCount} Aktif · ${stats.cancelledCount} Dibatalkan`}
          icon={FileCheck2}
          accent="blue"
          onClick={() => setActiveView('history')}
        />
        <MetricCard
          title="Pengajuan Bulan Ini"
          value={stats.monthCount}
          subtitle={`Tahun ${new Date().getFullYear()}: ${stats.currentYearCount} nomor`}
          icon={Calendar}
          accent="cyan"
        />
        <MetricCard
          title="Notifikasi WA Terkirim"
          value={stats.waSent}
          subtitle={`${stats.waFailed} Gagal · ${stats.waPending} Menunggu`}
          icon={MessageSquare}
          accent={stats.waFailed > 0 ? 'amber' : 'emerald'}
        />
        <MetricCard
          title="Unit Terlayani"
          value={stats.byUnit.filter((u) => u.count > 0).length}
          subtitle="Dari 5 unit UP & UL Kapuas"
          icon={Building2}
          accent="yellow"
        />
      </div>

      {activeView === 'overview' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Pengajuan Berdasarkan Unit */}
            <SectionCard
              title="Pengajuan Berdasarkan Unit"
              subtitle="Distribusi penerbitan nomor UPKS, ULSR, ULST, ULKP, ULSS"
              icon={Building2}
              className="lg:col-span-2"
            >
              {stats.totalIssued > 0 ? (
                <div className="h-[270px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.byUnit} margin={{ top: 10, right: 16, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
                      <XAxis
                        dataKey="code"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(114, 200, 241, 0.12)' }}
                        contentStyle={{
                          borderRadius: '14px',
                          border: '1px solid rgba(114,200,241,0.3)',
                          backgroundColor: '#173B65',
                          color: '#ffffff',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" name="Jumlah Nomor Surat" radius={[8, 8, 0, 0]} barSize={44}>
                        {stats.byUnit.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState
                  icon={Building2}
                  title="Belum ada pengajuan nomor surat"
                  description="Klik tombol Ajukan Nomor Surat untuk menerbitkan nomor pertama secara otomatis."
                />
              )}
            </SectionCard>

            {/* Chart 2: Jumlah Berdasarkan Kode Surat */}
            <SectionCard
              title="Berdasarkan Kode Surat"
              subtitle="Proporsi SKT, BA, BAPP, dan BATK"
              icon={FileText}
            >
              {stats.totalIssued > 0 ? (
                <div className="space-y-4">
                  <div className="h-[190px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.byCode.filter((c) => c.count > 0)}
                          dataKey="count"
                          nameKey="code"
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={76}
                          paddingAngle={4}
                          stroke="none"
                        >
                          {stats.byCode
                            .filter((c) => c.count > 0)
                            .map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: '#173B65',
                            color: '#ffffff',
                            fontSize: '12px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {stats.byCode.map((c, idx) => (
                      <div
                        key={c.code}
                        className="px-3 py-2 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                          />
                          <span className="text-xs font-extrabold text-[#173B65] dark:text-slate-200">
                            {c.code}
                          </span>
                        </div>
                        <span className="text-xs font-black text-[#0072BC] dark:text-[#72C8F1] tabular-nums">
                          {c.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="Belum ada data kode surat"
                  description="Distribusi kode surat akan tampil otomatis setelah pengajuan dibuat."
                />
              )}
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 3: Statistik Pengajuan per Tahun */}
            <SectionCard
              title="Statistik Pengajuan per Tahun"
              subtitle="Tren tahunan penerbitan nomor surat & reset nomor 001 per tahun baru"
              icon={Calendar}
            >
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.byYear} margin={{ top: 10, right: 12, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
                    <XAxis
                      dataKey="tahun"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        backgroundColor: '#173B65',
                        color: '#ffffff',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" name="Total Surat" fill="#0072BC" radius={[8, 8, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            {/* Recent Issued Preview */}
            <SectionCard
              title="Nomor Surat Terbaru Diterbitkan"
              subtitle="5 penerbitan nomor terakhir secara real-time"
              icon={Clock}
              className="lg:col-span-2"
              action={
                <button
                  type="button"
                  onClick={() => setActiveView('history')}
                  className="text-xs font-bold text-[#0072BC] dark:text-[#72C8F1] hover:underline"
                >
                  Lihat Semua Riwayat
                </button>
              }
            >
              {loading ? (
                <TableSkeleton rows={4} cols={4} />
              ) : requests.length === 0 ? (
                <EmptyState
                  icon={FileCheck2}
                  title="Belum Ada Nomor Surat Diterbitkan"
                  description="Mulai ajukan nomor surat atau berita acara pertama untuk UP Kapuas dan Unit Layanan."
                  action={
                    <button
                      type="button"
                      onClick={() => setFormOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0072BC] text-white text-xs font-bold"
                    >
                      <Plus size={14} /> Ajukan Sekarang
                    </button>
                  }
                />
              ) : (
                <div className="space-y-2.5">
                  {requests.slice(0, 5).map((r) => {
                    const waMeta = WHATSAPP_STATUS_META[r.whatsappStatus] || WHATSAPP_STATUS_META['Menunggu Pengiriman'];
                    const id = r.requestId || r.id || r.nomorSurat;
                    return (
                      <div
                        key={id}
                        className="p-3.5 rounded-xl bg-[#F8FBFD] dark:bg-[#0B172A] border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#72C8F1] transition-colors"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs sm:text-sm font-black text-[#0072BC] dark:text-[#72C8F1]">
                              {r.nomorSurat}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyNumber(r.nomorSurat, id)}
                              className="p-1 rounded-md text-slate-400 hover:text-[#0072BC] hover:bg-[#EAF6FC] dark:hover:bg-slate-800"
                              title="Salin Nomor Surat"
                            >
                              {copiedId === id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                            </button>
                            <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold', waMeta.badgeClass)}>
                              WA: {waMeta.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                            <strong>{r.namaPengaju}</strong> ({r.nip}) · {r.bidang} · {r.tanggalPengajuan}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {r.whatsappStatus === 'Gagal' && (
                            <button
                              type="button"
                              onClick={() => handleResendWa(r)}
                              disabled={resendingId === id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold hover:bg-amber-100"
                            >
                              <RefreshCw size={12} className={resendingId === id ? 'animate-spin' : ''} />
                              Kirim Ulang WA
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedDetail(r)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#173B65] dark:text-slate-200 hover:border-[#0072BC]"
                          >
                            <Eye size={13} />
                            Detail
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      ) : (
        /* History & Monitoring Table */
        <div className="corporate-card overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-[#F8FBFD] dark:bg-[#11223B]/50 space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari nomor surat, nama pegawai, NIP, bidang, atau WhatsApp..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={exportExcel}
                  disabled={filteredRequests.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:border-emerald-500 disabled:opacity-40"
                >
                  <FileSpreadsheet size={14} />
                  Export Excel
                </button>
                <button
                  type="button"
                  onClick={exportPdf}
                  disabled={filteredRequests.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400 text-xs font-bold hover:border-red-500 disabled:opacity-40"
                >
                  <FileText size={14} />
                  Export PDF
                </button>
              </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#0E1A2E] rounded-xl border border-slate-200 dark:border-slate-700">
                <Calendar size={14} className="text-[#0072BC] dark:text-[#72C8F1] shrink-0" />
                <select
                  value={yearFilter}
                  onChange={(e) => {
                    setYearFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-transparent text-xs font-bold text-[#173B65] dark:text-slate-200 outline-none"
                >
                  <option value="ALL" className="dark:bg-slate-900">Semua Tahun</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={String(y)} className="dark:bg-slate-900">
                      Tahun {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#0E1A2E] rounded-xl border border-slate-200 dark:border-slate-700">
                <Building2 size={14} className="text-[#0072BC] dark:text-[#72C8F1] shrink-0" />
                <select
                  value={unitFilter}
                  onChange={(e) => {
                    setUnitFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-transparent text-xs font-bold text-[#173B65] dark:text-slate-200 outline-none"
                >
                  <option value="ALL" className="dark:bg-slate-900">Semua Unit</option>
                  {LETTER_UNIT_OPTIONS.map((u) => (
                    <option key={u.code} value={u.code} className="dark:bg-slate-900">
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#0E1A2E] rounded-xl border border-slate-200 dark:border-slate-700">
                <Filter size={14} className="text-[#0072BC] dark:text-[#72C8F1] shrink-0" />
                <select
                  value={codeFilter}
                  onChange={(e) => {
                    setCodeFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-transparent text-xs font-bold text-[#173B65] dark:text-slate-200 outline-none"
                >
                  <option value="ALL" className="dark:bg-slate-900">Semua Kode Surat</option>
                  {LETTER_CODE_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code} className="dark:bg-slate-900">
                      {c.code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#0E1A2E] rounded-xl border border-slate-200 dark:border-slate-700">
                <User size={14} className="text-[#0072BC] dark:text-[#72C8F1] shrink-0" />
                <select
                  value={employeeFilter}
                  onChange={(e) => {
                    setEmployeeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-transparent text-xs font-bold text-[#173B65] dark:text-slate-200 outline-none"
                >
                  <option value="ALL" className="dark:bg-slate-900">Semua Nama Pegawai</option>
                  {applicantNameOptions.map((name) => (
                    <option key={name} value={name} className="dark:bg-slate-900">
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={6} cols={6} />
            </div>
          ) : paginatedRequests.length === 0 ? (
            <EmptyState
              icon={FileCheck2}
              title={requests.length === 0 ? 'Belum Ada Pengajuan Nomor Surat' : 'Data Tidak Ditemukan'}
              description={
                requests.length === 0
                  ? 'Ajukan nomor surat dan berita acara pertama untuk mulai mencatat riwayat terpusat.'
                  : 'Coba ubah filter tahun, unit, kode surat, atau kata kunci pencarian.'
              }
              action={
                <button
                  type="button"
                  onClick={() => setFormOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0072BC] text-white text-xs font-bold"
                >
                  <Plus size={14} /> Ajukan Nomor Surat
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1180px]">
                <thead>
                  <tr className="bg-[#F4F8FB] dark:bg-[#0B172A] border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4">Nomor Surat</th>
                    <th className="py-3.5 px-3">Nama Pengaju</th>
                    <th className="py-3.5 px-3">NIP</th>
                    <th className="py-3.5 px-3">Bidang</th>
                    <th className="py-3.5 px-3">Kode Surat</th>
                    <th className="py-3.5 px-3">Klasifikasi</th>
                    <th className="py-3.5 px-3">Unit</th>
                    <th className="py-3.5 px-3">Tahun</th>
                    <th className="py-3.5 px-3">Tgl Pengajuan</th>
                    <th className="py-3.5 px-3">No. WhatsApp</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3">Notifikasi WA</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {paginatedRequests.map((req) => {
                    const id = req.requestId || req.id || req.nomorSurat;
                    const statusMeta = LETTER_STATUS_META[req.status] || LETTER_STATUS_META.Diterbitkan;
                    const waMeta =
                      WHATSAPP_STATUS_META[req.whatsappStatus] ||
                      WHATSAPP_STATUS_META['Menunggu Pengiriman'];
                    return (
                      <tr
                        key={id}
                        className="hover:bg-[#EAF6FC]/40 dark:hover:bg-[#0072BC]/10 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-black text-[#0072BC] dark:text-[#72C8F1] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{req.nomorSurat}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyNumber(req.nomorSurat, id)}
                              className="p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-400 hover:text-[#0072BC]"
                              title="Salin Nomor Surat"
                            >
                              {copiedId === id ? (
                                <Check size={12} className="text-emerald-500" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-bold text-[#173B65] dark:text-slate-100">
                          {req.namaPengaju}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {req.nip}
                        </td>
                        <td className="py-3.5 px-3 text-[11px] text-slate-600 dark:text-slate-300 max-w-[190px] truncate" title={req.bidang}>
                          {req.bidang}
                        </td>
                        <td className="py-3.5 px-3 font-bold text-[#173B65] dark:text-slate-200">
                          {req.kodeSurat}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {req.kodeKlasifikasi}
                        </td>
                        <td className="py-3.5 px-3 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {req.unitKode}
                        </td>
                        <td className="py-3.5 px-3 tabular-nums font-semibold text-slate-600 dark:text-slate-300">
                          {req.tahun}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap tabular-nums text-slate-600 dark:text-slate-300">
                          {req.tanggalPengajuan}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px] whitespace-nowrap text-slate-600 dark:text-slate-300">
                          {req.nomorWhatsapp}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold',
                              statusMeta.badgeClass
                            )}
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full', statusMeta.dotClass)} />
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold',
                              waMeta.badgeClass
                            )}
                            title={req.whatsappError || ''}
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full', waMeta.dotClass)} />
                            {waMeta.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {req.whatsappStatus === 'Gagal' && (
                              <button
                                type="button"
                                onClick={() => handleResendWa(req)}
                                disabled={resendingId === id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold hover:bg-amber-100 disabled:opacity-50"
                                title="Kirim Ulang Notifikasi WhatsApp"
                              >
                                <RefreshCw size={12} className={resendingId === id ? 'animate-spin' : ''} />
                                Kirim Ulang
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDetail(req);
                                setShowCancelPrompt(false);
                                setCancelReason('');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] text-[11px] font-bold hover:brightness-95"
                            >
                              <Eye size={12} />
                              Detail
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredRequests.length > 0 && (
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F8FBFD] dark:bg-[#0B172A]/60">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                Menampilkan{' '}
                <span className="font-bold text-[#173B65] dark:text-slate-200">
                  {startIdx + 1}–{Math.min(startIdx + itemsPerPage, filteredRequests.length)}
                </span>{' '}
                dari{' '}
                <span className="font-bold text-[#173B65] dark:text-slate-200">
                  {filteredRequests.length}
                </span>{' '}
                pengajuan
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safePage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-[#0072BC] disabled:opacity-35"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="px-3 text-xs font-bold text-[#173B65] dark:text-slate-200 tabular-nums">
                    Hal {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-[#0072BC] disabled:opacity-35"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {activeSelectedDetail && (
        <div
          className="fixed inset-0 z-50 bg-[#071120]/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedDetail(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white dark:bg-[#0E1A2E] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto"
          >
            <div className="pln-gradient px-6 py-4 text-white flex items-center justify-between relative">
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-[#F9D423]" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#72C8F1]">
                  Detail Pengajuan Nomor Surat
                </p>
                <h3 className="text-base sm:text-lg font-mono font-black tracking-tight">
                  {activeSelectedDetail.nomorSurat}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Nama Pengaju</p>
                  <p className="font-bold text-[#173B65] dark:text-slate-100 mt-0.5">
                    {activeSelectedDetail.namaPengaju}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase text-slate-400">NIP</p>
                  <p className="font-mono font-bold text-[#173B65] dark:text-slate-100 mt-0.5">
                    {activeSelectedDetail.nip}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Bidang</p>
                  <p className="font-bold text-[#173B65] dark:text-slate-100 mt-0.5">
                    {activeSelectedDetail.bidang}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Unit &amp; Tahun</p>
                  <p className="font-bold text-[#173B65] dark:text-slate-100 mt-0.5">
                    {activeSelectedDetail.unitKode} ({activeSelectedDetail.unitLabel}) · {activeSelectedDetail.tahun}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Kode Surat / Klasifikasi</p>
                  <p className="font-bold text-[#173B65] dark:text-slate-100 mt-0.5">
                    {activeSelectedDetail.kodeSurat} / {activeSelectedDetail.kodeKlasifikasi}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Tanggal &amp; WhatsApp</p>
                  <p className="font-bold text-[#173B65] dark:text-slate-100 mt-0.5">
                    {activeSelectedDetail.tanggalPengajuan} ·{' '}
                    <span className="font-mono">{activeSelectedDetail.nomorWhatsapp}</span>
                  </p>
                </div>
              </div>

              {activeSelectedDetail.perihal && (
                <div className="p-3.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/50 text-xs">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Perihal / Keterangan</p>
                  <p className="font-semibold text-[#173B65] dark:text-slate-100 mt-0.5">
                    {activeSelectedDetail.perihal}
                  </p>
                </div>
              )}

              {/* WhatsApp Status & Log */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-[#173B65] dark:text-slate-100 flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-[#0072BC]" />
                    Status Pengiriman WhatsApp
                  </span>
                  <span
                    className={cn(
                      'px-2.5 py-0.5 rounded-md text-[10px] font-extrabold',
                      (WHATSAPP_STATUS_META[activeSelectedDetail.whatsappStatus] ||
                        WHATSAPP_STATUS_META['Menunggu Pengiriman']).badgeClass
                    )}
                  >
                    {activeSelectedDetail.whatsappStatus}
                  </span>
                </div>
                {activeSelectedDetail.whatsappMessageId && (
                  <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                    Gateway Message ID: {activeSelectedDetail.whatsappMessageId}
                  </p>
                )}
                {activeSelectedDetail.whatsappError && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold">
                    Catatan Gateway: {activeSelectedDetail.whatsappError}
                  </p>
                )}
                <pre className="text-[11px] font-sans whitespace-pre-wrap bg-[#F8FBFD] dark:bg-[#0B172A] p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  {buildWhatsAppPreviewMessage({
                    namaPengaju: activeSelectedDetail.namaPengaju,
                    nomorSurat: activeSelectedDetail.nomorSurat,
                    nip: activeSelectedDetail.nip,
                    bidang: activeSelectedDetail.bidang,
                    tanggalPengajuan: activeSelectedDetail.tanggalPengajuan,
                    unitLabel:
                      activeSelectedDetail.unitLabel ||
                      LETTER_UNIT_LABELS[activeSelectedDetail.unitKode],
                  })}
                </pre>
              </div>

              {activeSelectedDetail.status === 'Dibatalkan' && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300">
                  <p className="font-extrabold flex items-center gap-1.5">
                    <XCircle size={14} /> Pengajuan Dibatalkan (Nomor Tetap Terkunci)
                  </p>
                  <p className="mt-1">
                    Alasan: {activeSelectedDetail.cancellationReason || '-'}
                  </p>
                </div>
              )}

              {showCancelPrompt && (
                <div className="p-4 rounded-2xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 space-y-3">
                  <label className="block text-xs font-bold text-red-700 dark:text-red-300">
                    Alasan Pembatalan Pengajuan (Nomor {activeSelectedDetail.nomorSurat} tidak akan diterbitkan ulang)
                  </label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Tuliskan alasan pembatalan..."
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#0E1A2E] border border-red-300 dark:border-red-800 text-xs outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCancelPrompt(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={cancelling || !cancelReason.trim()}
                      onClick={handleCancelRequest}
                      className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50"
                    >
                      {cancelling ? 'Memproses...' : 'Konfirmasi Batalkan'}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  {activeSelectedDetail.status === 'Diterbitkan' &&
                    (canManage || activeSelectedDetail.createdByUid === user?.uid) &&
                    !showCancelPrompt && (
                      <button
                        type="button"
                        onClick={() => setShowCancelPrompt(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100"
                      >
                        <Ban size={14} />
                        Batalkan Pengajuan
                      </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {activeSelectedDetail.whatsappStatus === 'Gagal' && (
                    <>
                      <a
                        href={`https://wa.me/${activeSelectedDetail.nomorWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                          buildWhatsAppPreviewMessage({
                            namaPengaju: activeSelectedDetail.namaPengaju,
                            nomorSurat: activeSelectedDetail.nomorSurat,
                            nip: activeSelectedDetail.nip,
                            bidang: activeSelectedDetail.bidang,
                            tanggalPengajuan: activeSelectedDetail.tanggalPengajuan,
                            unitLabel:
                              activeSelectedDetail.unitLabel ||
                              LETTER_UNIT_LABELS[activeSelectedDetail.unitKode],
                          })
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                      >
                        <ExternalLink size={14} />
                        Kirim Manual via WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={() => handleResendWa(activeSelectedDetail)}
                        disabled={
                          resendingId === (activeSelectedDetail.requestId || activeSelectedDetail.id)
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 disabled:opacity-50"
                      >
                        <RefreshCw
                          size={14}
                          className={
                            resendingId === (activeSelectedDetail.requestId || activeSelectedDetail.id)
                              ? 'animate-spin'
                              : ''
                          }
                        />
                        Kirim Ulang Notifikasi WA
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedDetail(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-[#173B65] dark:text-slate-200"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <LetterNumberFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        employees={employees}
        defaultEmployee={defaultEmployee}
        getNextSequencePreview={getNextSequencePreview}
        onSubmit={submitLetterNumberRequest}
        onIssuedSuccess={handleIssuedSuccess}
      />
    </div>
  );
};

export default LetterNumberManagement;
