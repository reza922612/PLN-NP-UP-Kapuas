import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  X,
  Users,
  Building2,
  Award,
  LayoutDashboard,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Employee, Unit } from '../../types';

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  units: Unit[];
  role?: string;
  onNavigateTab: (tab: string) => void;
  onSelectEmployee: (emp: Employee) => void;
}

const NAV_SHORTCUTS = [
  { id: 'dashboard', label: 'Dashboard Overview', desc: 'Ringkasan KPI SDM & Pembangkit' },
  { id: 'employees', label: 'Data Pegawai', desc: 'Daftar lengkap, filter, dan ekspor CSV/Excel/PDF' },
  { id: 'add-employee', label: 'Input Pegawai', desc: 'Tambah profil pegawai baru', hideViewer: true },
  { id: 'analytics', label: 'Laporan & Analitik', desc: 'Grafik Bar, Line, Donut dan ekspor analitik' },
  { id: 'certifications', label: 'Data Sertifikasi', desc: 'Pemantauan masa berlaku sertifikat' },
  { id: 'org-structure', label: 'Struktur Organisasi', desc: 'Hierarki jabatan dan profil personel' },
  { id: 'units', label: 'Data Pembangkit', desc: 'Unit layanan, mesin, dan pemetaan', superAdminOnly: true },
  { id: 'activity-log', label: 'Activity Log', desc: 'Riwayat aktivitas administratif sistem' },
  { id: 'settings', label: 'Pengaturan', desc: 'Profil, tema tampilan, dan manajemen peran' },
];

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  open,
  onClose,
  employees,
  units,
  role,
  onNavigateTab,
  onSelectEmployee,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const q = query.trim().toLowerCase();

  const matchedMenus = useMemo(() => {
    return NAV_SHORTCUTS.filter((item) => {
      if (item.hideViewer && role === 'viewer') return false;
      if (item.superAdminOnly && role !== 'super_admin') return false;
      if (!q) return true;
      return item.label.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q);
    }).slice(0, 5);
  }, [q, role]);

  const matchedEmployees = useMemo(() => {
    if (!q) return employees.slice(0, 4);
    return employees
      .filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.nip.toLowerCase().includes(q) ||
          e.jabatanLengkap?.toLowerCase().includes(q) ||
          e.unitPelaksana?.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [q, employees]);

  const matchedUnits = useMemo(() => {
    if (!q) return [];
    return units
      .filter(
        (u) =>
          u.namaUnitLayananPusatListrik.toLowerCase().includes(q) ||
          ((u as any).alamatLengkap || u.alamat || '').toLowerCase().includes(q)
      )
      .slice(0, 4);
  }, [q, units]);

  const matchedCerts = useMemo(() => {
    if (!q) return [];
    const results: { title: string; holder: string; emp: Employee }[] = [];
    for (const emp of employees) {
      for (const cert of emp.certifications || []) {
        if (cert.namaSertifikasi.toLowerCase().includes(q)) {
          results.push({ title: cert.namaSertifikasi, holder: emp.fullName, emp });
        }
        if (results.length >= 4) break;
      }
      if (results.length >= 4) break;
    }
    return results;
  }, [q, employees]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-[#071120]/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white dark:bg-[#0E1A2E] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <Search size={18} className="text-[#0072BC] dark:text-[#72C8F1] shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari pegawai, NIP, sertifikasi, unit pembangkit, atau halaman..."
                className="flex-1 bg-transparent text-sm font-medium text-[#173B65] dark:text-slate-100 placeholder:text-slate-400 outline-none"
              />
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto p-4 space-y-5">
              {matchedEmployees.length > 0 && (
                <div className="space-y-1.5">
                  <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Pegawai ({matchedEmployees.length})
                  </p>
                  {matchedEmployees.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => {
                        onSelectEmployee(emp);
                        onClose();
                      }}
                      className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 text-left hover:bg-[#EAF6FC]/70 dark:hover:bg-[#0072BC]/15 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center text-xs font-extrabold shrink-0">
                          {emp.fullName?.[0]?.toUpperCase() || <Users size={14} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#173B65] dark:text-slate-100 truncate">
                            {emp.fullName}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {emp.nip} · {emp.jabatanLengkap}
                          </p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 group-hover:text-[#0072BC] dark:group-hover:text-[#72C8F1] shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {matchedCerts.length > 0 && (
                <div className="space-y-1.5">
                  <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Sertifikasi Kompetensi
                  </p>
                  {matchedCerts.map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        onSelectEmployee(c.emp);
                        onClose();
                      }}
                      className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 text-left hover:bg-[#EAF6FC]/70 dark:hover:bg-[#0072BC]/15 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-[#F9D423]/15 text-amber-600 dark:text-[#F9D423] flex items-center justify-center shrink-0">
                          <Award size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#173B65] dark:text-slate-100 truncate">
                            {c.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            Pemegang: {c.holder}
                          </p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {matchedUnits.length > 0 && (
                <div className="space-y-1.5">
                  <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Unit Layanan Pembangkit
                  </p>
                  {matchedUnits.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        onNavigateTab(role === 'super_admin' ? 'units' : 'analytics');
                        onClose();
                      }}
                      className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 text-left hover:bg-[#EAF6FC]/70 dark:hover:bg-[#0072BC]/15 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center shrink-0">
                          <Building2 size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#173B65] dark:text-slate-100 truncate">
                            {u.namaUnitLayananPusatListrik}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {u.mesin?.length || 0} unit mesin terpasang
                          </p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {matchedMenus.length > 0 && (
                <div className="space-y-1.5">
                  <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Navigasi Cepat
                  </p>
                  {matchedMenus.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onNavigateTab(item.id);
                        onClose();
                      }}
                      className="w-full px-3 py-2 rounded-xl flex items-center justify-between gap-3 text-left hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 flex items-center justify-center shrink-0">
                          <LayoutDashboard size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#173B65] dark:text-slate-100">
                            {item.label}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{item.desc}</p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {matchedEmployees.length === 0 &&
                matchedMenus.length === 0 &&
                matchedUnits.length === 0 &&
                matchedCerts.length === 0 && (
                  <p className="py-10 text-center text-xs font-semibold text-slate-400">
                    Tidak ditemukan hasil untuk &ldquo;{query}&rdquo;.
                  </p>
                )}
            </div>

            <div className="px-5 py-2.5 bg-[#F4F8FB] dark:bg-[#091426] border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-semibold text-slate-400">
              <span>Tekan ESC untuk menutup</span>
              <span>SIMAP Global Search · UP Kapuas</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GlobalSearchModal;
