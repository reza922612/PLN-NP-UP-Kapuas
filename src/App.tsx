import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/auth/Login';
import Sidebar from './components/layout/Sidebar';
import Overview from './components/dashboard/Overview';
import EmployeeList from './components/employee/EmployeeList';
import EmployeeForm from './components/employee/EmployeeForm';
import { useEmployees } from './hooks/useEmployees';
import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { Loader2, Bell, Check } from 'lucide-react';
import { Employee } from './types';
import { motion, AnimatePresence } from 'framer-motion';

import EmployeeDetail from './components/employee/EmployeeDetail';
import UnitManagement from './components/dashboard/UnitManagement';
import OrgStructure from './components/dashboard/OrgStructure';
import CertificationList from './components/employee/CertificationList';

const MainApp: React.FC = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);
  const { employees, stats, loading: employeesLoading } = useEmployees(!!user && !!profile);

  const notifications = [
    { id: 1, title: 'Input Pegawai Baru', desc: 'Deni Setiawan telah ditambahkan ke sistem', time: '2 jam yang lalu' },
    { id: 2, title: 'Sertifikasi Kadaluarsa', desc: 'Sertifikasi K3 Ratna Sari berakhir dalam 5 hari', time: '5 jam yang lalu' },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleLogout = () => {
    signOut(auth);
  };

  const renderContent = () => {
    if (selectedEmployee) {
      return <EmployeeDetail employee={selectedEmployee} onBack={() => setSelectedEmployee(null)} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Overview stats={stats} setActiveTab={setActiveTab} />;
      case 'employees':
        return <EmployeeList 
          employees={employees} 
          onView={(emp) => setSelectedEmployee(emp)} 
        />;
      case 'add-employee':
        return <EmployeeForm />;
      case 'units':
        return <UnitManagement />;
      case 'org-structure':
        return <OrgStructure />;
      case 'certifications':
        return <CertificationList />;
      default:
        return (
          <div className="flex items-center justify-center h-[600px] text-slate-400 font-medium">
            Fitur {activeTab} sedang dalam pengembangan.
          </div>
        );
    }
  };

  return (
    <div className="flex bg-[#F8FAFC] min-h-screen font-sans overflow-x-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedEmployee(null);
        }}
        onLogout={handleLogout} 
        role={profile?.role}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <main className="flex-1 p-8 overflow-y-auto h-screen relative transition-all duration-300">
        <header className="flex items-center justify-between mb-8 sticky top-0 bg-[#F8FAFC]/80 backdrop-blur-md py-4 z-10 -mx-8 px-8">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
              {selectedEmployee ? 'Detail Pegawai' : activeTab.replace('-', ' ')}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setUnreadCount(0);
                }}
                className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-pln-blue hover:shadow-md transition-all relative"
              >
                <Bell size={20} />
                {unreadCount > 0 && <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full font-black border-2 border-white">{unreadCount}</span>}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-14 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                      <h4 className="font-black text-slate-800 text-[10px] uppercase tracking-widest">Notifikasi Baru</h4>
                      <Check size={14} className="text-slate-300" />
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.map(notif => (
                        <div key={notif.id} className="p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 cursor-pointer">
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{notif.title}</p>
                            <span className="text-[9px] text-slate-400 font-bold">{notif.time}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{notif.desc}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800">{profile?.displayName || user.email}</p>
              <p className="text-[10px] text-pln-blue font-bold uppercase tracking-wider">{profile?.role?.replace('_', ' ') || 'Admin'}</p>
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowProfile(!showProfile)}
                className="w-10 h-10 rounded-xl bg-pln-blue flex items-center justify-center text-white font-bold shadow-lg shadow-blue-100 hover:scale-110 active:scale-95 transition-all outline-none"
              >
                {(profile?.displayName?.[0] || user.email?.[0] || 'A').toUpperCase()}
              </button>

              <AnimatePresence>
                {showProfile && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-14 right-0 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden p-6"
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-20 h-20 rounded-2xl bg-pln-blue flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-blue-100">
                        {(profile?.displayName?.[0] || user.email?.[0] || 'A').toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-tight">{profile?.displayName || 'Admin User'}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{user.email}</p>
                      </div>
                      <div className="w-full pt-4 border-t border-slate-50">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest mb-4">
                          <span className="text-slate-400">Role</span>
                          <span className="text-pln-blue bg-blue-50 px-2 py-0.5 rounded">{profile?.role?.replace('_', ' ') || 'Super Admin'}</span>
                        </div>
                        <button 
                          onClick={handleLogout}
                          className="w-full py-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors"
                        >
                          Log Out
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
