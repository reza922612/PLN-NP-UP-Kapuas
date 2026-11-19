import React, { useMemo, useState } from 'react';
import {
  Megaphone,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Power,
  Eye,
  BellRing,
  Clock,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';
import { useBroadcasts } from '../../hooks/useBroadcasts';
import { BroadcastAnnouncement, BroadcastPriority } from '../../types';
import {
  ConfirmDialog,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  TableSkeleton,
} from '../common/DashboardUI';
import { BroadcastToastCard } from '../common/BroadcastToastContainer';
import { cn } from '../../lib/utils';

const PRIORITY_OPTIONS: {
  value: BroadcastPriority;
  label: string;
  desc: string;
  badgeClass: string;
}[] = [
  {
    value: 'info',
    label: 'Info Umum',
    desc: 'Pemberitahuan rutin atau informasi operasional',
    badgeClass: 'bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1]',
  },
  {
    value: 'important',
    label: 'Penting',
    desc: 'Pengumuman prioritas dengan sorotan kuning PLN',
    badgeClass: 'bg-amber-50 dark:bg-[#F9D423]/15 text-amber-800 dark:text-[#F9D423]',
  },
  {
    value: 'urgent',
    label: 'Mendesak',
    desc: 'Peringatan segera dengan penanda merah mencolok',
    badgeClass: 'bg-red-50 dark:bg-red-950/70 text-red-700 dark:text-red-300',
  },
];

const formatDateTime = (ts: any): string => {
  try {
    const dt = ts?.toDate
      ? ts.toDate()
      : ts?.seconds
      ? new Date(ts.seconds * 1000)
      : null;
    if (!dt) return 'Baru saja';
    return format(dt, 'dd MMM yyyy, HH:mm', { locale: idLocale });
  } catch {
    return '-';
  }
};

const BroadcastManagement: React.FC = () => {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const {
    broadcasts,
    loading,
    createBroadcast,
    toggleBroadcastActive,
    deleteBroadcast,
  } = useBroadcasts({ enabled: isAdmin, includeInactive: true });

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<BroadcastPriority>('info');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BroadcastAnnouncement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const summary = useMemo(() => {
    const activeCount = broadcasts.filter((b) => b.isActive).length;
    return {
      total: broadcasts.length,
      active: activeCount,
      inactive: broadcasts.length - activeCount,
    };
  }, [broadcasts]);

  const filteredBroadcasts = useMemo(() => {
    if (statusFilter === 'active') return broadcasts.filter((b) => b.isActive);
    if (statusFilter === 'inactive') return broadcasts.filter((b) => !b.isActive);
    return broadcasts;
  }, [broadcasts, statusFilter]);

  const senderPreviewName =
    profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Administrator';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setFeedback({
        type: 'error',
        text: 'Judul dan isi pesan pengumuman wajib diisi sebelum mengirim broadcast.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      await createBroadcast({ title, message, priority });
      setTitle('');
      setMessage('');
      setPriority('info');
      setFeedback({
        type: 'success',
        text: 'Pengumuman broadcast berhasil dikirim dan akan tampil sebagai notifikasi toast saat seluruh akun pengguna login.',
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Gagal mengirim pengumuman broadcast. Silakan coba kembali.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (item: BroadcastAnnouncement) => {
    if (!item.id) return;
    setTogglingId(item.id);
    setFeedback(null);
    try {
      await toggleBroadcastActive(item);
      setFeedback({
        type: 'success',
        text: item.isActive
          ? `Pengumuman "${item.title}" dinonaktifkan.`
          : `Pengumuman "${item.title}" diaktifkan kembali untuk tampil saat login.`,
      });
      setTimeout(() => setFeedback(null), 3500);
    } catch {
      setFeedback({
        type: 'error',
        text: 'Gagal mengubah status pengumuman.',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setFeedback(null);
    try {
      await deleteBroadcast(confirmDelete);
      setFeedback({
        type: 'success',
        text: `Pengumuman "${confirmDelete.title}" berhasil dihapus.`,
      });
      setConfirmDelete(null);
      setTimeout(() => setFeedback(null), 3500);
    } catch {
      setFeedback({
        type: 'error',
        text: 'Gagal menghapus pengumuman broadcast.',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="corporate-card p-10 text-center space-y-3">
        <Megaphone size={28} className="mx-auto text-slate-400" />
        <h3 className="text-sm font-extrabold text-[#173B65] dark:text-slate-100">
          Akses Terbatas
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Modul pengiriman pengumuman broadcast hanya tersedia untuk Administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Pengumuman Broadcast"
        subtitle="Kirim pesan pengumuman resmi kepada seluruh akun terdaftar agar tampil otomatis sebagai notifikasi toast saat login"
        icon={Megaphone}
        badge={`${summary.active} Aktif`}
      />

      {feedback && (
        <div
          className={cn(
            'p-4 rounded-2xl border flex items-center gap-3 text-xs font-bold',
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-300'
          )}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={18} className="shrink-0" />
          ) : (
            <AlertTriangle size={18} className="shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Summary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total Pengumuman"
          value={summary.total}
          subtitle="Seluruh riwayat broadcast"
          icon={Megaphone}
          accent="blue"
          onClick={() => setStatusFilter('all')}
        />
        <MetricCard
          title="Broadcast Aktif"
          value={summary.active}
          subtitle="Ditampilkan saat pengguna login"
          icon={BellRing}
          accent="emerald"
          onClick={() => setStatusFilter('active')}
        />
        <MetricCard
          title="Nonaktif / Diarsipkan"
          value={summary.inactive}
          subtitle="Tidak lagi muncul saat login"
          icon={Power}
          accent="navy"
          onClick={() => setStatusFilter('inactive')}
        />
      </div>

      {/* Composer + Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <SectionCard
            title="Buat Pengumuman Broadcast Baru"
            subtitle="Pesan akan dikirim ke seluruh akun terdaftar (Super Admin, Admin, Viewer, & Pegawai)"
            icon={Send}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Judul Pengumuman
                  </label>
                  <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
                    {title.length}/140
                  </span>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={140}
                  placeholder="Contoh: Pemeliharaan Sistem & Pembaruan Data Sertifikasi Q4"
                  className="w-full px-4 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Tingkat Prioritas Tampilan
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {PRIORITY_OPTIONS.map((opt) => {
                    const selected = priority === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPriority(opt.value)}
                        className={cn(
                          'text-left p-3 rounded-xl border-2 transition-all space-y-1',
                          selected
                            ? 'border-[#0072BC] bg-[#EAF6FC]/50 dark:bg-[#0072BC]/15'
                            : 'border-slate-200 dark:border-slate-800 bg-[#F8FBFD] dark:bg-[#0B172A] hover:border-slate-300'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase',
                            opt.badgeClass
                          )}
                        >
                          {opt.label}
                        </span>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                          {opt.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Isi Pesan Broadcast
                  </label>
                  <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
                    {message.length}/1000
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={1000}
                  placeholder="Tulis pengumuman singkat, jelas, dan informatif untuk seluruh pegawai..."
                  className="w-full px-4 py-3 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none placeholder:text-slate-400 resize-y"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pengirim tercatat: <strong className="text-[#173B65] dark:text-slate-200">{senderPreviewName}</strong>
                </span>
                <button
                  type="submit"
                  disabled={submitting || !title.trim() || !message.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 pln-cta-gradient text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Kirim ke Semua Pengguna
                    </>
                  )}
                </button>
              </div>
            </form>
          </SectionCard>
        </div>

        <div className="lg:col-span-5">
          <SectionCard
            title="Pratinjau Notifikasi Toast"
            subtitle="Tampilan saat akun pengguna masuk ke aplikasi"
            icon={Eye}
          >
            <div className="p-4 rounded-2xl bg-[#F4F8FB] dark:bg-[#071120] border border-dashed border-slate-300 dark:border-slate-700">
              <BroadcastToastCard
                previewMode
                item={{
                  id: 'preview',
                  title: title.trim() || 'Contoh: Pembaruan Data SDM Semester II',
                  message:
                    message.trim() ||
                    'Mohon seluruh pegawai memeriksa kembali kelengkapan sertifikat kompetensi dan masa berlakunya melalui menu Data Sertifikasi.',
                  priority,
                  isActive: true,
                  senderUid: user?.uid || 'admin',
                  senderName: senderPreviewName,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }}
              />
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Broadcast History */}
      <div className="corporate-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 bg-[#F8FBFD] dark:bg-[#11223B]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#173B65] dark:text-slate-100">
              Riwayat Pengumuman Broadcast
            </h3>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Kelola status aktif atau hapus pengumuman yang sudah tidak relevan
            </p>
          </div>

          <div className="flex bg-white dark:bg-[#0E1A2E] p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'active', label: 'Aktif' },
              { id: 'inactive', label: 'Nonaktif' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as 'all' | 'active' | 'inactive')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                  statusFilter === tab.id
                    ? 'bg-[#0072BC] text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-[#173B65] dark:hover:text-slate-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : filteredBroadcasts.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="Belum ada pengumuman broadcast"
            description="Gunakan formulir di atas untuk mengirim pengumuman pertama kepada seluruh akun pengguna."
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredBroadcasts.map((item) => {
              const prio =
                PRIORITY_OPTIONS.find((p) => p.value === item.priority) || PRIORITY_OPTIONS[0];
              return (
                <div
                  key={item.id}
                  className={cn(
                    'p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors',
                    item.isActive
                      ? 'bg-white dark:bg-[#0E1A2E] hover:bg-[#F8FBFD] dark:hover:bg-[#11223B]/40'
                      : 'bg-slate-50/70 dark:bg-[#081222]/60 opacity-80'
                  )}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase',
                          prio.badgeClass
                        )}
                      >
                        {prio.label}
                      </span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[10px] font-bold',
                          item.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        )}
                      >
                        {item.isActive ? 'Aktif · Tampil saat Login' : 'Nonaktif'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                        <Clock size={11} />
                        {formatDateTime(item.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                        <User size={11} />
                        {item.senderName}
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-[#173B65] dark:text-slate-100">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                      {item.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={togglingId === item.id}
                      onClick={() => handleToggle(item)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-colors disabled:opacity-50',
                        item.isActive
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/70 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                      )}
                    >
                      {togglingId === item.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Power size={13} />
                      )}
                      <span>{item.isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmDelete(item)}
                      className="p-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                      title="Hapus Pengumuman"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Hapus Pengumuman Broadcast?"
        description={
          <span>
            Pengumuman <strong>{confirmDelete?.title}</strong> akan dihapus permanen dan tidak lagi
            muncul pada akun pengguna.
          </span>
        }
        confirmLabel="Ya, Hapus"
        loading={deleting}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDeleteConfirmed}
      />
    </div>
  );
};

export default BroadcastManagement;
