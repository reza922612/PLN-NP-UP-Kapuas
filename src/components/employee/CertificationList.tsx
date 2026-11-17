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
} from 'lucide-react';
import { useEmployees } from '../../hooks/useEmployees';
import { cn } from '../../lib/utils';
import { format, isAfter, parseISO, differenceInDays } from 'date-fns';
import {
  PageHeader,
  MetricCard,
  EmptyState,
  TableSkeleton,
  CardGridSkeleton,
} from '../common/DashboardUI';

const CertificationList: React.FC = () => {
  const { employees, loading } = useEmployees();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'warning' | 'expired'>('all');
  const [filterCertType, setFilterCertType] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const allCertifications = useMemo(() => {
    const today = new Date();
    const list: {
      id: string;
      namaSertifikasi: string;
      tanggalPelaksanaan: string;
      masaBerlaku: string;
      certificateUrl?: string;
      employeeName: string;
      employeeNip: string;
      unit: string;
      statusType: 'active' | 'warning' | 'expired';
      daysLeft: number | null;
    }[] = [];

    employees.forEach((emp) => {
      (emp.certifications || []).forEach((cert, index) => {
        let statusType: 'active' | 'warning' | 'expired' = 'active';
        let daysLeft: number | null = null;
        if (cert.masaBerlaku) {
          try {
            const expiryDate = parseISO(cert.masaBerlaku);
            daysLeft = differenceInDays(expiryDate, today);
            if (!isAfter(expiryDate, today)) {
              statusType = 'expired';
            } else if (daysLeft <= 30) {
              statusType = 'warning';
            }
          } catch {
            statusType = 'active';
          }
        }
        list.push({
          id: cert.id || `${emp.id}-cert-${index}`,
          namaSertifikasi: cert.namaSertifikasi,
          tanggalPelaksanaan: cert.tanggalPelaksanaan,
          masaBerlaku: cert.masaBerlaku,
          certificateUrl: cert.certificateUrl,
          employeeName: emp.fullName,
          employeeNip: emp.nip,
          unit: emp.unitPelaksana,
          statusType,
          daysLeft,
        });
      });
    });

    return list;
  }, [employees]);

  const certTypes = useMemo(() => {
    const set = new Set<string>();
    allCertifications.forEach((c) => c.namaSertifikasi && set.add(c.namaSertifikasi));
    return Array.from(set).sort();
  }, [allCertifications]);

  const summary = useMemo(() => {
    return {
      total: allCertifications.length,
      active: allCertifications.filter((c) => c.statusType === 'active').length,
      warning: allCertifications.filter((c) => c.statusType === 'warning').length,
      expired: allCertifications.filter((c) => c.statusType === 'expired').length,
    };
  }, [allCertifications]);

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

  const renderStatusIndicator = (statusType: 'active' | 'warning' | 'expired', daysLeft: number | null) => {
    if (statusType === 'expired') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-[11px] font-bold">
          <XCircle size={13} />
          Kedaluwarsa{daysLeft !== null ? ` (${Math.abs(daysLeft)}h)` : ''}
        </span>
      );
    }
    if (statusType === 'warning') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-[#F9D423]/15 text-amber-700 dark:text-[#F9D423] text-[11px] font-bold">
          <Clock size={13} />
          Akan Kedaluwarsa{daysLeft !== null ? ` (${daysLeft}h)` : ''}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
        <CheckCircle2 size={13} />
        Aktif
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Data Sertifikasi Kompetensi"
        subtitle="Pemantauan masa berlaku sertifikat keahlian pegawai PLN Nusantara Power UP Kapuas"
        icon={Award}
        badge={`${filteredCerts.length} Sertifikat`}
        actions={
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
        }
      />

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
          subtitle="Berakhir dalam <= 30 hari"
          icon={Clock}
          accent="yellow"
          onClick={() => setFilterStatus('warning')}
        />
        <MetricCard
          title="Sudah Kedaluwarsa"
          value={summary.expired}
          subtitle="Perlu perpanjangan segera"
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
              { id: 'all', label: 'Semua' },
              { id: 'active', label: 'Aktif' },
              { id: 'warning', label: 'Akan Kedaluwarsa' },
              { id: 'expired', label: 'Kedaluwarsa' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setFilterStatus(st.id as any)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  filterStatus === st.id
                    ? 'bg-[#0072BC] text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-[#173B65] dark:hover:text-slate-200'
                )}
              >
                {st.label}
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
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Berkas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {filteredCerts.map((cert) => (
                  <tr
                    key={cert.id}
                    className="hover:bg-[#EAF6FC]/40 dark:hover:bg-[#0072BC]/10 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-bold text-[#173B65] dark:text-slate-100">
                      {cert.namaSertifikasi}
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
                    <td className="px-5 py-3.5 font-bold text-[#173B65] dark:text-slate-200 tabular-nums">
                      {cert.masaBerlaku ? format(parseISO(cert.masaBerlaku), 'dd MMM yyyy') : '-'}
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
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCerts.map((cert) => (
              <div
                key={cert.id}
                className="p-5 rounded-2xl bg-[#F8FBFD] dark:bg-[#0B172A] border border-slate-200/80 dark:border-slate-800 space-y-4 hover:border-[#0072BC]/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center shrink-0">
                    <Award size={20} />
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
                    <p className="font-semibold text-[#173B65] dark:text-slate-200 flex items-center gap-1 mt-0.5 tabular-nums">
                      <Clock size={11} className="text-slate-400" />
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificationList;
