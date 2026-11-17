import React, { useEffect, useMemo, useState } from 'react';
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
import {
  Users,
  Cpu,
  Zap,
  Building2,
  ShieldCheck,
  Briefcase,
  Award,
  Activity,
  RefreshCw,
  ArrowRight,
  Database,
} from 'lucide-react';
import { PublicStats } from '../../types';
import { cn } from '../../lib/utils';

interface LandingInfographicProps {
  stats: PublicStats | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onLoginClick: () => void;
}

type InfographicTab = 'all' | 'sdm' | 'operational' | 'performance';

const AnimatedMetricValue: React.FC<{ value: number; decimals?: number }> = ({
  value,
  decimals = 0,
}) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || value === 0) {
      setDisplayValue(value);
      return;
    }

    let frame = 0;
    const duration = 550;
    const start = performance.now();
    const initial = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(initial + (value - initial) * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const formatted = useMemo(() => {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(decimals > 0 ? displayValue : Math.round(displayValue));
  }, [displayValue, decimals]);

  return <span className="font-mono tabular-nums">{formatted}</span>;
};

const LandingInfographic: React.FC<LandingInfographicProps> = ({
  stats,
  loading,
  error,
  onRefresh,
  onLoginClick,
}) => {
  const [activeTab, setActiveTab] = useState<InfographicTab>('all');

  const hasSyncedData =
    !!stats && (stats.totalEmployees > 0 || stats.totalUnits > 0 || stats.totalMachines > 0);

  const workforceChartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Pegawai Organik', value: stats.organicCount || 0, color: '#005DAA' },
      { name: 'Tugas Khusus', value: stats.taskForceCount || 0, color: '#00AEEF' },
      { name: 'Tenaga Alih Daya', value: stats.subcontractCount || 0, color: '#FACC15' },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const systemChartData = useMemo(() => {
    if (!stats?.systemBreakdown) return [];
    const entries = Object.entries(stats.systemBreakdown) as Array<
      [string, { machines: number; capacityKW: number; peakLoadKW: number }]
    >;
    return entries.map(([name, info]) => ({
      name: name.replace('Sistem ', ''),
      fullName: name,
      DMN: Math.round(info.capacityKW || 0),
      BebanPuncak: Math.round(info.peakLoadKW || 0),
      mesin: info.machines || 0,
    }));
  }, [stats]);

  const machineTypeList = useMemo(() => {
    if (!stats?.machineTypeBreakdown || !stats.totalMachines) return [];
    const entries = Object.entries(stats.machineTypeBreakdown) as Array<
      [string, { machines: number; capacityKW: number }]
    >;
    return entries.map(([name, info]) => ({
      name,
      machines: info.machines || 0,
      capacityKW: info.capacityKW || 0,
      share: Math.round(((info.machines || 0) / stats.totalMachines) * 100),
    }));
  }, [stats]);

  const utilizationRatio = useMemo(() => {
    if (!stats || !stats.totalCapacityKW) return 0;
    return Math.min(Math.round((stats.totalPeakLoadKW / stats.totalCapacityKW) * 1000) / 10, 100);
  }, [stats]);

  const organicShare = useMemo(() => {
    if (!stats || !stats.totalEmployees) return 0;
    return Math.round((stats.organicCount / stats.totalEmployees) * 1000) / 10;
  }, [stats]);

  const updatedLabel = useMemo(() => {
    if (!stats?.updatedAt) return null;
    try {
      const date = stats.updatedAt?.toDate
        ? stats.updatedAt.toDate()
        : stats.updatedAt?.seconds
        ? new Date(stats.updatedAt.seconds * 1000)
        : null;
      if (!date) return null;
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return null;
    }
  }, [stats?.updatedAt]);

  const tabs: { id: InfographicTab; label: string }[] = [
    { id: 'all', label: 'Semua Ringkasan' },
    { id: 'sdm', label: 'Data SDM' },
    { id: 'operational', label: 'Operasional & Produksi' },
    { id: 'performance', label: 'Kinerja Unit' },
  ];

  return (
    <section id="infografis" className="py-24 px-6 bg-slate-50/70 dark:bg-slate-900/30 border-y border-slate-200/70 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-pln-blue dark:text-cyan-400">
              Infografis Data Aktual
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white text-balance">
              Ringkasan SDM, Pembangkit, dan Kinerja UP Kapuas
            </h2>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Seluruh angka di bawah ini disinkronkan langsung dari catatan database pegawai dan unit pembangkit SIMAP tanpa estimasi fiktif.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto max-w-full">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0',
                    activeTab === tab.id
                      ? 'bg-pln-blue text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              aria-label="Segarkan data infografis"
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-pln-blue dark:hover:text-cyan-400 transition-colors disabled:opacity-50"
              title="Muat ulang data aktual"
            >
              <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Sync Metadata Line */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-pln-blue dark:text-cyan-400" />
            <span>Sumber Data: Firestore Terintegrasi UP Kapuas</span>
            <span aria-hidden="true">·</span>
            <span>
              {loading
                ? 'Memuat data aktual...'
                : updatedLabel
                ? `Sinkronisasi terakhir: ${updatedLabel}`
                : 'Belum ada sinkronisasi statistik publik'}
            </span>
          </div>
          {error && <span className="text-red-600 dark:text-red-400 font-medium">{error}</span>}
        </div>

        {/* Empty / Uninitialized Actual Data Notice */}
        {!loading && !hasSyncedData ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Menunggu Sinkronisasi Data Aktual dari Dashboard Admin
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Sesuai prinsip transparansi data, infografis publik hanya menampilkan agregat riil dari koleksi Pegawai dan Unit Pembangkit. Masuk ke Dashboard sebagai Admin untuk menyinkronkan data aktual ke portal ini.
              </p>
            </div>
            <button
              type="button"
              onClick={onLoginClick}
              className="px-5 py-3 bg-pln-blue text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-pln-dark transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              Masuk & Sinkronkan
              <ArrowRight size={15} />
            </button>
          </div>
        ) : null}

        {/* Top KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 space-y-3">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold">Total Pegawai Terdata</span>
              <Users size={16} className="text-pln-blue dark:text-cyan-400" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              <AnimatedMetricValue value={stats?.totalEmployees ?? 0} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Organik {stats?.organicCount ?? 0} · Tugas Khusus {stats?.taskForceCount ?? 0} · Alih Daya{' '}
              {stats?.subcontractCount ?? 0}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 space-y-3">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold">Unit & Mesin Aktif</span>
              <Cpu size={16} className="text-pln-cyan" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              <AnimatedMetricValue value={stats?.totalMachines ?? 0} />
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-1.5">
                Unit Mesin
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tersebar pada {stats?.totalUnits ?? 0} lokasi unit layanan terdaftar
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 space-y-3">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold">Total Daya Mampu (DMN)</span>
              <Zap size={16} className="text-amber-500" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              <AnimatedMetricValue value={stats?.totalCapacityKW ?? 0} />
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-1.5">
                kW
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Beban puncak tercatat{' '}
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                {new Intl.NumberFormat('id-ID').format(stats?.totalPeakLoadKW ?? 0)} kW
              </span>
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 space-y-3">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold">Rasio Beban / DMN</span>
              <Activity size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              <AnimatedMetricValue value={utilizationRatio} decimals={1} />
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-1">
                %
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dihitung aktual dari Beban Puncak dibanding DMN
            </p>
          </div>
        </div>

        {/* Visualizations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Operational Capacity Bar Chart */}
          {(activeTab === 'all' || activeTab === 'operational' || activeTab === 'performance') && (
            <div
              className={cn(
                'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 md:p-8 flex flex-col justify-between',
                activeTab === 'all' ? 'lg:col-span-7' : 'lg:col-span-8'
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Kapasitas DMN & Beban Puncak per Sistem Kelistrikan
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Perbandingan Daya Mampu Nominal terhadap Beban Puncak dalam satuan kW
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-pln-blue inline-block" />
                    DMN (kW)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-pln-cyan inline-block" />
                    Beban Puncak (kW)
                  </span>
                </div>
              </div>

              {systemChartData.length > 0 ? (
                <div className="h-[290px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={systemChartData} barGap={6}>
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
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(0, 93, 170, 0.06)' }}
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid #1e293b',
                          backgroundColor: '#0f172a',
                          color: '#f8fafc',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="DMN" fill="#005DAA" radius={[6, 6, 0, 0]} maxBarSize={36} />
                      <Bar dataKey="BebanPuncak" fill="#00AEEF" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[260px] flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-6">
                  <Building2 size={28} className="text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Belum ada data sistem kelistrikan tersinkronisasi
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Grafik akan terisi otomatis saat data mesin unit disimpan di Dashboard Admin.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Workforce & Machine Mix Panel */}
          {(activeTab === 'all' || activeTab === 'sdm' || activeTab === 'performance') && (
            <div
              className={cn(
                'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 md:p-8 flex flex-col justify-between space-y-6',
                activeTab === 'all'
                  ? 'lg:col-span-5'
                  : activeTab === 'sdm'
                  ? 'lg:col-span-12'
                  : 'lg:col-span-4'
              )}
            >
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Komposisi Tenaga Kerja & Tipe Mesin
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Proporsi aktual status kepegawaian dan jenis unit pembangkit
                </p>
              </div>

              <div className={cn('grid gap-6 items-center', activeTab === 'sdm' ? 'md:grid-cols-2' : 'grid-cols-1')}>
                {/* Donut Workforce */}
                {workforceChartData.length > 0 ? (
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-40 h-40 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={workforceChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={42}
                            outerRadius={66}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                          >
                            {workforceChartData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: '10px',
                              border: 'none',
                              backgroundColor: '#0f172a',
                              color: '#f8fafc',
                              fontSize: '12px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 w-full space-y-3">
                      {workforceChartData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            {item.name}
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                            {item.value}
                          </span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Rasio Pegawai Organik</span>
                        <span className="font-mono font-semibold text-pln-blue dark:text-cyan-400">
                          {organicShare}%
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-4">
                    <Users size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Data distribusi SDM akan tampil setelah sinkronisasi Admin.
                    </p>
                  </div>
                )}

                {/* Machine Types */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Jenis Pembangkit Terdaftar</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      {stats?.totalMachines ?? 0} mesin
                    </span>
                  </div>
                  {machineTypeList.length > 0 ? (
                    <div className="space-y-2.5">
                      {machineTypeList.map((mt) => (
                        <div key={mt.name} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{mt.name}</span>
                            <span className="font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                              {mt.machines} unit · {new Intl.NumberFormat('id-ID').format(mt.capacityKW)} kW ({mt.share}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-pln-blue to-pln-cyan rounded-full transition-all duration-500"
                              style={{ width: `${mt.share}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Belum ada klasifikasi PLTD / PLTG / PLTU yang tersinkronisasi.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Detailed SDM Breakdown Cards when sdm tab is selected */}
          {activeTab === 'sdm' && (
            <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-pln-blue dark:text-cyan-400 shrink-0">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pegawai Organik</p>
                  <p className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                    {stats?.organicCount ?? 0}
                  </p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-pln-cyan shrink-0">
                  <Award size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pegawai Tugas Khusus</p>
                  <p className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                    {stats?.taskForceCount ?? 0}
                  </p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Briefcase size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tenaga Alih Daya</p>
                  <p className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                    {stats?.subcontractCount ?? 0}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Unit Performance Table when operational or performance tab is active */}
          {(activeTab === 'operational' || activeTab === 'performance') && (
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Ringkasan Kapasitas Unit
              </h3>
              {stats?.unitSummaries && stats.unitSummaries.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stats.unitSummaries.map((u) => {
                    const ratio = u.capacityKW > 0 ? Math.round((u.peakLoadKW / u.capacityKW) * 100) : 0;
                    return (
                      <div key={u.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {u.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {u.machinesCount} mesin · Beban {ratio}%
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-mono font-bold text-pln-blue dark:text-cyan-400 tabular-nums">
                            {new Intl.NumberFormat('id-ID').format(u.capacityKW)} kW
                          </p>
                          <p className="text-[11px] font-mono text-slate-400 tabular-nums">
                            BP {new Intl.NumberFormat('id-ID').format(u.peakLoadKW)} kW
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
                  Belum ada unit terdaftar dalam ringkasan publik.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default LandingInfographic;
