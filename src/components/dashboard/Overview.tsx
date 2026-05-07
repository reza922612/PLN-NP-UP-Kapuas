import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Clock, 
  Award, 
  Building2, 
  TrendingUp,
  AlertCircle,
  Briefcase,
  ShieldCheck,
  Search,
  Bell,
  Check,
  Cpu,
  Zap,
  Network
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
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useUnits } from '../../hooks/useUnits';

interface OverviewProps {
  stats: any;
  setActiveTab: (tab: string) => void;
}

const Overview: React.FC<OverviewProps> = ({ stats, setActiveTab }) => {
  const { unitStats } = useUnits();
  const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#d1d5db', '#0ea5e9', '#38bdf8'];

  const dataStatus = [
    { name: 'Organik', value: stats.organic },
    { name: 'Tugas Khusus', value: stats.taskForce },
    { name: 'Alih Daya', value: stats.subcontract },
  ];

  const systemData = useMemo(() => {
    return Object.entries(unitStats.systemBreakdown).map(([name, value]) => ({ name, value }));
  }, [unitStats.systemBreakdown]);

  const typeData = useMemo(() => {
    return Object.entries(unitStats.typeBreakdown).map(([name, value]) => ({ name, value }));
  }, [unitStats.typeBreakdown]);

  const StatCard = ({ title, value, icon: Icon, color, detail, status, unit }: any) => (
    <motion.div 
      whileHover={{ y: -4 }}
      className={cn("stat-card", status === 'cyan' && "border-t-cyan-500", status === 'pln' && "border-t-pln-blue", status === 'amber' && "border-t-amber-500", status === 'purple' && "border-t-purple-500", status === 'blue' && "border-t-blue-600")}
    >
      <div className="flex flex-col h-full justify-between">
        <div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
            {Icon && <Icon size={12} />}
            {title}
          </p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black text-slate-800 tabular-nums">
              {value}
              {unit && <span className="text-[10px] ml-1 text-slate-400 font-bold uppercase">{unit}</span>}
            </h3>
            {detail && (
              <span className={cn(
                "text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter",
                detail.includes('+') ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
              )}>
                {detail}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Dashboard Overview</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pantau Kinerja SDM & Operasional Pembangkit</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-pln-blue uppercase tracking-widest">Region Manajemen</span>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Unit Pelayanan Pusat Listrik</span>
          </div>
        </div>
      </div>

      {/* SDM Stats */}
      <div className="space-y-4">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Statistik Sumber Daya Manusia</label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <StatCard title="Total Pegawai" value={stats.total} status="cyan" detail="+2 Bulan Ini" icon={Users} />
          <StatCard title="Organik" value={stats.organic} status="pln" detail="Aktif" icon={ShieldCheck} />
          <StatCard title="Alih Daya" value={stats.subcontract} status="cyan" detail="Mitra" icon={Briefcase} />
          <StatCard title="Jelang Pensiun" value={stats.retirement || 18} status="amber" detail="Smt II" icon={Clock} />
          <StatCard title="Tugas Khusus" value={stats.taskForce} status="purple" detail="Outbound" icon={Award} />
        </div>
      </div>

      {/* Pembangkit Stats */}
      <div className="space-y-4">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Statistik Operasional Pembangkit</label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <StatCard title="Unit Layanan" value={unitStats.totalUnits} status="blue" detail="LOKASI" icon={Building2} />
          <StatCard title="Total Mesin" value={unitStats.totalMachines} status="blue" detail="TERPASANG" icon={Cpu} />
          <StatCard title="Total DMN" value={unitStats.totalCapacity} status="pln" unit="KW" detail="KAPASITAS" icon={Zap} />
          <StatCard title="Sistem Aktif" value={Object.keys(unitStats.systemBreakdown).length} status="amber" detail="INTEGRASI" icon={Network} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-[32px]">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Kapasitas Pembangkit Per Sistem</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Distribusi DMN (Daya Mampu Nominal)</p>
              </div>
              <TrendingUp size={20} className="text-pln-blue" />
            </div>
            <div className="p-8 h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={systemData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 800 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  />
                  <Bar dataKey="value" fill="#005DAA" radius={[8, 8, 0, 0]} barSize={40}>
                     {systemData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#005DAA' : '#0ea5e9'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8 flex flex-col items-center justify-center space-y-8">
             <div className="w-full flex items-center justify-between">
                <div>
                   <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Status Pegawai Terkini</h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Komposisi Tenaga Kerja</p>
                </div>
                <div className="hidden sm:flex gap-4">
                  {dataStatus.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                       <div className="w-2 h-2 rounded-full" style={{ background: COLORS[idx] }} />
                       <span className="text-[9px] font-black text-slate-500 uppercase">{item.name}</span>
                    </div>
                  ))}
                </div>
             </div>
             <div className="w-full h-[250px]">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                      data={dataStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {dataStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                 </PieChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>

        <div className="space-y-8">
           {/* Machine Type Breakdown */}
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-6 flex flex-col">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 px-2">Komposisi Jenis Pembangkit</h3>
            <div className="space-y-4 px-2">
               {typeData.map((item, index) => (
                 <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                       <span className="text-slate-500">{item.name}</span>
                       <span className="text-pln-blue">{item.value} Unit</span>
                    </div>
                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.value / unitStats.totalMachines) * 100}%` }}
                        className="h-full bg-pln-blue rounded-full shadow-sm"
                       />
                    </div>
                 </div>
               ))}
               {typeData.length === 0 && (
                 <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Data mesin tidak tersedia</p>
                 </div>
               )}
            </div>
          </div>

          <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 p-8">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" />
              Notifikasi Sistem
            </h3>
            <div className="space-y-6">
              <div className="flex gap-4">
                 <div className="w-1.5 h-12 bg-red-500 rounded-full" />
                 <div>
                    <p className="text-[10px] font-black text-slate-800 uppercase">Sertifikasi Kadaluarsa</p>
                    <p className="text-[10px] font-medium text-slate-500 leading-tight">Sertifikasi K3 Deni Setiawan berakhir dalam 5 hari.</p>
                 </div>
              </div>
              <div className="flex gap-4">
                 <div className="w-1.5 h-12 bg-amber-500 rounded-full" />
                 <div>
                    <p className="text-[10px] font-black text-slate-800 uppercase">Update Data Mesin</p>
                    <p className="text-[10px] font-medium text-slate-500 leading-tight">Admin menambahkan 2 mesin Caterpillar di ULPLTD Sanggau.</p>
                 </div>
              </div>
              <div className="flex gap-4">
                 <div className="w-1.5 h-12 bg-pln-blue rounded-full" />
                 <div>
                    <p className="text-[10px] font-black text-slate-800 uppercase">Input Pegawai Baru</p>
                    <p className="text-[10px] font-medium text-slate-500 leading-tight">Ratna Sari ditambahkan ke Unit 3 Ketapang sebagai Staf.</p>
                 </div>
              </div>
            </div>
            <button className="w-full mt-8 py-3 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-colors border border-slate-100">
              Lihat Histori Log
            </button>
          </div>

          <div className="pln-gradient rounded-[32px] shadow-2xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
               <TrendingUp size={120} />
            </div>
            <div className="relative z-10">
              <h3 className="font-black text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
                <Clock size={16} />
                Pensiun Tahun 2026
              </h3>
              <div className="flex items-center justify-between mb-8">
                <div className="text-center">
                  <p className="text-4xl font-black tabular-nums tracking-tighter">12</p>
                  <p className="text-[9px] uppercase opacity-60 font-black tracking-widest">Pegawai</p>
                </div>
                <div className="h-12 w-px bg-white/20"></div>
                <div className="text-center">
                  <p className="text-4xl font-black tabular-nums tracking-tighter">4</p>
                  <p className="text-[9px] uppercase opacity-60 font-black tracking-widest">Kuartal I</p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-widest">Status Dokumen</p>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest">Selesai</span>
                  <div className="bg-green-400 h-2 w-2 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
