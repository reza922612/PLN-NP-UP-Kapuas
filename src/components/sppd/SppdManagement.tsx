import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Loader2,
  MapPin,
  MessageSquare,
  Paperclip,
  Phone,
  Plane,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Employee, SppdRequest, SppdStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useSppd } from '../../hooks/useSppd';
import {
  SPPD_STATUS_META,
  SPPD_STATUS_OPTIONS,
  SPPD_UNIT_KERJA_OPTIONS,
} from '../../data/sppdConstants';
import { WHATSAPP_STATUS_META } from '../../data/letterConstants';
import {
  SIMAP_WHATSAPP_DISPLAY,
  SIMAP_WHATSAPP_NUMBER_LOCAL,
  buildSppdWhatsAppMessage,
  formatWhatsAppPhone,
  isValidIndonesianWhatsApp,
  toWaMeLink,
} from '../../data/whatsappConstants';
import {
  ConfirmDialog,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  TableSkeleton,
} from '../common/DashboardUI';
import SppdFormModal from './SppdFormModal';
import { StoredImage, StoredFileFrame } from '../common/StoredFileUI';
import { cn } from '../../lib/utils';

interface SppdManagementProps {
  employees?: Employee[];
  defaultEmployee?: Employee | null;
  canApprove?: boolean;
  compactTitle?: boolean;
}

const formatDateShort = (dateStr?: string): string => {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy', { locale: idLocale });
  } catch {
    return dateStr;
  }
};

const formatDuration = (start?: string, end?: string): string => {
  if (!start || !end) return '-';
  try {
    const diff = differenceInCalendarDays(parseISO(end), parseISO(start));
    return diff >= 0 ? `${diff + 1} hari` : '-';
  } catch {
    return '-';
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const SppdManagement: React.FC<SppdManagementProps> = ({
  employees = [],
  defaultEmployee = null,
  canApprove = false,
  compactTitle = false,
}) => {
  const { user, profile } = useAuth();
  const {
    requests,
    loading,
    sppdStats,
    gatewayStatus,
    saveSppdRequest,
    updateSppdStatus,
    sendSppdWhatsApp,
    deleteSppdRequest,
  } = useSppd(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SppdStatus>('ALL');
  const [unitFilter, setUnitFilter] = useState<string>('ALL');
  const [jenisFilter, setJenisFilter] = useState<string>('ALL');

  const [formOpen, setFormOpen] = useState(false);
  const [editingSppd, setEditingSppd] = useState<SppdRequest | null>(null);
  const [detailSppd, setDetailSppd] = useState<SppdRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SppdRequest | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [approvalNotes, setApprovalNotes] = useState('');
  const [detailWaPhone, setDetailWaPhone] = useState('+62');
  const [sendingWaId, setSendingWaId] = useState<string | null>(null);
  const [copiedWaId, setCopiedWaId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{
    name: string;
    url: string;
    isImage: boolean;
  } | null>(null);

  const [banner, setBanner] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    waTarget?: { phone: string; message: string; key: string };
  } | null>(null);

  const resolveSppdPhone = (item: SppdRequest): string => {
    if (item.nomorWhatsapp && isValidIndonesianWhatsApp(item.nomorWhatsapp)) {
      return formatWhatsAppPhone(item.nomorWhatsapp);
    }
    const matchedEmp = employees.find(
      (e) =>
        (item.employeeId && e.id === item.employeeId) ||
        (item.nip && e.nip === item.nip)
    );
    if (matchedEmp?.noTelepon && isValidIndonesianWhatsApp(matchedEmp.noTelepon)) {
      return formatWhatsAppPhone(matchedEmp.noTelepon);
    }
    return '';
  };

  const activeDetailSppd = useMemo(() => {
    if (!detailSppd?.id) return detailSppd;
    return requests.find((r) => r.id === detailSppd.id) || detailSppd;
  }, [detailSppd, requests]);

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (unitFilter !== 'ALL' && item.unitKerja !== unitFilter) return false;
      if (jenisFilter !== 'ALL' && item.jenisSppd !== jenisFilter) return false;
      if (!q) return true;
      return (
        item.requestNumber.toLowerCase().includes(q) ||
        item.namaPegawai.toLowerCase().includes(q) ||
        item.nip.toLowerCase().includes(q) ||
        item.judulPerjalanan.toLowerCase().includes(q) ||
        item.bidang.toLowerCase().includes(q) ||
        item.kotaTujuan.toLowerCase().includes(q) ||
        item.nomorPrk.toLowerCase().includes(q) ||
        item.nomorCoa.toLowerCase().includes(q)
      );
    });
  }, [requests, searchQuery, statusFilter, unitFilter, jenisFilter]);

  const canEditEntry = (item: SppdRequest): boolean => {
    const isEditableStatus = item.status === 'Draft' || item.status === 'Rejected';
    if (!isEditableStatus) return false;
    return item.applicantUid === user?.uid || profile?.role === 'super_admin' || profile?.role === 'admin';
  };

  const canDeleteEntry = (item: SppdRequest): boolean => {
    if (profile?.role === 'super_admin') return true;
    return item.status === 'Draft' && item.applicantUid === user?.uid;
  };

  const handleOpenCreate = () => {
    setEditingSppd(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (item: SppdRequest) => {
    setDetailSppd(null);
    setEditingSppd(item);
    setFormOpen(true);
  };

  const handleOpenDetail = (item: SppdRequest) => {
    setApprovalNotes(item.approvalNotes || '');
    setDetailWaPhone(resolveSppdPhone(item) || '+62');
    setDetailSppd(item);
  };

  const handleCopySppdWa = async (key: string, message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedWaId(key);
      setTimeout(() => setCopiedWaId(null), 2500);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleResendSppdWa = async (item: SppdRequest, overridePhone?: string) => {
    const rawTarget = (overridePhone ?? resolveSppdPhone(item)).trim();
    const formatted = formatWhatsAppPhone(rawTarget);
    if (!isValidIndonesianWhatsApp(formatted)) {
      setBanner({
        type: 'error',
        message: 'Nomor WhatsApp pengaju SPPD belum valid. Isi format +628xxxxxxxxxx terlebih dahulu.',
      });
      return;
    }
    const itemKey = item.id || item.requestNumber;
    setSendingWaId(itemKey);
    try {
      const waResult = await sendSppdWhatsApp(item, formatted);
      const waMsgText = buildSppdWhatsAppMessage(item);
      if (waResult.sent) {
        setBanner({
          type: 'success',
          message: `Notifikasi WhatsApp untuk ${item.requestNumber} berhasil dikirim dari SIMAP (${SIMAP_WHATSAPP_NUMBER_LOCAL}) ke ${formatted}.`,
        });
      } else {
        setBanner({
          type: 'warning',
          message: `Pengiriman otomatis WA untuk ${item.requestNumber} gagal (${waResult.error || 'Gateway belum aktif'}). Gunakan tombol WhatsApp Web di samping untuk mengirim dari nomor SIMAP.`,
          waTarget: { phone: formatted, message: waMsgText, key: itemKey },
        });
      }
    } finally {
      setSendingWaId(null);
    }
  };

  const handleStatusChange = async (newStatus: SppdStatus) => {
    if (!activeDetailSppd) return;
    if (newStatus === 'Rejected' && !approvalNotes.trim()) {
      setBanner({
        type: 'error',
        message: 'Mohon isi catatan alasan penolakan sebelum menolak pengajuan SPPD.',
      });
      return;
    }

    const fallbackPhone = isValidIndonesianWhatsApp(detailWaPhone)
      ? formatWhatsAppPhone(detailWaPhone)
      : resolveSppdPhone(activeDetailSppd) || undefined;

    setUpdatingStatus(true);
    try {
      const waResult = await updateSppdStatus({
        sppd: activeDetailSppd,
        newStatus,
        approvalNotes: approvalNotes.trim() || undefined,
        fallbackPhone,
      });

      const updatedMsg = buildSppdWhatsAppMessage({
        ...activeDetailSppd,
        status: newStatus,
        approvalNotes: approvalNotes.trim() || null,
      });

      if (waResult?.sent && fallbackPhone) {
        setBanner({
          type: 'success',
          message: `Status ${activeDetailSppd.requestNumber} diperbarui menjadi ${newStatus} & notifikasi WhatsApp SIMAP (${SIMAP_WHATSAPP_NUMBER_LOCAL}) terkirim ke ${fallbackPhone}.`,
        });
      } else if (fallbackPhone) {
        setBanner({
          type: 'warning',
          message: `Status ${activeDetailSppd.requestNumber} diperbarui menjadi ${newStatus}. Notifikasi WA otomatis tertunda (${waResult?.error || 'gunakan WhatsApp Web'}).`,
          waTarget: {
            phone: fallbackPhone,
            message: updatedMsg,
            key: activeDetailSppd.id || activeDetailSppd.requestNumber,
          },
        });
      } else {
        setBanner({
          type: 'success',
          message: `Status ${activeDetailSppd.requestNumber} berhasil diperbarui menjadi ${newStatus}.`,
        });
      }
      setDetailSppd(null);
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err?.message || 'Gagal memperbarui status pengajuan SPPD.',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSppdRequest(deleteTarget);
      setBanner({
        type: 'success',
        message: `Pengajuan ${deleteTarget.requestNumber} berhasil dihapus.`,
      });
      if (detailSppd?.id === deleteTarget.id) {
        setDetailSppd(null);
      }
      setDeleteTarget(null);
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err?.message || 'Gagal menghapus pengajuan SPPD.',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title={compactTitle ? 'Pengajuan SPPD Saya' : 'Pengajuan & Monitoring SPPD'}
        subtitle="Kelola pengajuan Surat Perjalanan Dinas, dokumen pendukung, serta status persetujuan secara digital"
        icon={Plane}
        badge="SIMAP E-SPPD"
        actions={
          <button
            type="button"
            onClick={handleOpenCreate}
            className="relative overflow-hidden inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0072BC] to-[#173B65] text-white rounded-xl text-xs font-bold hover:brightness-110 transition-all shadow-md"
          >
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-[#F9D423]" />
            <Plus size={15} className="text-[#F9D423]" />
            Ajukan SPPD Baru
          </button>
        }
      />

      {/* Official SIMAP WhatsApp Sender Strip */}
      <div
        className={cn(
          'rounded-2xl px-4 py-3 border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs',
          gatewayStatus.configured
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300'
            : 'bg-[#EAF6FC]/70 dark:bg-[#0072BC]/15 border-[#72C8F1]/40 dark:border-[#0072BC]/40 text-[#173B65] dark:text-slate-200'
        )}
      >
        <div className="flex items-center gap-2.5">
          <MessageSquare size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            <strong>Nomor WhatsApp Resmi SIMAP ({SIMAP_WHATSAPP_DISPLAY}):</strong>{' '}
            {gatewayStatus.configured
              ? `Gateway ${gatewayStatus.provider?.toUpperCase()} aktif — notifikasi status SPPD otomatis dikirim ke Pengaju SPPD.`
              : 'Notifikasi pengaju SPPD siap dikirim otomatis melalui WhatsApp API server atau 1-klik WhatsApp Web di Detail Pengajuan.'}
          </span>
        </div>
        <span className="shrink-0 font-bold text-[11px] uppercase tracking-wider text-[#0072BC] dark:text-[#72C8F1]">
          {gatewayStatus.configured ? 'Gateway Terhubung' : `Pengirim: ${SIMAP_WHATSAPP_NUMBER_LOCAL}`}
        </span>
      </div>

      {banner && (
        <div
          role="status"
          className={cn(
            'p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold',
            banner.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
              : banner.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300'
              : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300'
          )}
        >
          <div className="flex items-center gap-2.5">
            {banner.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0" />
            ) : (
              <AlertCircle size={16} className="shrink-0" />
            )}
            <span>{banner.message}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {banner.waTarget && (
              <>
                <a
                  href={toWaMeLink(banner.waTarget.phone, banner.waTarget.message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700"
                >
                  <ExternalLink size={12} />
                  Kirim via WhatsApp Web
                </a>
                <button
                  type="button"
                  onClick={() => handleCopySppdWa(banner.waTarget!.key, banner.waTarget!.message)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#173B65] dark:text-slate-100 text-[11px] font-bold"
                >
                  {copiedWaId === banner.waTarget.key ? (
                    <>
                      <Check size={12} className="text-emerald-600" />
                      Disalin
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      Salin Pesan
                    </>
                  )}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Tutup Notifikasi"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Pengajuan"
          value={sppdStats.total}
          subtitle="Seluruh data SPPD tercatat"
          icon={Plane}
          accent="blue"
        />
        <MetricCard
          title="Menunggu Approval"
          value={sppdStats.pending}
          subtitle="Submitted & dalam tinjauan"
          icon={Clock}
          accent="yellow"
        />
        <MetricCard
          title="Disetujui / Selesai"
          value={sppdStats.approved + sppdStats.completed}
          subtitle={`${sppdStats.approved} Approved · ${sppdStats.completed} Completed`}
          icon={CheckCircle2}
          accent="emerald"
        />
        <MetricCard
          title="Draft & Ditolak"
          value={sppdStats.draft + sppdStats.rejected}
          subtitle={`${sppdStats.draft} Draft · ${sppdStats.rejected} Rejected`}
          icon={FileText}
          accent={sppdStats.rejected > 0 ? 'amber' : 'navy'}
        />
      </div>

      {/* Filters & Search */}
      <SectionCard
        title="Daftar Pengajuan Surat Perjalanan Dinas"
        subtitle={`${filteredRequests.length} dari ${requests.length} pengajuan ditampilkan`}
        icon={Filter}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6 relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari No. SPPD, nama pegawai, NIP, tujuan, PRK/COA..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
              />
            </div>

            <div className="md:col-span-3">
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
              >
                <option value="ALL">Semua Unit Kerja</option>
                {SPPD_UNIT_KERJA_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                value={jenisFilter}
                onChange={(e) => setJenisFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
              >
                <option value="ALL">Semua Jenis SPPD</option>
                <option value="SPPD Diklat">SPPD Diklat</option>
                <option value="SPPD Non Diklat">SPPD Non Diklat</option>
              </select>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pb-1">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors',
                statusFilter === 'ALL'
                  ? 'bg-[#0072BC] text-white'
                  : 'bg-[#F4F8FB] dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#EAF6FC]'
              )}
            >
              Semua ({requests.length})
            </button>
            {SPPD_STATUS_OPTIONS.map((status) => {
              const count = requests.filter((r) => r.status === status).length;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1.5',
                    statusFilter === status
                      ? 'bg-[#173B65] text-white'
                      : 'bg-[#F4F8FB] dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#EAF6FC]'
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', SPPD_STATUS_META[status].dotClass)} />
                  {status} ({count})
                </button>
              );
            })}
          </div>

          {/* Data List */}
          {loading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              icon={Plane}
              title="Belum ada data pengajuan SPPD"
              description={
                requests.length === 0
                  ? 'Klik tombol "Ajukan SPPD Baru" untuk membuat pengajuan perjalanan dinas pertama.'
                  : 'Tidak ditemukan pengajuan SPPD yang sesuai dengan filter pencarian.'
              }
              action={
                requests.length === 0 ? (
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#0072BC] text-white rounded-xl text-xs font-bold hover:bg-[#173B65] transition-colors"
                  >
                    <Plus size={14} />
                    Buat Pengajuan SPPD
                  </button>
                ) : undefined
              }
            />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FBFD] dark:bg-[#0B172A] border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-3.5 px-4">No. Pengajuan &amp; Pegawai</th>
                      <th className="py-3.5 px-4">Unit &amp; Bidang</th>
                      <th className="py-3.5 px-4">Maksud Perjalanan &amp; Rute</th>
                      <th className="py-3.5 px-4">Tanggal &amp; PRK/COA</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                    {filteredRequests.map((item) => {
                      const meta = SPPD_STATUS_META[item.status] || SPPD_STATUS_META.Submitted;
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-[#EAF6FC]/40 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 align-top">
                            <p className="font-mono font-bold text-[11px] text-[#0072BC] dark:text-[#72C8F1]">
                              {item.requestNumber}
                            </p>
                            <p className="font-bold text-[#173B65] dark:text-slate-100 mt-0.5">
                              {item.namaPegawai}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">{item.nip}</p>
                          </td>
                          <td className="py-3.5 px-4 align-top max-w-[200px]">
                            <p className="font-bold text-[#173B65] dark:text-slate-200">
                              {item.unitKerja}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                              {item.bidang}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 align-top max-w-[260px]">
                            <p className="font-bold text-[#173B65] dark:text-slate-100 line-clamp-2">
                              {item.judulPerjalanan}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                              <MapPin size={12} className="text-[#0072BC] shrink-0" />
                              <span className="truncate">
                                {item.kotaKeberangkatan} → {item.kotaTujuan}
                              </span>
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {item.jenisSppd} · {item.jenisTransportasi}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 align-top whitespace-nowrap">
                            <p className="font-semibold text-[#173B65] dark:text-slate-200">
                              {formatDateShort(item.tanggalKeberangkatan)}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              s.d. {formatDateShort(item.tanggalKembali)} (
                              {formatDuration(item.tanggalKeberangkatan, item.tanggalKembali)})
                            </p>
                            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                              PRK: {item.nomorPrk} · COA: {item.nomorCoa}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 align-top">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap',
                                meta.badgeClass
                              )}
                            >
                              <span className={cn('w-1.5 h-1.5 rounded-full', meta.dotClass)} />
                              {meta.label}
                            </span>
                            {item.whatsappStatus && (
                              <span
                                className={cn(
                                  'mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold',
                                  (WHATSAPP_STATUS_META[item.whatsappStatus] ||
                                    WHATSAPP_STATUS_META['Menunggu Pengiriman']).badgeClass
                                )}
                              >
                                <MessageSquare size={10} />
                                WA: {item.whatsappStatus}
                              </span>
                            )}
                            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                              <Paperclip size={11} />
                              {item.dokumenPendukung?.length || 0} lampiran
                            </p>
                          </td>
                          <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenDetail(item)}
                                title="Lihat Detail & Lampiran"
                                className="p-2 rounded-lg text-[#0072BC] dark:text-[#72C8F1] hover:bg-[#EAF6FC] dark:hover:bg-slate-800 transition-colors"
                              >
                                <Eye size={15} />
                              </button>
                              {canEditEntry(item) && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(item)}
                                  title="Edit Pengajuan"
                                  className="p-2 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                                >
                                  <Edit3 size={15} />
                                </button>
                              )}
                              {canDeleteEntry(item) && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(item)}
                                  title="Hapus Pengajuan"
                                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                >
                                  <Trash2 size={15} />
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

              {/* Mobile / Tablet Card List */}
              <div className="lg:hidden space-y-3">
                {filteredRequests.map((item) => {
                  const meta = SPPD_STATUS_META[item.status] || SPPD_STATUS_META.Submitted;
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-[#F8FBFD] dark:bg-[#0B172A] border border-slate-200/80 dark:border-slate-800 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-mono font-bold text-[#0072BC] dark:text-[#72C8F1]">
                            {item.requestNumber}
                          </p>
                          <p className="text-sm font-extrabold text-[#173B65] dark:text-slate-100">
                            {item.namaPegawai}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {item.nip} · {item.unitKerja}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold shrink-0',
                            meta.badgeClass
                          )}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full', meta.dotClass)} />
                          {meta.label}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <p className="font-bold text-[#173B65] dark:text-slate-200">
                          {item.judulPerjalanan}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.kotaKeberangkatan} → {item.kotaTujuan} · {item.jenisTransportasi}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {formatDateShort(item.tanggalKeberangkatan)} –{' '}
                          {formatDateShort(item.tanggalKembali)} (
                          {formatDuration(item.tanggalKeberangkatan, item.tanggalKembali)})
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Paperclip size={12} />
                          {item.dokumenPendukung?.length || 0} dokumen
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] text-[11px] font-bold"
                          >
                            <Eye size={13} /> Detail
                          </button>
                          {canEditEntry(item) && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold"
                            >
                              <Edit3 size={13} /> Edit
                            </button>
                          )}
                          {canDeleteEntry(item) && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                              aria-label="Hapus"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </SectionCard>

      {/* SPPD Detail & Approval Modal */}
      {activeDetailSppd && (
        <div
          className="fixed inset-0 z-50 bg-[#071120]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-[#0E1A2E] w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="bg-gradient-to-r from-[#173B65] to-[#0072BC] px-6 py-4 text-white flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <p className="text-[11px] font-mono text-[#F9D423] font-bold">
                  {activeDetailSppd.requestNumber} · {activeDetailSppd.jenisSppd}
                </p>
                <h3 className="text-base font-extrabold truncate">
                  {activeDetailSppd.judulPerjalanan}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailSppd(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Status Strip */}
              <div className="p-4 rounded-2xl bg-[#F4F8FB] dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold',
                      SPPD_STATUS_META[activeDetailSppd.status]?.badgeClass
                    )}
                  >
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        SPPD_STATUS_META[activeDetailSppd.status]?.dotClass
                      )}
                    />
                    {activeDetailSppd.status}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    {SPPD_STATUS_META[activeDetailSppd.status]?.description}
                  </span>
                </div>
                {activeDetailSppd.approvedByName && (
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Ditinjau oleh:{' '}
                    <strong className="text-[#173B65] dark:text-white">
                      {activeDetailSppd.approvedByName}
                    </strong>
                  </span>
                )}
              </div>

              {activeDetailSppd.approvalNotes && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200">
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5">
                    Catatan Approval / Penolakan
                  </p>
                  <p className="font-medium">{activeDetailSppd.approvalNotes}</p>
                </div>
              )}

              {/* Detail Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#0072BC] dark:text-[#72C8F1] flex items-center gap-1.5">
                    <User size={13} /> Data Pegawai &amp; Unit Kerja
                  </p>
                  <div className="space-y-1.5">
                    <p>
                      <span className="text-slate-400">Nama:</span>{' '}
                      <strong className="text-[#173B65] dark:text-white">
                        {activeDetailSppd.namaPegawai}
                      </strong>
                    </p>
                    <p>
                      <span className="text-slate-400">NIP:</span>{' '}
                      <strong className="font-mono text-[#173B65] dark:text-white">
                        {activeDetailSppd.nip}
                      </strong>
                    </p>
                    <p>
                      <span className="text-slate-400">Jabatan:</span>{' '}
                      <strong className="text-[#173B65] dark:text-white">
                        {activeDetailSppd.jabatan}
                      </strong>
                    </p>
                    <p>
                      <span className="text-slate-400">Bidang:</span>{' '}
                      <strong className="text-[#173B65] dark:text-white">
                        {activeDetailSppd.bidang}
                      </strong>
                    </p>
                    <p>
                      <span className="text-slate-400">Unit Kerja:</span>{' '}
                      <strong className="text-[#173B65] dark:text-white">
                        {activeDetailSppd.unitKerja}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#0072BC] dark:text-[#72C8F1] flex items-center gap-1.5">
                    <Calendar size={13} /> Jadwal, Anggaran &amp; Transportasi
                  </p>
                  <div className="space-y-1.5">
                    <p>
                      <span className="text-slate-400">Berangkat – Kembali:</span>{' '}
                      <strong className="text-[#173B65] dark:text-white">
                        {formatDateShort(activeDetailSppd.tanggalKeberangkatan)} –{' '}
                        {formatDateShort(activeDetailSppd.tanggalKembali)} (
                        {formatDuration(
                          activeDetailSppd.tanggalKeberangkatan,
                          activeDetailSppd.tanggalKembali
                        )}
                        )
                      </strong>
                    </p>
                    <p>
                      <span className="text-slate-400">Nomor PRK / COA:</span>{' '}
                      <strong className="font-mono text-[#173B65] dark:text-white">
                        {activeDetailSppd.nomorPrk} / {activeDetailSppd.nomorCoa}
                      </strong>
                    </p>
                    <p>
                      <span className="text-slate-400">Transportasi:</span>{' '}
                      <strong className="text-[#173B65] dark:text-white">
                        {activeDetailSppd.jenisTransportasi}
                      </strong>
                    </p>
                    <p>
                      <span className="text-slate-400">Rute Kota:</span>{' '}
                      <strong className="text-[#173B65] dark:text-white">
                        {activeDetailSppd.kotaKeberangkatan} → {activeDetailSppd.kotaTujuan}
                      </strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Supporting Documents */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#173B65] dark:text-slate-200 flex items-center gap-1.5">
                  <Paperclip size={13} className="text-[#0072BC]" />
                  Dokumen Pendukung ({activeDetailSppd.dokumenPendukung?.length || 0})
                </p>
                {(activeDetailSppd.dokumenPendukung?.length || 0) === 0 ? (
                  <p className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-400 text-center">
                    Tidak ada lampiran dokumen pada pengajuan ini.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeDetailSppd.dokumenPendukung.map((att) => {
                      const isImg = att.type?.startsWith('image/');
                      return (
                        <button
                          key={att.id}
                          type="button"
                          onClick={() =>
                            setPreviewDoc({ name: att.name, url: att.url, isImage: isImg })
                          }
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#0072BC] bg-[#F8FBFD] dark:bg-[#0B172A] flex items-center justify-between gap-3 text-left transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center shrink-0">
                              <FileText size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-[#173B65] dark:text-slate-100 truncate">
                                {att.name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {formatFileSize(att.size)} · Klik untuk pratinjau
                              </p>
                            </div>
                          </div>
                          <Eye size={15} className="text-[#0072BC] shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* WhatsApp Notification Panel (Sender: SIMAP 085111320701) */}
              {(() => {
                const effectiveWaPhone = isValidIndonesianWhatsApp(detailWaPhone)
                  ? formatWhatsAppPhone(detailWaPhone)
                  : resolveSppdPhone(activeDetailSppd);
                const sppdWaMessage = buildSppdWhatsAppMessage({
                  ...activeDetailSppd,
                  approvalNotes: approvalNotes.trim() || activeDetailSppd.approvalNotes,
                });
                const sppdKey = activeDetailSppd.id || activeDetailSppd.requestNumber;
                const waMeta = activeDetailSppd.whatsappStatus
                  ? WHATSAPP_STATUS_META[activeDetailSppd.whatsappStatus] ||
                    WHATSAPP_STATUS_META['Menunggu Pengiriman']
                  : null;

                return (
                  <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                          <MessageSquare size={13} />
                          Notifikasi WhatsApp Pengaju SPPD
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Pengirim Resmi SIMAP: <strong className="font-mono">{SIMAP_WHATSAPP_DISPLAY}</strong>
                        </p>
                      </div>
                      {waMeta && (
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-md text-[10px] font-extrabold',
                            waMeta.badgeClass
                          )}
                        >
                          WA: {activeDetailSppd.whatsappStatus}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="relative flex-1">
                        <Phone
                          size={13}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400"
                        />
                        <input
                          type="tel"
                          value={detailWaPhone}
                          onChange={(e) => setDetailWaPhone(e.target.value)}
                          onBlur={() => {
                            if (detailWaPhone.trim()) {
                              setDetailWaPhone(formatWhatsAppPhone(detailWaPhone));
                            }
                          }}
                          placeholder="+6281234567890"
                          className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-[#0B172A] border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={sendingWaId === sppdKey || !effectiveWaPhone}
                        onClick={() => handleResendSppdWa(activeDetailSppd, detailWaPhone)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0072BC] text-white text-[11px] font-bold hover:bg-[#173B65] disabled:opacity-50"
                      >
                        {sendingWaId === sppdKey ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <RefreshCw size={13} />
                        )}
                        Kirim WA Otomatis
                      </button>

                      {effectiveWaPhone && (
                        <a
                          href={toWaMeLink(effectiveWaPhone, sppdWaMessage)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700"
                        >
                          <ExternalLink size={13} />
                          WhatsApp Web
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopySppdWa(sppdKey, sppdWaMessage)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#0B172A] border border-slate-200 dark:border-slate-700 text-[#173B65] dark:text-slate-200 text-[11px] font-bold hover:border-[#0072BC]"
                      >
                        {copiedWaId === sppdKey ? (
                          <>
                            <Check size={13} className="text-emerald-500" />
                            Disalin
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            Salin Pesan
                          </>
                        )}
                      </button>
                    </div>

                    {activeDetailSppd.whatsappError && (
                      <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold">
                        Catatan Gateway: {activeDetailSppd.whatsappError}
                      </p>
                    )}

                    <pre className="text-[11px] font-sans whitespace-pre-wrap bg-white/80 dark:bg-[#0B172A]/80 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-slate-600 dark:text-slate-300 max-h-36 overflow-y-auto">
                      {sppdWaMessage}
                    </pre>
                  </div>
                );
              })()}

              {/* Admin / Super Admin Approval Workflow Controls */}
              {canApprove && (
                <div className="p-4 rounded-2xl bg-[#EAF6FC]/60 dark:bg-[#0072BC]/10 border border-[#72C8F1]/40 space-y-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#173B65] dark:text-[#72C8F1] flex items-center gap-1.5">
                    <Briefcase size={13} /> Tindakan Persetujuan Administrasi SPPD
                  </p>
                  <textarea
                    rows={2}
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    maxLength={512}
                    placeholder="Tambahkan catatan persetujuan atau alasan penolakan (wajib jika menolak)..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0B172A] border border-slate-200 dark:border-slate-700 text-xs font-medium text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => handleStatusChange('Approved')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {updatingStatus ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Setujui (Approved)
                    </button>
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => handleStatusChange('Rejected')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={14} />
                      Tolak (Rejected)
                    </button>
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => handleStatusChange('Completed')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#173B65] text-white font-bold hover:bg-[#0072BC] transition-colors disabled:opacity-50"
                    >
                      <Building2 size={14} />
                      Tandai Selesai (Completed)
                    </button>
                    {activeDetailSppd.status === 'Submitted' && (
                      <button
                        type="button"
                        disabled={updatingStatus}
                        onClick={() => handleStatusChange('Menunggu Approval')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
                      >
                        <Clock size={14} />
                        Tinjau (Menunggu Approval)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-[#F8FBFD] dark:bg-[#0B172A] flex items-center justify-between gap-2">
              <div>
                {canEditEntry(activeDetailSppd) && (
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(activeDetailSppd)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] text-xs font-bold hover:bg-[#72C8F1]/25 transition-colors"
                  >
                    <Edit3 size={14} />
                    {activeDetailSppd.status === 'Rejected' ? 'Perbaiki & Ajukan Ulang' : 'Edit Draft'}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetailSppd(null)}
                className="px-4 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Lightbox */}
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
                Pratinjau Dokumen: {previewDoc.name}
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

      {/* Create / Edit Modal */}
      <SppdFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingSppd(null);
        }}
        onSave={saveSppdRequest}
        employees={employees}
        defaultEmployee={defaultEmployee}
        initialSppd={editingSppd}
        onSavedSuccess={(status, title) => {
          setBanner({
            type: 'success',
            message:
              status === 'Draft'
                ? `Draft SPPD "${title}" berhasil disimpan.`
                : `Pengajuan SPPD "${title}" berhasil dikirim dan berstatus Menunggu Approval.`,
          });
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Pengajuan SPPD?"
        description={
          <span>
            Anda yakin ingin menghapus pengajuan{' '}
            <strong>{deleteTarget?.requestNumber}</strong> ({deleteTarget?.judulPerjalanan})?
            Tindakan ini tidak dapat dibatalkan.
          </span>
        }
        confirmLabel="Ya, Hapus Pengajuan"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default SppdManagement;
