import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Employee } from '../../types';
import EmployeeDetail from './EmployeeDetail';
import EmployeeForm from './EmployeeForm'; // I will need to modify this to support editing
import { 
  User, 
  Settings, 
  BookOpen, 
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Fingerprint,
  Plane
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import PlnNpLogo from '../common/PlnNpLogo';
import ThemeToggle from '../common/ThemeToggle';
import BiometricSettingsCard from '../common/BiometricSettingsCard';
import SppdManagement from '../sppd/SppdManagement';

const EmployeeDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'biometric' | 'sppd'>('overview');

  useEffect(() => {
    const fetchEmployee = async () => {
      if (profile?.employeeId) {
        try {
          const docRef = doc(db, 'employees', profile.employeeId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setEmployeeData({ id: docSnap.id, ...docSnap.data() } as Employee);
          }
        } catch (error) {
          console.error("Error fetching employee data:", error);
        }
      }
      setLoading(false);
    };

    fetchEmployee();
  }, [profile?.employeeId]);

  const handleLogout = () => {
    signOut(auth);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-pln-blue dark:text-cyan-400 animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Memuat Dashboard Anda...</p>
        </div>
      </div>
    );
  }

  if (!profile?.employeeId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-50 dark:bg-amber-950/50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Akun Belum Terlink</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Akun Anda belum tersambung dengan data pegawai SIMAP. Silakan hubungi Administrator untuk sinkronisasi email ({profile?.email}).
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full py-4 bg-slate-900 dark:bg-pln-blue text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={16} /> Keluar Sistem
          </button>
        </div>
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-slate-500 dark:text-slate-400">Gagal memuat data pegawai.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F8FB] dark:bg-[#071120] flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 bg-white/95 dark:bg-[#0B172A]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-30">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <PlnNpLogo className="h-8 w-auto hidden sm:block" />
            <PlnNpLogo variant="icon" className="h-8 w-8 sm:hidden" />
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
            <div>
              <h1 className="text-sm font-extrabold text-[#173B65] dark:text-slate-100 leading-none uppercase tracking-tight">
                Portal Pegawai
              </h1>
              <p className="text-[10px] font-bold text-[#0072BC] dark:text-[#72C8F1] uppercase tracking-widest mt-1">
                SIMAP PLN NP UP KAPUAS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-[#173B65] dark:text-slate-100 leading-none mb-1">
                {employeeData.fullName}
              </p>
              <p className="text-[10px] font-mono font-bold text-[#0072BC] dark:text-[#72C8F1]">
                {employeeData.nip}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2.5 bg-red-50 dark:bg-red-950/50 text-red-500 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
              title="Keluar Sistem"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 pt-18">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 lg:py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Nav */}
            <aside className="lg:w-64 space-y-2.5 shrink-0 lg:sticky lg:top-24 lg:self-start">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all',
                activeTab === 'overview'
                  ? 'bg-[#0072BC] text-white shadow-sm'
                  : 'bg-white dark:bg-[#0E1A2E] text-slate-500 dark:text-slate-300 hover:text-[#173B65] border border-slate-200/80 dark:border-slate-800'
              )}
            >
              <LayoutDashboard size={18} />
              Ringkasan Profil
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sppd')}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all',
                activeTab === 'sppd'
                  ? 'bg-[#0072BC] text-white shadow-sm'
                  : 'bg-white dark:bg-[#0E1A2E] text-slate-500 dark:text-slate-300 hover:text-[#173B65] border border-slate-200/80 dark:border-slate-800'
              )}
            >
              <Plane size={18} />
              Pengajuan SPPD
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all',
                activeTab === 'edit'
                  ? 'bg-[#0072BC] text-white shadow-sm'
                  : 'bg-white dark:bg-[#0E1A2E] text-slate-500 dark:text-slate-300 hover:text-[#173B65] border border-slate-200/80 dark:border-slate-800'
              )}
            >
              <Settings size={18} />
              Edit Informasi Kontak
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('biometric')}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all',
                activeTab === 'biometric'
                  ? 'bg-[#0072BC] text-white shadow-sm'
                  : 'bg-white dark:bg-[#0E1A2E] text-slate-500 dark:text-slate-300 hover:text-[#173B65] border border-slate-200/80 dark:border-slate-800'
              )}
            >
              <Fingerprint size={18} />
              Keamanan Biometrik
            </button>

            <div className="corporate-card p-4 space-y-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Tema Tampilan
              </p>
              <ThemeToggle variant="pill" className="w-full justify-between" />
            </div>
          </aside>

          {/* Content Area */}
          <main className="flex-1 min-w-0">
            {activeTab === 'overview' ? (
              <EmployeeDetail employee={employeeData} onBack={() => {}} />
            ) : activeTab === 'sppd' ? (
              <SppdManagement defaultEmployee={employeeData} canApprove={false} compactTitle />
            ) : activeTab === 'biometric' ? (
              <BiometricSettingsCard />
            ) : (
              <EmployeeForm
                initialData={employeeData}
                isProfileEdit={true}
                onSuccess={() => setActiveTab('overview')}
                onCancel={() => setActiveTab('overview')}
              />
            )}
          </main>
        </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
