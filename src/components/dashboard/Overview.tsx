import React, { useMemo } from 'react';
import {
  Users,
  Clock,
  Award,
  Building2,
  TrendingUp,
  AlertTriangle,
  Briefcase,
  ShieldCheck,
  Cpu,
  Zap,
  Network,
  ArrowRight,
  History,
  Bell,
  CheckCircle2,
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
import { formatDistanceToNow, parseISO, differenceInDays, isAfter } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Employee } from '../../types';
import { useUnits } from '../../hooks/useUnits';
import { useActivityLogs } from '../../hooks/useActivityLogs';
import {
  PageHeader,
  MetricCard,
  SectionCard,
  EmptyState,
  CardGridSkeleton,
} from '../common/DashboardUI';
import { cn } from '../../lib/utils';

interface OverviewProps {
  stats: {
    total: number;
    organic: number;
    taskForce: number;
    subcontract: number;
    retirement: number;
  };
  employees: Employee[];
  loading?: boolean;
  setActiveTab: (tab: string) => void;
  onSelectEmployee?: (emp: Employee) => void;
}

const DONUT_COLORS = ['#0072BC', '#72C8F1', '#F9D423'];

const Overview: React.FC<OverviewProps> = ({
  stats,
  employees,
  loading = false,
  setActiveTab,
  onSelectEmployee,
}) => {
  const { unitStats, loading: unitsLoading } = useUnits();
  const { logs } = useActivityLogs(true, 6);

  const sdmComputed = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    let totalCerts = 0;
    let activeCerts = 0;
    let expiringSoonCerts = 0;
    let expiredCerts = 0;
    let retiringThisYear = 0;
    let retiringNext12Months = 0;
    const retiringEmployees: { emp: Employee; dateStr: string; days: number }[] = [];

    employees.forEach((emp) => {
      if (emp.tanggalPensiunNormal) {
        try {
          const retDate = parseISO(emp.tanggalPensiunNormal);
          const daysLeft = differenceInDays(retDate, now);
          if (retDate.getFullYear() === currentYear && daysLeft >= 0) {
            retiringThisYear += 1;
          }
          if (daysLeft >= 0 && daysLeft <= 365) {
            retiringNext12Months += 1;
            retiringEmployees.push({
              emp,
              dateStr: emp.tanggalPensiunNormal,
              days: daysLeft,
            });
          }
        } catch {
          // ignore malformed date
        }
      }

      (emp.certifications || []).forEach((c) => {
        totalCerts += 1;
        if (!c.masaBerlaku) {
          activeCerts += 1;
          return;
        }
        try {
          const expDate = parseISO(c.masaBerlaku);
          if (!isAfter(expDate, now)) {
            expiredCerts += 1;
          } else if (differenceInDays(expDate, now) <= 30) {
            expiringSoonCerts += 1;
          } else {
            activeCerts += 1;
          }
        } catch {
          activeCerts += 1;
        }
      });
    });

    retiringEmployees.sort((a, b) => a.days - b.days);

    return {
      currentYear,
      totalCerts,
      activeCerts,
      expiringSoonCerts,
      expiredCerts,
      retiringThisYear,
      retiringNext12Months,
      retiringEmployees: retiringEmployees.slice(0, 3),
    };
  }, [employees]);

  const dataStatus = useMemo(
    () => [
      { name: 'Pegawai Organik', value: stats.organic },
      { name: 'Tugas Khusus', value: stats.taskForce },
      { name: 'Tenaga Alih Daya', value: stats.subcontract },
    ],
    [stats]
  );

  const systemData = useMemo(() => {
    return Object.entries(unitStats.systemBreakdown).map(([name, value]) => ({
      name: name.replace(/^Sistem\s+/i, ''),
      fullName: name,
      value: Number(value) || 0,
    }));
  }, [unitStats.systemBreakdown]);

  const typeData = useMemo(() => {
    return Object.entries(unitStats.typeBreakdown).map(([name, value]) => ({
      name,
      value: Number(value) || 0,
    }));
  }, [unitStats.typeBreakdown]);

  if (loading && employees.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard Eksekutif SIMAP UP Kapuas"
          subtitle="Memuat ringkasan data SDM, sertifikasi, dan aset pembangkit..."
          icon={TrendingUp}
        />
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-16">
      <PageHeader
        title="Dashboard Eksekutif UP Kapuas"
        subtitle="Ringkasan terpadu Sumber Daya Manusia, Kompetensi Sertifikasi, dan Aset Pembangkit"
        icon={TrendingUp}
        badge="PT PLN Nusantara Power"
        actions={
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0072BC] text-white rounded-xl text-xs font-bold hover:bg-[#173B65] transition-colors shadow-xs"
          >
            Buka Laporan Analitik
            <ArrowRight size={14} />
          </button>
        }
      />

      {/* Row 1: SDM & Sertifikasi KPI Cards */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
          Statistik Sumber Daya Manusia &amp; Sertifikasi
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <MetricCard
            title="Total Pegawai"
            value={stats.total}
            subtitle="Terdaftar aktif di SIMAP"
            icon={Users}
            accent="blue"
            onClick={() => setActiveTab('employees')}
          />
          <MetricCard
            title="Pegawai Organik"
            value={stats.organic}
            subtitle={stats.total > 0 ? `${Math.round((stats.organic / stats.total) * 100)}% dari total` : '0%'}
            icon={ShieldCheck}
            accent="cyan"
          />
          <MetricCard
            title="Tenaga Alih Daya"
            value={stats.subcontract}
            subtitle={`+ ${stats.taskForce} Tugas Khusus`}
            icon={Briefcase}
            accent="navy"
          />
          <MetricCard
            title="Sertifikat Kompetensi"
            value={sdmComputed.totalCerts}
            trend={`${sdmComputed.activeCerts} Aktif`}
            subtitle={
              sdmComputed.expiringSoonCerts > 0
                ? `· ${sdmComputed.expiringSoonCerts} segera habis`
                : 'terdata'
            }
            icon={Award}
            accent="yellow"
            onClick={() => setActiveTab('certifications')}
          />
          <MetricCard
            title="Pensiun <= 12 Bulan"
            value={sdmComputed.retiringNext12Months}
            subtitle={`${sdmComputed.retiringThisYear} pada tahun ${sdmComputed.currentYear}`}
            icon={Clock}
            accent={sdmComputed.retiringNext12Months > 0 ? 'amber' : 'emerald'}
          />
        </div>
      </div>

      {/* Row 2: Pembangkit KPI Cards */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
          Ringkasan Operasional Pembangkit
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Unit Layanan (ULPL)"
            value={unitsLoading ? '...' : unitStats.totalUnits}
            subtitle="Lokasi unit pembangkit"
            icon={Building2}
            accent="blue"
          />
          <MetricCard
            title="Unit Mesin Terpasang"
            value={unitsLoading ? '...' : unitStats.totalMachines}
            subtitle="Aset pembangkit aktif"
            icon={Cpu}
            accent="cyan"
          />
          <MetricCard
            title="Total Daya Mampu (DMN)"
            value={unitsLoading ? '...' : Number(unitStats.totalCapacity || 0).toLocaleString('id-ID')}
            unit="kW"
            subtitle="Kapasitas nominal gabungan"
            icon={Zap}
            accent="yellow"
          />
          <MetricCard
            title="Sistem Kelistrikan"
            value={unitsLoading ? '...' : Object.keys(unitStats.systemBreakdown).length}
            subtitle="Sistem jaringan terintegrasi"
            icon={Network}
            accent="navy"
          />
        </div>
      </div>

      {/* Main Content Split: Charts (2/3) + Sidebar Widgets (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="Kapasitas Pembangkit per Sistem Kelistrikan"
            subtitle="Distribusi Daya Mampu Nominal (kW) berdasarkan data unit aktual"
            icon={Zap}
          >
            {systemData.length > 0 ? (
              <div className="h-[310px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={systemData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    />
                    <YAxis
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
                    <Bar dataKey="value" name="Total DMN (kW)" radius={[8, 8, 0, 0]} barSize={44}>
                      {systemData.map((_, index) => (
                        <Cell key={index} fill={index % 2 === 0 ? '#0072BC' : '#72C8F1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={Zap}
                title="Belum ada data sistem kelistrikan"
                description="Tambahkan data unit pembangkit dan mesin untuk menampilkan grafik distribusi daya."
              />
            )}
          </SectionCard>

          <SectionCard
            title="Komposisi Status Kepegawaian"
            subtitle="Proporsi tenaga kerja PT PLN Nusantara Power UP Kapuas"
            icon={Users}
          >
            {stats.total > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-6">
                <div className="h-[230px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dataStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
                        outerRadius={88}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {dataStatus.map((_, index) => (
                          <Cell key={index} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
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
                <div className="space-y-3">
                  {dataStatus.map((item, idx) => {
                    const pct = stats.total > 0 ? Math.round((item.value / stats.total) * 100) : 0;
                    return (
                      <div
                        key={item.name}
                        className="p-3.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3 h-3 rounded-xs shrink-0"
                            style={{ backgroundColor: DONUT_COLORS[idx] }}
                          />
                          <span className="text-xs font-bold text-[#173B65] dark:text-slate-200">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-[#0072BC] dark:text-[#72C8F1] tabular-nums">
                          {item.value} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="Belum ada data pegawai"
                description="Mulai tambahkan profil pegawai melalui menu Input Pegawai."
              />
            )}
          </SectionCard>
        </div>

        {/* Right Column: Notifications, Machine Breakdown, Recent Activities */}
        <div className="space-y-6">
          {/* Important Information & Alerts */}
          <div className="rounded-2xl pln-gradient p-6 text-white shadow-lg space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={17} className="text-[#F9D423]" />
                <h3 className="text-sm font-extrabold tracking-tight">
                  Informasi &amp; Peringatan Penting
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-white/15 text-[#F9D423] text-[10px] font-bold uppercase">
                Monitoring
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Certification alert */}
              <button
                type="button"
                onClick={() => setActiveTab('certifications')}
                className="w-full text-left p-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-colors flex items-start gap-3"
              >
                {sdmComputed.expiredCerts + sdmComputed.expiringSoonCerts > 0 ? (
                  <AlertTriangle size={16} className="text-[#F9D423] shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 size={16} className="text-[#72C8F1] shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">
                    {sdmComputed.expiredCerts + sdmComputed.expiringSoonCerts > 0
                      ? `${sdmComputed.expiredCerts} Expired · ${sdmComputed.expiringSoonCerts} Segera Berakhir`
                      : 'Seluruh Sertifikat Kompetensi Aktif'}
                  </p>
                  <p className="text-[11px] text-white/75 mt-0.5">
                    {sdmComputed.totalCerts} sertifikasi terpantau · Klik untuk tinjau
                  </p>
                </div>
              </button>

              {/* Retirement alert */}
              <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Clock size={14} className="text-[#72C8F1]" />
                    Proyeksi Pensiun ({sdmComputed.currentYear})
                  </span>
                  <span className="text-xs font-extrabold text-[#F9D423] tabular-nums">
                    {sdmComputed.retiringThisYear} Pegawai
                  </span>
                </div>
                {sdmComputed.retiringEmployees.length > 0 ? (
                  <div className="space-y-1.5 pt-1 border-t border-white/10">
                    {sdmComputed.retiringEmployees.map(({ emp, days }) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => onSelectEmployee && onSelectEmployee(emp)}
                        className="w-full flex items-center justify-between text-[11px] text-white/85 hover:text-[#F9D423] transition-colors"
                      >
                        <span className="truncate font-semibold">{emp.fullName}</span>
                        <span className="shrink-0 ml-2 font-mono text-[10px] text-[#72C8F1]">
                          {days} hr lagi
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-white/70">
                    Tidak ada pegawai memasuki batas pensiun dalam 12 bulan ke depan.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Machine Type Composition */}
          <SectionCard title="Komposisi Jenis Pembangkit" icon={Cpu}>
            {typeData.length > 0 ? (
              <div className="space-y-4">
                {typeData.map((item) => {
                  const pct = unitStats.totalMachines
                    ? Math.round((item.value / unitStats.totalMachines) * 100)
                    : 0;
                  return (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-[#173B65] dark:text-slate-200">{item.name}</span>
                        <span className="text-[#0072BC] dark:text-[#72C8F1] tabular-nums">
                          {item.value} Unit ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[#EAF6FC] dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#0072BC] to-[#72C8F1] rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                Belum ada data mesin terpasang.
              </p>
            )}
          </SectionCard>

          {/* Recent Activity Log Widget */}
          <SectionCard
            title="Aktivitas Terbaru"
            icon={History}
            action={
              <button
                type="button"
                onClick={() => setActiveTab('activity-log')}
                className="text-xs font-bold text-[#0072BC] dark:text-[#72C8F1] hover:underline"
              >
                Semua Log
              </button>
            }
          >
            {logs.length > 0 ? (
              <div className="space-y-4">
                {logs.slice(0, 4).map((log) => {
                  const dt = log.createdAt?.toDate
                    ? log.createdAt.toDate()
                    : log.createdAt?.seconds
                    ? new Date(log.createdAt.seconds * 1000)
                    : null;
                  const dotColor =
                    log.action === 'DELETE'
                      ? 'bg-red-500'
                      : log.action === 'CREATE'
                      ? 'bg-emerald-500'
                      : 'bg-[#0072BC]';
                  return (
                    <div key={log.id} className="flex items-start gap-3">
                      <span className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', dotColor)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-[#173B65] dark:text-slate-100 truncate">
                            {log.entityName}
                          </p>
                          {dt && (
                            <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                              {formatDistanceToNow(dt, { addSuffix: true, locale: idLocale })}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                          {log.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">
                Belum ada aktivitas administratif tercatat.
              </p>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default Overview;
