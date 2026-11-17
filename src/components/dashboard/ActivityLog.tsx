import React, { useMemo, useState } from 'react';
import {
  History,
  Search,
  Filter,
  PlusCircle,
  PencilLine,
  Trash2,
  Users,
  Building2,
  ShieldCheck,
  Clock,
  FileSpreadsheet,
  AlertCircle,
  Activity,
  Calendar,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, subDays, isAfter } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { useActivityLogs } from '../../hooks/useActivityLogs';
import { ActivityAction, ActivityEntityType, ActivityLog as ActivityLogType } from '../../types';
import { cn } from '../../lib/utils';
import {
  PageHeader,
  MetricCard,
  EmptyState,
  TableSkeleton,
} from '../common/DashboardUI';

const parseTimestamp = (ts: any): Date | null => {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
};

type DatePreset = 'ALL' | 'TODAY' | '7D' | '30D';

const ActivityLog: React.FC = () => {
  const { user, profile } = useAuth();
  const canRead = !!user && !!profile && profile.role !== 'employee';
  const { logs, loading, error } = useActivityLogs(canRead, 250);

  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<'ALL' | ActivityAction>('ALL');
  const [entityFilter, setEntityFilter] = useState<'ALL' | ActivityEntityType>('ALL');
  const [actorFilter, setActorFilter] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const actorOptions = useMemo(() => {
    const map = new Map<string, string>();
    logs.forEach((l) => {
      if (l.actorEmail) {
        map.set(l.actorEmail, l.actorName || l.actorEmail);
      }
    });
    return Array.from(map.entries()).map(([email, name]) => ({ email, name }));
  }, [logs]);

  const counts = useMemo(() => {
    return {
      total: logs.length,
      create: logs.filter((l) => l.action === 'CREATE').length,
      update: logs.filter((l) => l.action === 'UPDATE').length,
      delete: logs.filter((l) => l.action === 'DELETE').length,
    };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const now = new Date();
    const d7 = subDays(now, 7);
    const d30 = subDays(now, 30);

    return logs.filter((log) => {
      const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
      const matchesEntity = entityFilter === 'ALL' || log.entityType === entityFilter;
      const matchesActor = actorFilter === 'ALL' || log.actorEmail === actorFilter;

      let matchesDate = true;
      if (datePreset !== 'ALL') {
        const dt = parseTimestamp(log.createdAt);
        if (!dt) {
          matchesDate = false;
        } else if (datePreset === 'TODAY') {
          matchesDate = isToday(dt);
        } else if (datePreset === '7D') {
          matchesDate = isAfter(dt, d7);
        } else if (datePreset === '30D') {
          matchesDate = isAfter(dt, d30);
        }
      }

      const matchesQuery =
        !q ||
        log.entityName.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        log.actorEmail.toLowerCase().includes(q);

      return matchesAction && matchesEntity && matchesActor && matchesDate && matchesQuery;
    });
  }, [logs, searchTerm, actionFilter, entityFilter, actorFilter, datePreset]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * itemsPerPage;
  const currentLogs = filteredLogs.slice(startIdx, startIdx + itemsPerPage);

  const exportLogs = () => {
    const rows = filteredLogs.map((log) => {
      const dt = parseTimestamp(log.createdAt);
      return {
        Waktu: dt ? format(dt, 'dd/MM/yyyy HH:mm:ss') : '-',
        Aksi: log.action,
        Modul: log.entityType === 'employee' ? 'Pegawai' : log.entityType === 'unit' ? 'Unit' : 'Sistem',
        Objek: log.entityName,
        Deskripsi: log.description,
        Admin: log.actorName,
        Email: log.actorEmail,
        Role: log.actorRole || '-',
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Activity Log');
    XLSX.writeFile(wb, 'Activity_Log_SIMAP_PLN_NP_Kapuas.xlsx');
  };

  const getActionMeta = (action: ActivityAction) => {
    switch (action) {
      case 'CREATE':
        return {
          label: 'Tambah',
          icon: PlusCircle,
          badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
          iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
        };
      case 'UPDATE':
        return {
          label: 'Ubah',
          icon: PencilLine,
          badgeBg: 'bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1]',
          iconBg: 'bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1]',
        };
      case 'DELETE':
        return {
          label: 'Hapus',
          icon: Trash2,
          badgeBg: 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300',
          iconBg: 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400',
        };
    }
  };

  const getEntityMeta = (entityType: ActivityEntityType) => {
    switch (entityType) {
      case 'employee':
        return { label: 'Data Pegawai', icon: Users };
      case 'unit':
        return { label: 'Unit & Mesin', icon: Building2 };
      default:
        return { label: 'Sistem', icon: ShieldCheck };
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Activity Log &amp; Audit Trail"
        subtitle="Timeline riwayat perubahan data pegawai, unit pembangkit, dan konfigurasi akun secara real-time"
        icon={History}
        badge={`${filteredLogs.length} Rekaman`}
        actions={
          <button
            type="button"
            onClick={exportLogs}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold hover:border-emerald-500 transition-colors disabled:opacity-40"
          >
            <FileSpreadsheet size={15} />
            Export Excel
          </button>
        }
      />

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Aktivitas" value={counts.total} subtitle="Terekam dalam audit log" icon={Activity} accent="blue" />
        <MetricCard title="Penambahan" value={counts.create} subtitle="Aksi pembuatan data baru" icon={PlusCircle} accent="emerald" />
        <MetricCard title="Pembaruan" value={counts.update} subtitle="Aksi pemutakhiran data" icon={PencilLine} accent="cyan" />
        <MetricCard title="Penghapusan" value={counts.delete} subtitle="Aksi penghapusan data" icon={Trash2} accent="red" />
      </div>

      <div className="corporate-card overflow-hidden">
        {/* Multi-Filter Bar */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 bg-[#F8FBFD] dark:bg-[#11223B]/50 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Cari objek, deskripsi aktivitas, atau nama admin..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#0E1A2E] rounded-xl border border-slate-200 dark:border-slate-700">
                <Calendar size={14} className="text-[#0072BC] dark:text-[#72C8F1]" />
                <select
                  value={datePreset}
                  onChange={(e) => {
                    setDatePreset(e.target.value as DatePreset);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-bold text-[#173B65] dark:text-slate-200 outline-none"
                >
                  <option value="ALL" className="dark:bg-slate-900">Semua Tanggal</option>
                  <option value="TODAY" className="dark:bg-slate-900">Hari Ini</option>
                  <option value="7D" className="dark:bg-slate-900">7 Hari Terakhir</option>
                  <option value="30D" className="dark:bg-slate-900">30 Hari Terakhir</option>
                </select>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#0E1A2E] rounded-xl border border-slate-200 dark:border-slate-700">
                <UserCheck size={14} className="text-[#0072BC] dark:text-[#72C8F1]" />
                <select
                  value={actorFilter}
                  onChange={(e) => {
                    setActorFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-bold text-[#173B65] dark:text-slate-200 outline-none max-w-[180px]"
                >
                  <option value="ALL" className="dark:bg-slate-900">Semua Pengguna</option>
                  {actorOptions.map((a) => (
                    <option key={a.email} value={a.email} className="dark:bg-slate-900">
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#0E1A2E] rounded-xl border border-slate-200 dark:border-slate-700">
                <Filter size={14} className="text-[#0072BC] dark:text-[#72C8F1]" />
                <select
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-bold text-[#173B65] dark:text-slate-200 outline-none"
                >
                  <option value="ALL" className="dark:bg-slate-900">Semua Aksi</option>
                  <option value="CREATE" className="dark:bg-slate-900">Tambah (CREATE)</option>
                  <option value="UPDATE" className="dark:bg-slate-900">Ubah (UPDATE)</option>
                  <option value="DELETE" className="dark:bg-slate-900">Hapus (DELETE)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#0E1A2E] rounded-xl border border-slate-200 dark:border-slate-700">
                <Building2 size={14} className="text-[#0072BC] dark:text-[#72C8F1]" />
                <select
                  value={entityFilter}
                  onChange={(e) => {
                    setEntityFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-bold text-[#173B65] dark:text-slate-200 outline-none"
                >
                  <option value="ALL" className="dark:bg-slate-900">Semua Modul</option>
                  <option value="employee" className="dark:bg-slate-900">Data Pegawai</option>
                  <option value="unit" className="dark:bg-slate-900">Unit &amp; Mesin</option>
                  <option value="system" className="dark:bg-slate-900">Sistem</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="m-5 p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-bold">
            <AlertCircle size={18} />
            <span>Terjadi kendala saat memuat log aktivitas. Pastikan akun memiliki hak akses dashboard.</span>
          </div>
        )}

        {loading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : currentLogs.length === 0 ? (
          <EmptyState
            icon={History}
            title={logs.length === 0 ? 'Belum Ada Aktivitas Tercatat' : 'Tidak Ada Hasil Pencarian'}
            description={
              logs.length === 0
                ? 'Setiap penambahan, perubahan, atau penghapusan data pegawai dan unit akan otomatis tercatat di sini.'
                : 'Coba ubah filter tanggal, pengguna, atau jenis aktivitas untuk melihat riwayat lainnya.'
            }
          />
        ) : (
          <div className="p-6">
            <div className="relative pl-6 sm:pl-8 space-y-5 before:content-[''] before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
              {currentLogs.map((log: ActivityLogType, idx: number) => {
                const actionMeta = getActionMeta(log.action);
                const entityMeta = getEntityMeta(log.entityType);
                const ActionIcon = actionMeta.icon;
                const EntityIcon = entityMeta.icon;
                const dt = parseTimestamp(log.createdAt);

                return (
                  <motion.div
                    key={log.id || idx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.16, delay: Math.min(idx * 0.02, 0.16) }}
                    className="relative"
                  >
                    {/* Timeline Node */}
                    <div
                      className={cn(
                        'absolute -left-6 sm:-left-8 top-3 w-5 h-5 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center ring-4 ring-white dark:ring-[#0E1A2E]',
                        actionMeta.iconBg
                      )}
                    >
                      <ActionIcon size={13} />
                    </div>

                    <div className="p-4 rounded-xl bg-[#F8FBFD] dark:bg-[#0B172A] border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#72C8F1]/60 transition-colors">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase', actionMeta.badgeBg)}>
                            {actionMeta.label}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                            <EntityIcon size={11} />
                            {entityMeta.label}
                          </span>
                          <span className="text-xs font-extrabold text-[#173B65] dark:text-slate-100 truncate">
                            {log.entityName}
                          </span>
                        </div>

                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                          {log.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-medium">
                          <span className="font-bold text-[#173B65] dark:text-slate-300">{log.actorName}</span>
                          <span>· {log.actorEmail}</span>
                          {log.actorRole && (
                            <span className="px-1.5 py-0.5 rounded bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] text-[10px] font-bold uppercase">
                              {log.actorRole.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#173B65] dark:text-slate-200">
                          <Clock size={12} className="text-[#0072BC] dark:text-[#72C8F1]" />
                          {dt ? formatDistanceToNow(dt, { addSuffix: true, locale: idLocale }) : 'Baru'}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                          {dt ? format(dt, 'dd MMM yyyy · HH:mm') : '-'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination */}
        {filteredLogs.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F8FBFD] dark:bg-[#0B172A]/60">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
              Menampilkan{' '}
              <span className="font-bold text-[#173B65] dark:text-slate-200">
                {startIdx + 1}–{Math.min(startIdx + itemsPerPage, filteredLogs.length)}
              </span>{' '}
              dari{' '}
              <span className="font-bold text-[#173B65] dark:text-slate-200">
                {filteredLogs.length}
              </span>{' '}
              aktivitas
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
    </div>
  );
};

export default ActivityLog;
