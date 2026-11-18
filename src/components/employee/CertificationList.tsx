import React, { useMemo, useState } from 'react';
import {
  Award,
  Search,
  Calendar,
  User,
  Building2,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  LayoutGrid,
  Table as TableIcon,
  Filter,
  BellRing,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useEmployees } from '../../hooks/useEmployees';
import { cn } from '../../lib/utils';
import { format, parseISO } from 'date-fns';
import {
  PageHeader,
  MetricCard,
  EmptyState,
  TableSkeleton,
  CardGridSkeleton,
} from '../common/DashboardUI';
import {
  CertificationStatusType,
  extractEvaluatedCertifications,
} from '../../lib/certificationStatus';

const CertificationList: React.FC = () => {
  const { employees, loading } = useEmployees();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'warning' | 'expired'>('all');
  const [filterCertType, setFilterCertType] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [reminderExpanded, setReminderExpanded] = useState(true);

  const allCertifications = useMemo(
    () => extractEvaluatedCertifications(employees),
    [employees]
  );

  const certTypes = useMemo(() => {
    const set = new Set<string>();
    allCertifications.forEach((c) => c.namaSertifikasi && set.add(c.namaSertifikasi));
    return Array.from(set).sort();
  }, [allCertifications]);

  const expiringWithin30Days = useMemo(
    () => allCertifications.filter((c) => c.statusType === 'warning'),
    [allCertifications]
  );

  const summary = useMemo(() => {
    return {
      total: allCertifications.length,
      active: allCertifications.filter((c) => c.statusType === 'active').length,
      warning: expiringWithin30Days.length,
      expired: allCertifications.filter((c) => c.statusType === 'expired').length,
    };
  }, [allCertifications, expiringWithin30Days.length]);

  const filteredCerts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allCertifications.filter((cert) => {
      const matchesSearch =
        !q ||
        cert.namaSertifikasi.toLowerCase().includes(q) ||
        cert.employeeName.toLowerCase().includes(q) ||
        cert.employeeNip.toLowerCase().includes(q) ||
        cert.unit.toLowerCase().includes(q);
      const matchesStatus = filterStatus === 'all' || cert.statusType === filterStatus;
      const matchesType = filterCertType === 'ALL' || cert.namaSertifikasi === filterCertType;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [allCertifications, searchTerm, filterStatus, filterCertType]);

  const formatCountdownText = (daysLeft: number | null) => {
    if (daysLeft === null) return '';
    if (daysLeft === 0) return 'Berakhir Hari Ini';
    return `${daysLeft} hari lagi`;
  };

  const renderStatusIndicator = (
    statusType: CertificationStatusType,
    daysLeft: number | null
  ) => {
    if (statusType === 'warning') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600 text-white text-[11px] font-bold shadow-xs">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          <BellRing size={12} className="shrink-0" />
          <span>
            {daysLeft === 0
              ? 'Hari Ini Kedaluwarsa'
              : `≤ 30 Hari · H-${daysLeft ?? 0}`}
          </span>
        </span>
      );
    }

    if (statusType === 'expired') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800/80 text-[11px] font-bold">
          <XCircle size={13} className="shrink-0" />
          Kedaluwarsa{daysLeft !== null ? ` (Lewat ${Math.abs(daysLeft)}h)` : ''}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
        <CheckCircle2 size={13} className="shrink-0" />
        Aktif
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Data Sertifikasi Kompetensi"
        subtitle="Pemantauan masa berlaku dan pengingat otomatis sertifikat keahlian pegawai PLN Nusantara Power UP Kapuas"
        icon={Award}
        badge={`${filteredCerts.length} Sertifikat`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {summary.warning > 0 && (
              <button
                type="button"
                onClick={() =>
                  setFilterStatus((prev) => (prev === 'warning' ? 'all' : 'warning'))
                }
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all shadow-xs',
                  filterStatus === 'warning'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950'
                )}
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className={cn(
                      'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                      filterStatus === 'warning' ? 'bg-white' : 'bg-red-500'
                    )}
                  />
                  <span
                    className={cn(
                      'relative inline-flex rounded-full h-2 w-2',
                      filterStatus === 'warning' ? 'bg-white' : 'bg-red-600'
                    )}
                  />
                </span>
                <BellRing size={14} />
                <span>{summary.warning} Pengingat ≤ 30 Hari</span>
              </button>
            )}

            <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                  viewMode === 'table'
                    ? 'bg-[#0072BC] text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-[#173B65]'
                )}
              >
                <TableIcon size={14} />
                Tabel
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                  viewMode === 'grid'
                    ? 'bg-[#0072BC] text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-[#173B65]'
                )}
              >
                <LayoutGrid size={14} />
                Kartu
              </button>
            </div>
          </div>
        }
      />

      {/* Automatic 30-Day Expiry Reminder Notification Banner */}
      {!loading && expiringWithin30Days.length > 0 && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/70 bg-gradient-to-r from-red-50 via-red-50/60 to-white dark:from-red-950/50 dark:via-red-950/30 dark:to-[#0E1A2E] shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm relative">
                <BellRing size={19} />
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-800 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white dark:border-[#0E1A2E]">
                  {expiringWithin30Days.length}
                </span>
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
                    <AlertTriangle size={11} />
                    Pengingat Otomatis
                  </span>
                  <h3 className="text-sm font-extrabold text-red-900 dark:text-red-200">
                    {expiringWithin30Days.length} Sertifikat Akan Kedaluwarsa dalam 30 Hari ke Depan
                  </h3>
                </div>
                <p className="text-xs text-red-700/90 dark:text-red-300/85 leading-relaxed">
                  Segera jadwalkan perpanjangan atau resertifikasi sebelum masa berlaku habis untuk menjaga kepatuhan kompetensi pegawai.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setFilterStatus((prev) => (prev === 'warning' ? 'all' : 'warning'))
                }
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-bold transition-colors',
                  filterStatus === 'warning'
                    ? 'bg-white dark:bg-slate-900 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 hover:bg-red-50'
                    : 'bg-red-600 text-white hover:bg-red-700 shadow-xs'
                )}
              >
                {filterStatus === 'warning'
                  ? 'Tampilkan Semua Sertifikat'
                  : 'Filter Sertifikat ≤ 30 Hari'}
              </button>
              <button
                type="button"
                onClick={() => setReminderExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-red-200 dark:border-red-800/80 text-xs font-bold text-red-700 dark:text-red-300 hover:bg-white transition-colors"
                aria-expanded={reminderExpanded}
              >
                <span>{reminderExpanded ? 'Ringkas' : 'Lihat Daftar'}</span>
                {reminderExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {reminderExpanded && (
            <div className="px-4 sm:px-5 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 border-t border-red-200/70 dark:border-red-900/40 bg-white/60 dark:bg-[#0B172A]/40">
              {expiringWithin30Days.slice(0, 4).map((cert) => (
                <button
                  key={cert.id}
                  type="button"
                  onClick={() => {
                    setFilterStatus('warning');
                    setSearchTerm(cert.employeeName);
                  }}
                  className="text-left p-3 rounded-xl bg-white dark:bg-[#0E1A2E] border border-red-200/90 dark:border-red-900/70 hover:border-red-500 transition-all group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-[10px] font-extrabold">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                      {cert.daysLeft === 0 ? 'Hari Ini' : `H-${cert.daysLeft}`}
                    </span>
                    <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 tabular-nums">
                      {cert.masaBerlaku ? format(parseISO(cert.masaBerlaku), 'dd MMM yyyy') : '-'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-red-600 transition-colors">
                    {cert.namaSertifikasi}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {cert.employeeName} · {cert.unit}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Sertifikasi"
          value={summary.total}
          subtitle="Seluruh sertifikat tercatat"
          icon={Award}
          accent="blue"
          onClick={() => setFilterStatus('all')}
        />
        <MetricCard
          title="Sertifikat Aktif"
          value={summary.active}
          subtitle="Masa berlaku > 30 hari"
          icon={CheckCircle2}
          accent="emerald"
          onClick={() => setFilterStatus('active')}
        />
        <MetricCard
          title="Akan Kedaluwarsa"
          value={summary.warning}
          subtitle="Pengingat aktif ≤ 30 hari"
          trend={summary.warning > 0 ? 'Alert Merah' : undefined}
          icon={BellRing}
          accent={summary.warning > 0 ? 'red' : 'yellow'}
          onClick={() => setFilterStatus('warning')}
        />
        <MetricCard
          title="Sudah Kedaluwarsa"
          value={summary.expired}
          subtitle="Melewati masa berlaku"
          icon={XCircle}
          accent="red"
          onClick={() => setFilterStatus('expired')}
        />
      </div>

      <div className="corporate-card overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 bg-[#F8FBFD] dark:bg-[#11223B]/50 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari sertifikasi, nama pegawai, NIP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#0E1A2E] rounded-xl border border-slate-200 dark:border-slate-700">
              <Filter size={14} className="text-[#0072BC] dark:text-[#72C8F1]" />
              <select
                value={filterCertType}
                onChange={(e) => setFilterCertType(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#173B65] dark:text-slate-200 outline-none max-w-[200px]"
              >
                <option value="ALL" className="dark:bg-slate-900">Semua Jenis Sertifikasi</option>
                {certTypes.map((type) => (
                  <option key={type} value={type} className="dark:bg-slate-900">
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap bg-white dark:bg-[#0E1A2E] p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {[
              { id: 'all', label: 'Semua', count: null },
              { id: 'active', label: 'Aktif', count: null },
              { id: 'warning', label: 'Akan Kedaluwarsa (≤30h)', count: summary.warning },
              { id: 'expired', label: 'Kedaluwarsa', count: summary.expired > 0 ? summary.expired : null },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setFilterStatus(st.id as 'all' | 'active' | 'warning' | 'expired')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  filterStatus === st.id
                    ? st.id === 'warning'
                      ? 'bg-red-600 text-white'
                      : 'bg-[#0072BC] text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-[#173B65] dark:hover:text-slate-200'
                )}
              >
                <span>{st.label}</span>
                {st.count !== null && st.count > 0 && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px] font-extrabold leading-none',
                      filterStatus === st.id
                        ? 'bg-white/25 text-white'
                        : st.id === 'warning'
                        ? 'bg-red-600 text-white'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    )}
                  >
                    {st.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          viewMode === 'table' ? (
            <TableSkeleton rows={6} cols={5} />
          ) : (
            <div className="p-6">
              <CardGridSkeleton count={6} />
            </div>
          )
        ) : filteredCerts.length === 0 ? (
          <EmptyState
            icon={Award}
            title="Tidak ada data sertifikasi ditemukan"
            description="Coba ubah filter status masa berlaku atau kata kunci pencarian nama pegawai/sertifikasi."
          />
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F4F8FB] dark:bg-[#0B172A] border-b border-slate-100 dark:border-slate-800">
                <tr className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  <th className="px-5 py-3.5">Nama Sertifikasi</th>
                  <th className="px-5 py-3.5">Pemegang Sertifikat</th>
                  <th className="px-5 py-3.5">Unit</th>
                  <th className="px-5 py-3.5">Pelaksanaan</th>
                  <th className="px-5 py-3.5">Masa Berlaku</th>
                  <th className="px-5 py-3.5">Status &amp; Pengingat</th>
                  <th className="px-5 py-3.5 text-right">Berkas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {filteredCerts.map((cert) => {
                  const isExpiringSoon = cert.statusType === 'warning';
                  const isExpired = cert.statusType === 'expired';
                  return (
                    <tr
                      key={cert.id}
                      className={cn(
                        'transition-colors',
                        isExpiringSoon
                          ? 'bg-red-50/60 dark:bg-red-950/25 hover:bg-red-50 dark:hover:bg-red-950/40 border-l-4 border-l-red-500'
                          : isExpired
                          ? 'bg-rose-50/30 dark:bg-rose-950/10 hover:bg-rose-50/60 dark:hover:bg-rose-950/25 border-l-4 border-l-rose-400/70'
                          : 'hover:bg-[#EAF6FC]/40 dark:hover:bg-[#0072BC]/10'
                      )}
                    >
                      <td className="px-5 py-3.5 font-bold text-[#173B65] dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          {isExpiringSoon && (
                            <span
                              className="w-2 h-2 rounded-full bg-red-600 shrink-0"
                              title="Akan kedaluwarsa dalam 30 hari ke depan"
                            />
                          )}
                          <span>{cert.namaSertifikasi}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-[#173B65] dark:text-slate-200">{cert.employeeName}</p>
                        <p className="text-[11px] font-mono text-slate-400">{cert.employeeNip}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 font-medium">
                        {cert.unit}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 tabular-nums">
                        {cert.tanggalPelaksanaan ? format(parseISO(cert.tanggalPelaksanaan), 'dd MMM yyyy') : '-'}
                      </td>
                      <td className="px-5 py-3.5 tabular-nums">
                        <p
                          className={cn(
                            'font-bold',
                            isExpiringSoon
                              ? 'text-red-600 dark:text-red-400'
                              : isExpired
                              ? 'text-rose-700 dark:text-rose-400'
                              : 'text-[#173B65] dark:text-slate-200'
                          )}
                        >
                          {cert.masaBerlaku ? format(parseISO(cert.masaBerlaku), 'dd MMM yyyy') : '-'}
                        </p>
                        {isExpiringSoon && cert.daysLeft !== null && (
                          <p className="text-[10px] font-bold text-red-500 dark:text-red-400 mt-0.5">
                            {formatCountdownText(cert.daysLeft)}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {renderStatusIndicator(cert.statusType, cert.daysLeft)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {cert.certificateUrl ? (
                          <a
                            href={cert.certificateUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] font-bold text-[11px] hover:bg-[#0072BC] hover:text-white transition-colors"
                          >
                            <FileText size={13} />
                            Lihat
                          </a>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCerts.map((cert) => {
              const isExpiringSoon = cert.statusType === 'warning';
              const isExpired = cert.statusType === 'expired';
              return (
                <div
                  key={cert.id}
                  className={cn(
                    'p-5 rounded-2xl border space-y-4 transition-colors relative overflow-hidden',
                    isExpiringSoon
                      ? 'bg-red-50/60 dark:bg-red-950/25 border-red-300 dark:border-red-800/80 hover:border-red-500'
                      : isExpired
                      ? 'bg-rose-50/35 dark:bg-rose-950/15 border-rose-200 dark:border-rose-900/60 hover:border-rose-400'
                      : 'bg-[#F8FBFD] dark:bg-[#0B172A] border-slate-200/80 dark:border-slate-800 hover:border-[#0072BC]/50'
                  )}
                >
                  {isExpiringSoon && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-red-500" />
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        isExpiringSoon
                          ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'
                          : isExpired
                          ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400'
                          : 'bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1]'
                      )}
                    >
                      {isExpiringSoon ? <BellRing size={19} /> : <Award size={20} />}
                    </div>
                    {renderStatusIndicator(cert.statusType, cert.daysLeft)}
                  </div>

                  <div>
                    <h4 className="text-sm font-extrabold text-[#173B65] dark:text-slate-100 line-clamp-1">
                      {cert.namaSertifikasi}
                    </h4>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                      <User size={12} />
                      {cert.employeeName} · {cert.employeeNip}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/70 dark:border-slate-800 text-xs">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Pelaksanaan</p>
                      <p className="font-semibold text-[#173B65] dark:text-slate-200 flex items-center gap-1 mt-0.5 tabular-nums">
                        <Calendar size={11} className="text-slate-400" />
                        {cert.tanggalPelaksanaan ? format(parseISO(cert.tanggalPelaksanaan), 'dd MMM yyyy') : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Berlaku s/d</p>
                      <p
                        className={cn(
                          'font-bold flex items-center gap-1 mt-0.5 tabular-nums',
                          isExpiringSoon
                            ? 'text-red-600 dark:text-red-400'
                            : isExpired
                            ? 'text-rose-700 dark:text-rose-400'
                            : 'text-[#173B65] dark:text-slate-200'
                        )}
                      >
                        <Clock
                          size={11}
                          className={cn(isExpiringSoon ? 'text-red-500' : 'text-slate-400')}
                        />
                        {cert.masaBerlaku ? format(parseISO(cert.masaBerlaku), 'dd MMM yyyy') : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                      <Building2 size={12} />
                      {cert.unit}
                    </span>
                    {cert.certificateUrl && (
                      <a
                        href={cert.certificateUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-[#0072BC] dark:text-[#72C8F1] hover:bg-[#0072BC] hover:text-white transition-colors"
                        title="Buka Sertifikat"
                      >
                        <FileText size={14} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificationList;
