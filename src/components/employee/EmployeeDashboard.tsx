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
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';

const EmployeeDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'edit'>('overview');

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-pln-blue animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Memuat Dashboard Anda...</p>
        </div>
      </div>
    );
  }

  if (!profile?.employeeId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Akun Belum Terlink</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Akun Anda belum tersambung dengan data pegawai SIMAP. Silakan hubungi Administrator untuk sinkronisasi email ({profile?.email}).
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={16} /> Keluar Sistem
          </button>
        </div>
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Gagal memuat data pegawai.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-pln-blue p-2 rounded-xl">
              <ShieldCheck className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 leading-none uppercase">Employee Portal</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">SIMAP PLN NP UP KAPUAS</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-xs font-black text-slate-800 leading-none mb-1">{employeeData.fullName}</p>
               <p className="text-[9px] font-bold text-pln-blue uppercase tracking-widest">{employeeData.nip}</p>
             </div>
             <button 
              onClick={handleLogout}
              className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
              title="Logout"
             >
                <LogOut size={20} />
             </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Sidebar Nav */}
          <aside className="lg:w-64 space-y-2">
            <button 
              onClick={() => setActiveTab('overview')}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all",
                activeTab === 'overview' 
                  ? "bg-pln-blue text-white shadow-xl shadow-blue-900/10" 
                  : "bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100 shadow-sm border border-slate-100"
              )}
            >
              <LayoutDashboard size={20} />
              Ringkasan Profil
            </button>
            <button 
              onClick={() => setActiveTab('edit')}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all",
                activeTab === 'edit' 
                  ? "bg-pln-blue text-white shadow-xl shadow-blue-900/10" 
                  : "bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100 shadow-sm border border-slate-100"
              )}
            >
              <Settings size={20} />
              Edit Informasi
            </button>
          </aside>

          {/* Content Area */}
          <main className="flex-1 min-w-0">
            {activeTab === 'overview' ? (
              <EmployeeDetail employee={employeeData} onBack={() => {}} />
            ) : (
              <EmployeeForm 
                initialData={employeeData} 
                isProfileEdit={true} 
                onSuccess={() => setActiveTab('overview')} 
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
