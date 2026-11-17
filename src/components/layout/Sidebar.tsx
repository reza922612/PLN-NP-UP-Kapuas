import React from 'react';
import {
  BarChart3,
  Users,
  UserPlus,
  LogOut,
  Settings,
  LayoutDashboard,
  ShieldCheck,
  Building2,
  Award,
  ChevronLeft,
  ChevronRight,
  History,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import PlnNpLogo from '../common/PlnNpLogo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  role?: string;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onLogout,
  role,
  isCollapsed,
  setIsCollapsed,
  mobileOpen = false,
  setMobileOpen,
}) => {
  const menuGroups = [
    {
      group: 'Utama',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'analytics', label: 'Laporan & Analitik', icon: BarChart3 },
      ],
    },
    {
      group: 'Manajemen SDM',
      items: [
        { id: 'employees', label: 'Data Pegawai', icon: Users },
        { id: 'add-employee', label: 'Input Pegawai', icon: UserPlus, hidden: role === 'viewer' },
        { id: 'certifications', label: 'Data Sertifikasi', icon: Award },
        { id: 'org-structure', label: 'Struktur Organisasi', icon: ShieldCheck },
      ],
    },
    {
      group: 'Aset & Sistem',
      items: [
        { id: 'units', label: 'Data Pembangkit', icon: Building2, hidden: role !== 'super_admin' },
        { id: 'activity-log', label: 'Activity Log', icon: History },
        { id: 'settings', label: 'Pengaturan', icon: Settings },
      ],
    },
  ];

  const handleSelect = (id: string) => {
    setActiveTab(id);
    if (setMobileOpen) setMobileOpen(false);
  };

  const renderSidebarBody = (collapsed: boolean, isMobile = false) => (
    <div className="sidebar-gradient text-white h-full flex flex-col shadow-2xl">
      {/* Brand Block */}
      <div
        className={cn(
          'border-b border-white/10 relative transition-all duration-300',
          collapsed ? 'p-4' : 'px-5 py-5'
        )}
      >
        {isMobile && setMobileOpen && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 lg:hidden"
            aria-label="Tutup Menu"
          >
            <X size={16} />
          </button>
        )}

        <div
          className={cn(
            'bg-white dark:bg-[#0E1A2E] dark:border dark:border-white/10 rounded-xl shadow-md mb-3 transition-all duration-300 flex items-center justify-center',
            collapsed ? 'p-2 w-11 h-11 mx-auto' : 'px-3.5 py-2.5 mr-6 lg:mr-0'
          )}
        >
          {collapsed ? (
            <PlnNpLogo variant="icon" className="h-7 w-7" />
          ) : (
            <PlnNpLogo className="h-7 w-full max-w-[172px]" />
          )}
        </div>

        {!collapsed && (
          <div className="px-0.5 flex items-center justify-between">
            <div>
              <h1 className="text-xs font-extrabold leading-tight uppercase tracking-wider text-white">
                SIMAP PORTAL
              </h1>
              <p className="text-[10px] text-[#72C8F1] uppercase tracking-widest font-bold mt-0.5">
                PLN NP UP KAPUAS
              </p>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#F9D423]" title="Enterprise Portal" />
          </div>
        )}

        {!isMobile && (
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={collapsed ? 'Perluas Sidebar' : 'Kecilkan Sidebar'}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-[#0E1A2E] rounded-full shadow-lg border border-slate-200 dark:border-slate-700 text-[#0072BC] dark:text-[#72C8F1] items-center justify-center hover:scale-110 transition-all z-40"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 px-3 py-5 space-y-5 overflow-y-auto overflow-x-hidden">
        {menuGroups.map((grp) => {
          const visibleItems = grp.items.filter((i) => !i.hidden);
          if (visibleItems.length === 0) return null;
          return (
            <div key={grp.group} className="space-y-1">
              {!collapsed && (
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
                  {grp.group}
                </p>
              )}
              {visibleItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    title={collapsed ? item.label : ''}
                    className={cn(
                      'w-full flex items-center rounded-xl transition-all duration-150 group relative text-[13px]',
                      collapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5',
                      isActive
                        ? 'bg-[#0072BC]/90 text-white font-bold shadow-md shadow-[#071120]/30'
                        : 'text-white/75 hover:bg-white/10 hover:text-white font-medium'
                    )}
                  >
                    {isActive && !collapsed && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#F9D423] rounded-r-full" />
                    )}
                    <item.icon
                      size={18}
                      className={cn(
                        'transition-colors shrink-0',
                        isActive
                          ? 'text-[#F9D423]'
                          : 'text-[#72C8F1]/75 group-hover:text-white'
                      )}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Bottom Sign Out */}
      <div className={cn('border-t border-white/10', collapsed ? 'p-2.5' : 'p-4')}>
        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? 'Keluar Sistem' : ''}
          className={cn(
            'w-full flex items-center justify-center gap-2 transition-all duration-150 font-bold rounded-xl border border-red-400/20 bg-red-500/15 text-red-200 hover:bg-red-500/30 hover:text-white',
            collapsed ? 'p-2.5' : 'py-2.5 px-4 text-xs'
          )}
        >
          <LogOut size={16} />
          {!collapsed && <span>Keluar Sistem</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside
        className={cn(
          'hidden lg:block h-screen sticky top-0 shrink-0 transition-all duration-300 z-30',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {renderSidebarBody(isCollapsed, false)}
      </aside>

      {/* Mobile / Tablet Slide-over Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          onClick={() => setMobileOpen && setMobileOpen(false)}
        >
          <div className="fixed inset-0 bg-[#071120]/65 backdrop-blur-xs" />
          <aside
            className="relative w-72 max-w-[85vw] h-full z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {renderSidebarBody(false, true)}
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
