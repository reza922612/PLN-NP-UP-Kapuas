import React, { useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './components/auth/Login';
import Sidebar from './components/layout/Sidebar';
import GlobalSearchModal from './components/layout/GlobalSearchModal';
import Overview from './components/dashboard/Overview';
import AnalyticsView from './components/dashboard/AnalyticsView';
import EmployeeList from './components/employee/EmployeeList';
import EmployeeForm from './components/employee/EmployeeForm';
import { useEmployees } from './hooks/useEmployees';
import { useUnits } from './hooks/useUnits';
import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { Loader2, Bell, BellRing, Settings, Menu, Search, LogOut, ShieldCheck } from 'lucide-react';
import { Employee } from './types';
import { motion, AnimatePresence } from 'framer-motion';

import EmployeeDetail from './components/employee/EmployeeDetail';
import UnitManagement from './components/dashboard/UnitManagement';
import OrgStructure from './components/dashboard/OrgStructure';
import ActivityLog from './components/dashboard/ActivityLog';
import SettingsView from './components/dashboard/SettingsView';
import CertificationList from './components/employee/CertificationList';
import SppdManagement from './components/sppd/SppdManagement';
import LandingPage from './components/public/LandingPage';
import PublicEmployeeVerify from './components/public/PublicEmployeeVerify';
import EmployeeDashboard from './components/employee/EmployeeDashboard';
import ThemeToggle from './components/common/ThemeToggle';
import { useActivityLogs } from './hooks/useActivityLogs';
import { syncPublicStats } from './lib/publicStats';
import { extractEvaluatedCertifications } from './lib/certificationStatus';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const TAB_TITLES: Record<string, string> = {
  dashboard: 'Dashboard Executive',
  analytics: 'Laporan & Analitik',
  employees: 'Data Pegawai',
  'add-employee': 'Input Pegawai Baru',
  sppd: 'Pengajuan SPPD',
  certifications: 'Data Sertifikasi',
  'org-structure': 'Struktur Organisasi',
  units: 'Data Pembangkit',
  'activity-log': 'Activity Log',
  settings: 'Pengaturan Sistem',
};

const MainApp: React.FC = () => {
  const { user, profile, loading: authLoading, biometricEnrollmentActive } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLogin, setShowLogin] = useState(false);
  const [verifyEmployeeId, setVerifyEmployeeId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('verify');
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [hasViewedNotifications, setHasViewedNotifications] = useState(false);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  const isDashboardUser = !!user && !!profile && profile.role !== 'employee';
  const { employees, stats, loading: employeesLoading, updateEmployee, deleteEmployee } = useEmployees(isDashboardUser);
  const { units } = useUnits();
  const { logs: recentLogs } = useActivityLogs(isDashboardUser, 6);
  const expiringCerts30Days = useMemo(
    () =>
      isDashboardUser
        ? extractEvaluatedCertifications(employees).filter((c) => c.statusType === 'warning')
        : [],
    [isDashboardUser, employees]
  );
  const unreadCount = hasViewedNotifications
    ? 0
    : Math.min(recentLogs.length + expiringCerts30Days.length, 9);

  const activeSelectedEmployee = selectedEmployee
    ? employees.find((e) => e.id === selectedEmployee.id) || selectedEmployee
    : null;
  const activeEditingEmployee = editingEmployee
    ? employees.find((e) => e.id === editingEmployee.id) || editingEmployee
    : null;

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setVerifyEmployeeId(params.get('verify'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isDashboardUser) setShowGlobalSearch((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowGlobalSearch(false);
        setShowNotifications(false);
        setShowProfile(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDashboardUser]);

  useEffect(() => {
    if ((profile?.role === 'admin' || profile?.role === 'super_admin') && !employeesLoading) {
      syncPublicStats(employees);
    }
  }, [profile?.role, employeesLoading, employees]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeTab, selectedEmployee?.id, editingEmployee?.id]);

  const openPublicVerification = (empId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('verify', empId);
    window.history.pushState({}, '', url.toString());
    setVerifyEmployeeId(empId);
  };

  const closePublicVerification = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('verify');
    window.history.pushState({}, '', url.toString());
    setVerifyEmployeeId(null);
  };

  const quotaBanner = mapsQuotaExceeded ? (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
      <span>
        Google Maps Platform quota reached. If you are the app owner, visit{' '}
        <a
          href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold text-amber-950 hover:text-amber-800"
        >
          maps developer site
        </a>{' '}
        for instructions to update your account.
      </span>
    </div>
  ) : null;

  if (verifyEmployeeId) {
    return (
      <>
        {quotaBanner}
        <PublicEmployeeVerify
          employeeId={verifyEmployeeId}
          onBackHome={closePublicVerification}
        />
      </>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F8FB] dark:bg-[#071120]">
        <Loader2 className="animate-spin text-[#0072BC] dark:text-[#72C8F1]" size={40} />
      </div>
    );
  }

  if (!user && !showLogin) {
    return (
      <>
        {quotaBanner}
        <LandingPage
          onStart={() => setShowLogin(true)}
          onVerifyEmployee={openPublicVerification}
        />
      </>
    );
  }

  if ((!user || biometricEnrollmentActive) && showLogin) {
    return (
      <>
        {quotaBanner}
        <Login onBack={() => setShowLogin(false)} />
      </>
    );
  }

  if (profile?.role === 'employee') {
    return (
      <>
        {quotaBanner}
        <EmployeeDashboard />
      </>
    );
  }

  const handleLogout = () => {
    signOut(auth);
    setShowLogin(false);
  };

  const renderContent = () => {
    if (activeEditingEmployee) {
      return (
        <EmployeeForm
          initialData={activeEditingEmployee}
          onSuccess={() => {
            setSelectedEmployee(activeEditingEmployee);
            setEditingEmployee(null);
          }}
          onCancel={() => {
            setEditingEmployee(null);
          }}
        />
      );
    }

    if (activeSelectedEmployee) {
      return (
        <EmployeeDetail
          employee={activeSelectedEmployee}
          onBack={() => setSelectedEmployee(null)}
          onEdit={() => setEditingEmployee(activeSelectedEmployee)}
          onPreviewVerify={openPublicVerification}
          onUpdateEmployee={updateEmployee}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Overview
            stats={stats}
            employees={employees}
            loading={employeesLoading}
            setActiveTab={setActiveTab}
            onSelectEmployee={(emp) => setSelectedEmployee(emp)}
          />
        );
      case 'analytics':
        return <AnalyticsView employees={employees} loading={employeesLoading} />;
      case 'employees':
        return (
          <EmployeeList
            employees={employees}
            loading={employeesLoading}
            onView={(emp) => setSelectedEmployee(emp)}
            onEdit={profile?.role !== 'viewer' ? (emp) => setEditingEmployee(emp) : undefined}
            onDelete={deleteEmployee}
            canDelete={profile?.role === 'super_admin'}
          />
        );
      case 'add-employee':
        return (
          <EmployeeForm
            onSuccess={() => setActiveTab('employees')}
            onCancel={() => setActiveTab('employees')}
          />
        );
      case 'units':
        return <UnitManagement />;
      case 'org-structure':
        return <OrgStructure onSelectEmployee={(emp) => setSelectedEmployee(emp)} />;
      case 'activity-log':
        return <ActivityLog />;
      case 'settings':
        return <SettingsView />;
      case 'certifications':
        return <CertificationList />;
      case 'sppd':
        return (
          <SppdManagement
            employees={employees}
            canApprove={profile?.role === 'admin' || profile?.role === 'super_admin'}
          />
        );
      default:
        return (
          <Overview
            stats={stats}
            employees={employees}
            loading={employeesLoading}
            setActiveTab={setActiveTab}
            onSelectEmployee={(emp) => setSelectedEmployee(emp)}
          />
        );
    }
  };

  const pageLabel = activeEditingEmployee
    ? `Edit Pegawai · ${activeEditingEmployee.fullName}`
    : activeSelectedEmployee
    ? `Detail Pegawai · ${activeSelectedEmployee.fullName}`
    : TAB_TITLES[activeTab] || activeTab.replace('-', ' ');

  return (
    <div className="min-h-screen bg-[#F4F8FB] dark:bg-[#071120] font-sans transition-colors duration-200">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedEmployee(null);
          setEditingEmployee(null);
        }}
        onLogout={handleLogout}
        role={profile?.role}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
        expiringCertCount={expiringCerts30Days.length}
      />

      {/* Fixed Enterprise Topbar */}
      <header
        className={`fixed top-0 right-0 left-0 z-30 h-16 bg-white/95 dark:bg-[#0B172A]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 flex items-center transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:left-20' : 'lg:left-64'
        }`}
      >
        <div className="w-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-[#EAF6FC] dark:bg-slate-800 text-[#0072BC] dark:text-[#72C8F1] hover:bg-[#72C8F1]/25 transition-colors"
                aria-label="Buka Navigasi"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                  <span>SIMAP UP Kapuas</span>
                  <span>/</span>
                  <span className="text-[#0072BC] dark:text-[#72C8F1] font-bold truncate">
                    {pageLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Global Search Trigger */}
              <button
                type="button"
                onClick={() => setShowGlobalSearch(true)}
                className="flex items-center gap-2.5 px-3 sm:px-3.5 py-2 rounded-xl bg-[#F4F8FB] dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 hover:border-[#0072BC] dark:hover:border-[#72C8F1] transition-all text-xs"
              >
                <Search size={15} className="text-[#0072BC] dark:text-[#72C8F1]" />
                <span className="hidden md:inline font-medium pr-4">
                  Cari pegawai, unit, sertifikasi...
                </span>
                <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-400">
                  Ctrl K
                </kbd>
              </button>

              <ThemeToggle />

              {/* Notifications */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowProfile(false);
                    setHasViewedNotifications(true);
                  }}
                  className="p-2.5 rounded-xl bg-[#F4F8FB] dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700/80 text-slate-500 dark:text-slate-300 hover:text-[#0072BC] dark:hover:text-[#72C8F1] hover:border-[#72C8F1] transition-all relative"
                  aria-label="Pusat Notifikasi"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span
                      className={
                        expiringCerts30Days.length > 0
                          ? 'absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[10px] flex items-center justify-center rounded-full font-extrabold shadow-xs'
                          : 'absolute -top-1 -right-1 w-4 h-4 bg-[#F9D423] text-[#173B65] text-[10px] flex items-center justify-center rounded-full font-extrabold shadow-xs'
                      }
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.96 }}
                      className="absolute top-13 right-0 w-80 bg-white dark:bg-[#0E1A2E] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-[#F8FBFD] dark:bg-[#11223B]">
                        <h4 className="font-bold text-[#173B65] dark:text-slate-100 text-xs">
                          Aktivitas Sistem Terbaru
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNotifications(false);
                            setSelectedEmployee(null);
                            setEditingEmployee(null);
                            setActiveTab('activity-log');
                          }}
                          className="text-[11px] font-bold text-[#0072BC] dark:text-[#72C8F1] hover:underline"
                        >
                          Lihat Semua
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {expiringCerts30Days.length > 0 && (
                          <div
                            onClick={() => {
                              setShowNotifications(false);
                              setSelectedEmployee(null);
                              setEditingEmployee(null);
                              setActiveTab('certifications');
                            }}
                            className="p-3.5 bg-red-50/75 dark:bg-red-950/35 hover:bg-red-50 dark:hover:bg-red-950/55 transition-colors cursor-pointer border-l-4 border-l-red-500"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-red-700 dark:text-red-300">
                                <BellRing size={13} />
                                Pengingat Sertifikasi (≤ 30 Hari)
                              </span>
                              <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold leading-none">
                                {expiringCerts30Days.length}
                              </span>
                            </div>
                            <p className="text-[11px] text-red-700/85 dark:text-red-300/85 leading-relaxed line-clamp-2">
                              {expiringCerts30Days[0].namaSertifikasi} ({expiringCerts30Days[0].employeeName})
                              {expiringCerts30Days.length > 1
                                ? ` dan ${expiringCerts30Days.length - 1} sertifikat lainnya akan kedaluwarsa.`
                                : ' akan kedaluwarsa dalam 30 hari ke depan.'}
                            </p>
                          </div>
                        )}
                        {recentLogs.length > 0 ? (
                          recentLogs.map((log) => {
                            const dt = log.createdAt?.toDate
                              ? log.createdAt.toDate()
                              : log.createdAt?.seconds
                              ? new Date(log.createdAt.seconds * 1000)
                              : null;
                            return (
                              <div
                                key={log.id}
                                onClick={() => {
                                  setShowNotifications(false);
                                  setSelectedEmployee(null);
                                  setEditingEmployee(null);
                                  setActiveTab('activity-log');
                                }}
                                className="p-3.5 hover:bg-[#EAF6FC]/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                              >
                                <div className="flex justify-between items-start gap-2 mb-0.5">
                                  <p className="text-xs font-bold text-[#173B65] dark:text-slate-100 truncate">
                                    {log.entityName}
                                  </p>
                                  <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                                    {dt ? formatDistanceToNow(dt, { addSuffix: true, locale: idLocale }) : 'Baru'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                                  {log.description}
                                </p>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-6 text-center text-xs font-semibold text-slate-400">
                            Belum ada aktivitas tercatat
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User Menu */}
              <div className="relative flex items-center gap-2.5 pl-1">
                <div className="text-right hidden md:block">
                  <p className="text-xs font-bold text-[#173B65] dark:text-slate-100 leading-tight">
                    {profile?.displayName || user.email}
                  </p>
                  <p className="text-[10px] text-[#0072BC] dark:text-[#72C8F1] font-bold uppercase tracking-wider">
                    {profile?.role?.replace('_', ' ') || 'Admin'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfile(!showProfile);
                    setShowNotifications(false);
                  }}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0072BC] to-[#173B65] flex items-center justify-center text-white text-sm font-extrabold shadow-sm hover:brightness-110 transition-all outline-none ring-2 ring-[#72C8F1]/30"
                >
                  {(profile?.displayName?.[0] || user.email?.[0] || 'A').toUpperCase()}
                </button>

                <AnimatePresence>
                  {showProfile && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.96 }}
                      className="absolute top-13 right-0 w-72 bg-white dark:bg-[#0E1A2E] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden p-5"
                    >
                      <div className="flex flex-col items-center text-center space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0072BC] to-[#173B65] flex items-center justify-center text-white text-xl font-extrabold shadow-md">
                          {(profile?.displayName?.[0] || user.email?.[0] || 'A').toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#173B65] dark:text-slate-100">
                            {profile?.displayName || 'Admin User'}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-medium truncate max-w-[220px]">
                            {user.email}
                          </p>
                        </div>
                        <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-semibold flex items-center gap-1">
                              <ShieldCheck size={13} /> Hak Akses
                            </span>
                            <span className="text-[#0072BC] dark:text-[#72C8F1] bg-[#EAF6FC] dark:bg-[#0072BC]/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">
                              {profile?.role?.replace('_', ' ') || 'Admin'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-semibold">Tema</span>
                            <ThemeToggle variant="pill" />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowProfile(false);
                              setSelectedEmployee(null);
                              setEditingEmployee(null);
                              setActiveTab('settings');
                            }}
                            className="w-full py-2.5 bg-[#EAF6FC] dark:bg-slate-800 text-[#173B65] dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-[#72C8F1]/25 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Settings size={14} />
                            Pengaturan Akun &amp; Tema
                          </button>
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full py-2.5 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <LogOut size={14} />
                            Keluar Sistem
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main
        className={`min-h-screen pt-16 overflow-x-clip transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {quotaBanner}
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {renderContent()}
        </div>
      </main>

      <GlobalSearchModal
        open={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        employees={employees}
        units={units}
        role={profile?.role}
        onNavigateTab={(tab) => {
          setSelectedEmployee(null);
          setEditingEmployee(null);
          setActiveTab(tab);
        }}
        onSelectEmployee={(emp) => {
          setEditingEmployee(null);
          setSelectedEmployee(emp);
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </AuthProvider>
  );
}
