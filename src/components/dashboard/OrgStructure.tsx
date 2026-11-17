import React, { useMemo, useState } from 'react';
import { useEmployees } from '../../hooks/useEmployees';
import {
  Users,
  User,
  ShieldCheck,
  Building2,
  Trophy,
  Search,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  ExternalLink,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Employee } from '../../types';
import { cn } from '../../lib/utils';
import { PageHeader, EmptyState, CardGridSkeleton } from '../common/DashboardUI';

interface OrgStructureProps {
  onSelectEmployee?: (emp: Employee) => void;
}

const OrgStructure: React.FC<OrgStructureProps> = ({ onSelectEmployee }) => {
  const { employees, loading } = useEmployees();
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllStaff, setShowAllStaff] = useState(false);
  const [inspectedEmployee, setInspectedEmployee] = useState<Employee | null>(null);

  const unitOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => e.unitPelaksana && set.add(e.unitPelaksana));
    return Array.from(set).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return employees.filter((e) => {
      const matchUnit = selectedUnit === 'ALL' || e.unitPelaksana === selectedUnit;
      const matchSearch =
        !q ||
        e.fullName.toLowerCase().includes(q) ||
        e.jabatanLengkap?.toLowerCase().includes(q) ||
        e.subUnit?.toLowerCase().includes(q);
      return matchUnit && matchSearch;
    });
  }, [employees, selectedUnit, searchTerm]);

  const hierarchy = useMemo(() => {
    const getLevel = (jabatan: string) => {
      const j = (jabatan || '').toLowerCase();
      if (j.includes('manager unit') || j.includes('manajer unit')) return 0;
      if (j.includes('assistant manager') || j.includes('asman')) return 1;
      if (j.includes('team leader') || j.includes('tl ')) return 2;
      return 3;
    };

    return {
      managers: filteredEmployees.filter((e) => getLevel(e.jabatanLengkap) === 0),
      asmans: filteredEmployees.filter((e) => getLevel(e.jabatanLengkap) === 1),
      tls: filteredEmployees.filter((e) => getLevel(e.jabatanLengkap) === 2),
      staffs: filteredEmployees.filter((e) => getLevel(e.jabatanLengkap) === 3),
    };
  }, [filteredEmployees]);

  const NodeCard: React.FC<{
    employee: Employee;
    tier: 'top' | 'mid' | 'lead';
  }> = ({ employee, tier }) => (
    <motion.button
      type="button"
      onClick={() => setInspectedEmployee(employee)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={cn(
        'text-left corporate-card p-4 flex items-center gap-3.5 min-w-[260px] max-w-[310px] w-full sm:w-auto relative transition-all hover:border-[#0072BC] dark:hover:border-[#72C8F1]',
        tier === 'top' && 'border-t-4 border-t-[#F9D423] shadow-md',
        tier === 'mid' && 'border-t-4 border-t-[#0072BC]',
        tier === 'lead' && 'border-t-4 border-t-[#72C8F1]'
      )}
    >
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0 font-extrabold text-sm',
          tier === 'top'
            ? 'bg-amber-50 dark:bg-[#F9D423]/15 text-amber-600 dark:text-[#F9D423]'
            : 'bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1]'
        )}
      >
        {employee.photoUrl ? (
          <img src={employee.photoUrl} alt={employee.fullName} className="w-full h-full object-cover" />
        ) : (
          employee.fullName?.[0]?.toUpperCase() || <User size={22} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-xs font-extrabold text-[#173B65] dark:text-slate-100 truncate">
          {employee.fullName}
        </h4>
        <p
          className={cn(
            'text-[11px] font-bold truncate mt-0.5',
            tier === 'top' ? 'text-amber-600 dark:text-[#F9D423]' : 'text-[#0072BC] dark:text-[#72C8F1]'
          )}
        >
          {employee.jabatanLengkap}
        </p>
        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
          {employee.subUnit || employee.unitPelaksana}
        </p>
      </div>
      {tier === 'top' && (
        <Trophy
          size={15}
          className="absolute top-3 right-3 text-amber-500 dark:text-[#F9D423]"
        />
      )}
    </motion.button>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Struktur Organisasi UP Kapuas"
          subtitle="Menyusun hierarki jabatan dan profil pejabat unit..."
          icon={ShieldCheck}
        />
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  const displayedStaffs = showAllStaff ? hierarchy.staffs : hierarchy.staffs.slice(0, 12);

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Struktur Organisasi UP Kapuas"
        subtitle="Hierarki kepemimpinan unit, asisten manajer, team leader, dan staf pelaksana"
        icon={ShieldCheck}
        badge={`${filteredEmployees.length} Personel`}
      />

      {/* Filter Bar */}
      <div className="corporate-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama pejabat, jabatan, atau sub unit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
          />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-[#F4F8FB] dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
          <Building2 size={14} className="text-[#0072BC] dark:text-[#72C8F1]" />
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="bg-transparent text-xs font-bold text-[#173B65] dark:text-slate-200 outline-none"
          >
            <option value="ALL" className="dark:bg-slate-900">Semua Unit Pelaksana</option>
            {unitOptions.map((u) => (
              <option key={u} value={u} className="dark:bg-slate-900">
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredEmployees.length === 0 ? (
        <div className="corporate-card">
          <EmptyState
            icon={ShieldCheck}
            title="Struktur organisasi tidak ditemukan"
            description="Sesuaikan filter unit atau kata kunci pencarian jabatan untuk melihat hierarki."
          />
        </div>
      ) : (
        <div className="space-y-8 pt-2">
          {/* Level 0: Manajer Unit */}
          <div className="flex flex-col items-center space-y-4">
            <div className="text-center">
              <span className="px-3 py-1 rounded-md bg-amber-50 dark:bg-[#F9D423]/15 text-amber-700 dark:text-[#F9D423] text-[11px] font-bold uppercase tracking-wider">
                Level 1 · Manajerial Unit ({hierarchy.managers.length})
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-5 w-full">
              {hierarchy.managers.length > 0 ? (
                hierarchy.managers.map((m) => <NodeCard key={m.id} employee={m} tier="top" />)
              ) : (
                <p className="text-xs text-slate-400">Tidak ada jabatan Manajer Unit pada filter ini.</p>
              )}
            </div>
          </div>

          <div className="w-px h-8 bg-[#72C8F1]/60 mx-auto" />

          {/* Level 1: Assistant Manager */}
          <div className="flex flex-col items-center space-y-4">
            <span className="px-3 py-1 rounded-md bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] text-[11px] font-bold uppercase tracking-wider">
              Level 2 · Assistant Manager ({hierarchy.asmans.length})
            </span>
            <div className="flex flex-wrap justify-center gap-4 w-full">
              {hierarchy.asmans.length > 0 ? (
                hierarchy.asmans.map((m) => <NodeCard key={m.id} employee={m} tier="mid" />)
              ) : (
                <p className="text-xs text-slate-400">Tidak ada Assistant Manager pada filter ini.</p>
              )}
            </div>
          </div>

          <div className="w-px h-8 bg-[#72C8F1]/60 mx-auto" />

          {/* Level 2: Team Leaders */}
          <div className="flex flex-col items-center space-y-4">
            <span className="px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[#173B65] dark:text-slate-200 text-[11px] font-bold uppercase tracking-wider">
              Level 3 · Team Leader ({hierarchy.tls.length})
            </span>
            <div className="flex flex-wrap justify-center gap-4 w-full">
              {hierarchy.tls.length > 0 ? (
                hierarchy.tls.map((m) => <NodeCard key={m.id} employee={m} tier="lead" />)
              ) : (
                <p className="text-xs text-slate-400">Tidak ada Team Leader pada filter ini.</p>
              )}
            </div>
          </div>

          <div className="w-px h-8 bg-[#72C8F1]/60 mx-auto" />

          {/* Level 3: Staff Pelaksana */}
          <div className="corporate-card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#173B65] dark:text-slate-100">
                  Staf &amp; Pelaksana Operasional ({hierarchy.staffs.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Klik kartu pegawai untuk meninjau profil jabatan dan kontak singkat
                </p>
              </div>
              {hierarchy.staffs.length > 12 && (
                <button
                  type="button"
                  onClick={() => setShowAllStaff((p) => !p)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] rounded-xl text-xs font-bold hover:bg-[#0072BC] hover:text-white transition-colors"
                >
                  <Users size={14} />
                  {showAllStaff
                    ? 'Tampilkan Lebih Sedikit'
                    : `Tampilkan Semua (${hierarchy.staffs.length})`}
                  {showAllStaff ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {displayedStaffs.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setInspectedEmployee(m)}
                  className="text-left p-3 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:border-[#0072BC] transition-colors flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#0E1A2E] text-[#0072BC] dark:text-[#72C8F1] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                    {m.photoUrl ? (
                      <img src={m.photoUrl} alt={m.fullName} className="w-full h-full object-cover" />
                    ) : (
                      m.fullName?.[0]?.toUpperCase() || 'S'
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#173B65] dark:text-slate-100 truncate">
                      {m.fullName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {m.jabatanLengkap}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Profile Modal */}
      <AnimatePresence>
        {inspectedEmployee && (
          <div
            className="fixed inset-0 z-50 bg-[#071120]/65 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setInspectedEmployee(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="corporate-card max-w-md w-full p-6 space-y-5 relative"
            >
              <button
                type="button"
                onClick={() => setInspectedEmployee(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center font-extrabold text-xl overflow-hidden shrink-0">
                  {inspectedEmployee.photoUrl ? (
                    <img
                      src={inspectedEmployee.photoUrl}
                      alt={inspectedEmployee.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    inspectedEmployee.fullName?.[0]?.toUpperCase() || 'P'
                  )}
                </div>
                <div className="min-w-0 pr-6">
                  <h4 className="text-base font-extrabold text-[#173B65] dark:text-slate-100 truncate">
                    {inspectedEmployee.fullName}
                  </h4>
                  <p className="text-xs font-bold text-[#0072BC] dark:text-[#72C8F1]">
                    {inspectedEmployee.jabatanLengkap}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                    NIP {inspectedEmployee.nip}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                  <Building2 size={14} className="text-[#0072BC] dark:text-[#72C8F1] shrink-0" />
                  <span>
                    {inspectedEmployee.unitPelaksana} · {inspectedEmployee.subUnit}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                  <Mail size={14} className="text-[#0072BC] dark:text-[#72C8F1] shrink-0" />
                  <span className="truncate">{inspectedEmployee.emailKorporat || '-'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                  <Phone size={14} className="text-[#0072BC] dark:text-[#72C8F1] shrink-0" />
                  <span className="font-mono">{inspectedEmployee.noTelepon || '-'}</span>
                </div>
              </div>

              {onSelectEmployee && (
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectedEmployee;
                    setInspectedEmployee(null);
                    onSelectEmployee(target);
                  }}
                  className="w-full py-2.5 bg-[#0072BC] text-white rounded-xl text-xs font-bold hover:bg-[#173B65] transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink size={14} />
                  Buka Profil Lengkap Pegawai
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrgStructure;
