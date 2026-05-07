import React, { useMemo } from 'react';
import { useEmployees } from '../../hooks/useEmployees';
import { 
  Users, 
  ChevronDown, 
  ChevronRight, 
  User,
  ShieldCheck,
  Building2,
  Trophy
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const OrgStructure: React.FC = () => {
  const { employees, loading } = useEmployees();

  const hierarchy = useMemo(() => {
    if (!employees.length) return null;

    // Define priority levels
    const getLevel = (jabatan: string) => {
      const j = jabatan.toLowerCase();
      if (j.includes('manager unit') || j.includes('manajer unit')) return 0;
      if (j.includes('assistant manager') || j.includes('asman')) return 1;
      if (j.includes('team leader') || j.includes('tl')) return 2;
      return 3; // Staff and others
    };

    const managers = employees.filter(e => getLevel(e.jabatanLengkap) === 0);
    const asmans = employees.filter(e => getLevel(e.jabatanLengkap) === 1);
    const tls = employees.filter(e => getLevel(e.jabatanLengkap) === 2);
    const staffs = employees.filter(e => getLevel(e.jabatanLengkap) === 3);

    // Grouping logic: This is a placeholder as we don't have direct reporting. 
    // We'll show it as a level-based tree grouped by Unit then Sub-unit.
    
    return { managers, asmans, tls, staffs };
  }, [employees]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <div className="w-12 h-12 border-4 border-pln-blue border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Menyusun Struktur...</p>
    </div>
  );

  const NodeCard = ({ employee, type }: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-4 min-w-[280px] relative transition-shadow hover:shadow-xl",
        type === 'top' ? "border-amber-400 bg-amber-50/10 ring-4 ring-amber-400/10" : 
        type === 'mid' ? "border-pln-blue bg-blue-50/5" : "border-slate-100"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner",
        type === 'top' ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400"
      )}>
        {employee.photoUrl ? (
          <img src={employee.photoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <User size={24} />
        )}
      </div>
      <div>
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight line-clamp-1">{employee.fullName}</h4>
        <p className={cn(
          "text-[9px] font-black uppercase tracking-widest mt-1",
          type === 'top' ? "text-amber-600" : "text-pln-blue"
        )}>{employee.jabatanLengkap}</p>
        <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">{employee.subUnit || employee.unitPelaksana}</p>
      </div>
      {type === 'top' && <Trophy size={14} className="absolute -top-2 -right-2 text-amber-500 bg-white rounded-full p-0.5 shadow-sm" />}
    </motion.div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24">
      {/* Level 0: Managers */}
      <div className="flex flex-col items-center space-y-8">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Manajerial Unit</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Pucuk Pimpinan Unit Pelaksana</p>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          {hierarchy?.managers.map(m => <NodeCard key={m.id} employee={m} type="top" />)}
        </div>
      </div>

      {/* Level 1: Assistant Managers */}
      <div className="flex flex-col items-center space-y-8">
        <div className="h-12 w-0.5 bg-slate-100" />
        <div className="text-center space-y-1">
          <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest italic">Assistant Manager</h3>
        </div>
        <div className="flex flex-wrap justify-center gap-6 max-w-5xl">
          {hierarchy?.asmans.map(m => <NodeCard key={m.id} employee={m} type="mid" />)}
        </div>
      </div>

      {/* Level 2: Team Leaders */}
      <div className="flex flex-col items-center space-y-8">
        <div className="h-12 w-0.5 bg-slate-100" />
        <div className="text-center space-y-1">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Team Leader</h3>
        </div>
        <div className="flex flex-wrap justify-center gap-4 max-w-6xl">
          {hierarchy?.tls.map(m => <NodeCard key={m.id} employee={m} />)}
        </div>
      </div>

      {/* Level 3: Staff (Optional high density view) */}
      <div className="flex flex-col items-center space-y-8">
        <div className="h-12 w-0.5 bg-slate-100" />
        <button className="flex items-center gap-2 px-6 py-2 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
          <Users size={14} />
          Tampilkan {hierarchy?.staffs.length} Staf Pelaksana
        </button>
        <div className="flex flex-wrap justify-center gap-3 opacity-50 hover:opacity-100 transition-opacity">
          {hierarchy?.staffs.slice(0, 12).map(m => (
             <div key={m.id} className="bg-white p-2 rounded-xl border border-slate-50 shadow-sm flex items-center gap-2 group cursor-default">
               <div className="w-6 h-6 rounded-md bg-slate-100 shrink-0 overflow-hidden">
                 {m.photoUrl && <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />}
               </div>
               <span className="text-[9px] font-bold text-slate-400 group-hover:text-slate-600 transition-colors">{m.fullName.split(' ')[0]}</span>
             </div>
          ))}
          {(hierarchy?.staffs.length ?? 0) > 12 && (
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-[9px] font-bold text-slate-400 flex items-center justify-center w-24">
              +{ (hierarchy?.staffs.length ?? 0) - 12 } Lainnya
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrgStructure;
