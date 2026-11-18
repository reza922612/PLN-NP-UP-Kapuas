import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Zap,
  Award,
  Building2,
  Filter,
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { evaluateCertificationStatus } from '../../lib/certificationStatus';
import { Employee } from '../../types';
import { useUnits } from '../../hooks/useUnits';
import {
  PageHeader,
  MetricCard,
  SectionCard,
  EmptyState,
  CardGridSkeleton,
} from '../common/DashboardUI';
import { cn } from '../../lib/utils';

interface AnalyticsViewProps {
  employees: Employee[];
  loading: boolean;
}

const CORPORATE_COLORS = ['#0072BC', '#72C8F1', '#F9D423', '#173B65', '#10B981', '#F59E0B'];

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ employees, loading }) => {
  const { units, loading: unitsLoading } = useUnits();

  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'sdm' | 'pembangkit'>('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('ALL');

  const unitOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => e.unitPelaksana && set.add(e.unitPelaksana));
    units.forEach((u) => u.namaUnitLayananPusatListrik && set.add(u.namaUnitLayananPusatListrik));
    return Array.from(set).sort();
  }, [employees, units]);

  const periodYears = useMemo(() => {
    const years = new Set<string>();
    employees.forEach((e) => {
      if (e.tanggalMasuk) {
        const y = e.tanggalMasuk.slice(0, 4);
        if (/^\d{4}$/.test(y)) years.add(y);
      }
      if (e.tanggalPengangkatan) {
        const y = e.tanggalPengangkatan.slice(0, 4);
        if (/^\d{4}$/.test(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const matchUnit =
        selectedUnit === 'ALL' ||
        e.unitPelaksana === selectedUnit ||
        e.subUnit === selectedUnit;
      const matchPeriod =
        selectedPeriod === 'ALL' ||
        e.tanggalMasuk?.startsWith(selectedPeriod) ||
        e.tanggalPengangkatan?.startsWith(selectedPeriod);
      return matchUnit && matchPeriod;
    });
  }, [employees, selectedUnit, selectedPeriod]);

  const filteredUnits = useMemo(() => {
    if (selectedUnit === 'ALL') return units;
    return units.filter((u) =>
      u.namaUnitLayananPusatListrik.toLowerCase().includes(selectedUnit.toLowerCase()) ||
      selectedUnit.toLowerCase().includes(u.namaUnitLayananPusatListrik.toLowerCase())
    );
  }, [units, selectedUnit]);

  // 1. Bar Chart Data: Kapasitas DMN vs Beban Puncak per Unit Layanan
  const unitCapacityBarData = useMemo(() => {
    return filteredUnits.map((u) => {
      const dmn = u.mesin?.reduce((sum, m) => sum + (Number(m.dayaMampuNominal) || 0), 0) || 0;
      const bp = u.mesin?.reduce((sum, m) => sum + (Number(m.bebanPuncak) || 0), 0) || 0;
      return {
        name: u.namaUnitLayananPusatListrik.replace(/^ULPL(TD|TG|TU)?\s*/i, ''),
        fullName: u.namaUnitLayananPusatListrik,
        DMN: dmn,
        BebanPuncak: bp,
        Mesin: u.mesin?.length || 0,
      };
    });
  }, [filteredUnits]);

  // 2. Line Chart Data: Tren Masuk/Pengangkatan & Proyeksi Pensiun per Tahun (Real Employee Dates)
  const workforceTrendLineData = useMemo(() => {
    const yearMap: Record<string, { year: string; masuk: number; pengangkatan: number; pensiun: number }> = {};

    const ensureYear = (y: string) => {
      if (!yearMap[y]) {
        yearMap[y] = { year: y, masuk: 0, pengangkatan: 0, pensiun: 0 };
      }
      return yearMap[y];
    };

    const baseList =
      selectedUnit === 'ALL'
        ? employees
        : employees.filter((e) => e.unitPelaksana === selectedUnit || e.subUnit === selectedUnit);

    baseList.forEach((e) => {
      if (e.tanggalMasuk && /^\d{4}/.test(e.tanggalMasuk)) {
        ensureYear(e.tanggalMasuk.slice(0, 4)).masuk += 1;
      }
      if (e.tanggalPengangkatan && /^\d{4}/.test(e.tanggalPengangkatan)) {
        ensureYear(e.tanggalPengangkatan.slice(0, 4)).pengangkatan += 1;
      }
      if (e.tanggalPensiunNormal && /^\d{4}/.test(e.tanggalPensiunNormal)) {
        ensureYear(e.tanggalPensiunNormal.slice(0, 4)).pensiun += 1;
      }
    });

    return Object.values(yearMap)
      .sort((a, b) => Number(a.year) - Number(b.year))
      .slice(-10);
  }, [employees, selectedUnit]);

  // 3. Donut Chart Data: Komposisi Status Kepegawaian & Sertifikasi
  const statusDonutData = useMemo(() => {
    const counts = {
      'Pegawai Organik': 0,
      'Pegawai Tugas Khusus': 0,
      'Tenaga Alih Daya': 0,
    };
    filteredEmployees.forEach((e) => {
      if (e.status in counts) {
        counts[e.status as keyof typeof counts] += 1;
      }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0);
  }, [filteredEmployees]);

  const certStats = useMemo(() => {
    let active = 0;
    let warning = 0;
    let expired = 0;
    const today = new Date();
    filteredEmployees.forEach((e) => {
      (e.certifications || []).forEach((c) => {
        const { statusType } = evaluateCertificationStatus(c.masaBerlaku, today);
        if (statusType === 'expired') {
          expired += 1;
        } else if (statusType === 'warning') {
          warning += 1;
        } else {
          active += 1;
        }
      });
    });
    return {
      total: active + warning + expired,
      active,
      warning,
      expired,
      donut: [
        { name: 'Aktif', value: active },
        { name: 'Segera Berakhir (<=30h)', value: warning },
        { name: 'Kedaluwarsa', value: expired },
      ].filter((d) => d.value > 0),
    };
  }, [filteredEmployees]);

  const kpiSummary = useMemo(() => {
    const totalDMN = filteredUnits.reduce(
      (sum, u) => sum + (u.mesin?.reduce((mSum, m) => mSum + (Number(m.dayaMampuNominal) || 0), 0) || 0),
      0
    );
    const totalBP = filteredUnits.reduce(
      (sum, u) => sum + (u.mesin?.reduce((mSum, m) => mSum + (Number(m.bebanPuncak) || 0), 0) || 0),
      0
    );
    const totalMesin = filteredUnits.reduce((sum, u) => sum + (u.mesin?.length || 0), 0);
    const loadFactor = totalDMN > 0 ? Math.round((totalBP / totalDMN) * 100) : 0;

    return {
      totalEmployees: filteredEmployees.length,
      totalUnits: filteredUnits.length,
      totalMesin,
      totalDMN,
      totalBP,
      loadFactor,
    };
  }, [filteredEmployees, filteredUnits]);

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const sdmSheet = XLSX.utils.json_to_sheet(
      filteredEmployees.map((e) => ({
        NIP: e.nip,
        Nama: e.fullName,
        Jabatan: e.jabatanLengkap,
        Unit: e.unitPelaksana,
        SubUnit: e.subUnit,
        Status: e.status,
        Perusahaan: e.perusahaan,
        Sertifikasi: e.certifications?.length || 0,
        Pelatihan: e.trainings?.length || 0,
      }))
    );
    const unitSheet = XLSX.utils.json_to_sheet(
      unitCapacityBarData.map((u) => ({
        Unit: u.fullName,
        JumlahMesin: u.Mesin,
        TotalDMN_KW: u.DMN,
        BebanPuncak_KW: u.BebanPuncak,
        UtilisasiPersen: u.DMN > 0 ? Math.round((u.BebanPuncak / u.DMN) * 100) : 0,
      }))
    );
    XLSX.utils.book_append_sheet(wb, sdmSheet, 'Analitik SDM');
    XLSX.utils.book_append_sheet(wb, unitSheet, 'Analitik Pembangkit');
    XLSX.writeFile(wb, `Laporan_Analitik_SIMAP_UP_Kapuas_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportCSV = () => {
    const rows = unitCapacityBarData.map((u) => ({
      Unit: u.fullName,
      Jumlah_Mesin: u.Mesin,
      Total_DMN_kW: u.DMN,
      Beban_Puncak_kW: u.BebanPuncak,
      Rasio_Beban_Persen: u.DMN > 0 ? Math.round((u.BebanPuncak / u.DMN) * 100) : 0,
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Pembangkit_UP_Kapuas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading || unitsLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Laporan & Analitik Terpadu"
          subtitle="Analisis Tren SDM, Kompetensi Sertifikasi, dan Kapasitas Pembangkit UP Kapuas"
          icon={BarChart3}
        />
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Laporan & Analitik Terpadu"
        subtitle="Analisis Tren SDM, Kompetensi Sertifikasi, dan Kinerja Kapasitas Pembangkit UP Kapuas"
        icon={BarChart3}
        badge="Data Aktual Real-Time"
        actions={
          <>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-[#0072BC] dark:text-[#72C8F1] rounded-xl text-xs font-bold hover:border-[#0072BC] transition-colors"
            >
              <Download size={14} />
              CSV Unit
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold hover:border-emerald-500 transition-colors"
            >
              <FileSpreadsheet size={14} />
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0072BC] text-white rounded-xl text-xs font-bold hover:bg-[#173B65] transition-colors shadow-sm"
            >
              <Printer size={14} />
              Cetak Laporan
            </button>
          </>
        }
      />

      {/* Filter Bar */}
      <div className="corporate-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#F4F8FB] dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <Calendar size={14} className="text-[#0072BC] dark:text-[#72C8F1]" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#173B65] dark:text-slate-100 outline-none"
            >
              <option value="ALL" className="dark:bg-slate-900">Semua Periode</option>
              {periodYears.map((y) => (
                <option key={y} value={y} className="dark:bg-slate-900">
                  Tahun {y}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-[#F4F8FB] dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <Building2 size={14} className="text-[#0072BC] dark:text-[#72C8F1]" />
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#173B65] dark:text-slate-100 outline-none max-w-[220px]"
            >
              <option value="ALL" className="dark:bg-slate-900">Semua Unit Layanan</option>
              {unitOptions.map((u) => (
                <option key={u} value={u} className="dark:bg-slate-900">
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#F4F8FB] dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700">
            {[
              { id: 'ALL', label: 'Semua Kategori' },
              { id: 'sdm', label: 'SDM & Sertifikasi' },
              { id: 'pembangkit', label: 'Pembangkit' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as any)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  selectedCategory === cat.id
                    ? 'bg-[#0072BC] text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-[#173B65] dark:hover:text-slate-200'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {(selectedPeriod !== 'ALL' || selectedUnit !== 'ALL' || selectedCategory !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setSelectedPeriod('ALL');
              setSelectedUnit('ALL');
              setSelectedCategory('ALL');
            }}
            className="text-xs font-bold text-[#0072BC] dark:text-[#72C8F1] hover:underline flex items-center gap-1"
          >
            <Filter size={13} />
            Reset Filter
          </button>
        )}
      </div>

      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Pegawai Terfilter"
          value={kpiSummary.totalEmployees}
          subtitle="Personel aktif tercatat"
          icon={Users}
          accent="blue"
        />
        <MetricCard
          title="Sertifikasi Kompetensi"
          value={certStats.total}
          trend={`${certStats.active} Aktif`}
          subtitle={certStats.warning > 0 ? `· ${certStats.warning} segera habis` : 'tervalidasi'}
          icon={Award}
          accent="cyan"
        />
        <MetricCard
          title="Kapasitas Total (DMN)"
          value={kpiSummary.totalDMN.toLocaleString('id-ID')}
          unit="kW"
          subtitle={`${kpiSummary.totalMesin} mesin di ${kpiSummary.totalUnits} unit`}
          icon={Zap}
          accent="yellow"
        />
        <MetricCard
          title="Rasio Beban Puncak"
          value={`${kpiSummary.loadFactor}%`}
          subtitle={`BP ${kpiSummary.totalBP.toLocaleString('id-ID')} kW`}
          icon={Activity}
          accent="navy"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: Kapasitas DMN & Beban Puncak */}
        {(selectedCategory === 'ALL' || selectedCategory === 'pembangkit') && (
          <SectionCard
            title="Bar Chart — Kapasitas DMN vs Beban Puncak Unit"
            subtitle="Perbandingan Daya Mampu Nominal dan Beban Puncak aktual (kW)"
            icon={BarChart3}
          >
            {unitCapacityBarData.length > 0 ? (
              <div className="h-[310px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={unitCapacityBarData} margin={{ top: 10, right: 12, left: 0, bottom: 10 }}>
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
                      contentStyle={{
                        borderRadius: '14px',
                        border: '1px solid rgba(114,200,241,0.3)',
                        backgroundColor: '#173B65',
                        color: '#ffffff',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                    <Bar dataKey="DMN" name="Daya Mampu (kW)" fill="#0072BC" radius={[6, 6, 0, 0]} barSize={26} />
                    <Bar dataKey="BebanPuncak" name="Beban Puncak (kW)" fill="#72C8F1" radius={[6, 6, 0, 0]} barSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={Building2}
                title="Belum ada data unit pembangkit"
                description="Tambahkan atau sesuaikan filter unit untuk melihat grafik perbandingan kapasitas."
              />
            )}
          </SectionCard>
        )}

        {/* Line Chart: Tren SDM Tahunan */}
        {(selectedCategory === 'ALL' || selectedCategory === 'sdm') && (
          <SectionCard
            title="Line Chart — Tren Kepegawaian & Proyeksi Pensiun"
            subtitle="Akumulasi tahun masuk, pengangkatan, dan proyeksi pensiun normal"
            icon={TrendingUp}
          >
            {workforceTrendLineData.length > 0 ? (
              <div className="h-[310px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={workforceTrendLineData} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
                    <XAxis
                      dataKey="year"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '14px',
                        border: '1px solid rgba(114,200,241,0.3)',
                        backgroundColor: '#173B65',
                        color: '#ffffff',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                    <Line
                      type="monotone"
                      dataKey="masuk"
                      name="Tahun Masuk"
                      stroke="#0072BC"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#0072BC' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pengangkatan"
                      name="Pengangkatan"
                      stroke="#72C8F1"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#72C8F1' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pensiun"
                      name="Proyeksi Pensiun"
                      stroke="#F9D423"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#F9D423' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="Data historis tanggal belum tersedia"
                description="Tren kepegawaian otomatis terbentuk ketika pegawai memiliki tanggal masuk, pengangkatan, atau pensiun."
              />
            )}
          </SectionCard>
        )}

        {/* Donut Chart 1: Komposisi Status Pegawai */}
        {(selectedCategory === 'ALL' || selectedCategory === 'sdm') && (
          <SectionCard
            title="Donut Chart — Komposisi Status Pegawai"
            subtitle="Sebaran Organik, Tugas Khusus, dan Tenaga Alih Daya"
            icon={Users}
          >
            {statusDonutData.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDonutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
                        outerRadius={86}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {statusDonutData.map((_, idx) => (
                          <Cell key={idx} fill={CORPORATE_COLORS[idx % CORPORATE_COLORS.length]} />
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
                  {statusDonutData.map((item, idx) => {
                    const pct = kpiSummary.totalEmployees
                      ? Math.round((item.value / kpiSummary.totalEmployees) * 100)
                      : 0;
                    return (
                      <div
                        key={item.name}
                        className="p-3 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-xs shrink-0"
                            style={{ backgroundColor: CORPORATE_COLORS[idx % CORPORATE_COLORS.length] }}
                          />
                          <span className="text-xs font-bold text-[#173B65] dark:text-slate-200 truncate">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-[#0072BC] dark:text-[#72C8F1] tabular-nums shrink-0 ml-2">
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
                title="Tidak ada data status pegawai"
                description="Belum ada pegawai pada filter unit atau periode yang dipilih."
              />
            )}
          </SectionCard>
        )}

        {/* Donut Chart 2: Kesehatan Sertifikasi Kompetensi */}
        {(selectedCategory === 'ALL' || selectedCategory === 'sdm') && (
          <SectionCard
            title="Donut Chart — Status Kepatuhan Sertifikasi"
            subtitle="Monitoring sertifikat aktif, akan kedaluwarsa, dan kedaluwarsa"
            icon={Award}
          >
            {certStats.donut.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={certStats.donut}
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
                        outerRadius={86}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {certStats.donut.map((entry, idx) => {
                          const color = entry.name.includes('Kedaluwarsa')
                            ? '#EF4444'
                            : entry.name.includes('Segera')
                            ? '#F9D423'
                            : '#0072BC';
                          return <Cell key={idx} fill={color} />;
                        })}
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
                  {certStats.donut.map((item) => {
                    const color = item.name.includes('Kedaluwarsa')
                      ? '#EF4444'
                      : item.name.includes('Segera')
                      ? '#F9D423'
                      : '#0072BC';
                    const pct = certStats.total ? Math.round((item.value / certStats.total) * 100) : 0;
                    return (
                      <div
                        key={item.name}
                        className="p-3 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-3 h-3 rounded-xs shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-xs font-bold text-[#173B65] dark:text-slate-200 truncate">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-[#173B65] dark:text-slate-100 tabular-nums shrink-0 ml-2">
                          {item.value} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Award}
                title="Belum ada sertifikasi tercatat"
                description="Tambahkan data sertifikasi pegawai untuk melihat statistik masa berlaku sertifikat."
              />
            )}
          </SectionCard>
        )}
      </div>
    </div>
  );
};

export default AnalyticsView;
