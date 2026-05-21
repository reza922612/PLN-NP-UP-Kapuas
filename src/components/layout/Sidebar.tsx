import React from 'react';
import { 
  BarChart3, 
  Users, 
  UserPlus, 
  LogOut, 
  FileText, 
  Settings, 
  Search,
  LayoutDashboard,
  ShieldCheck,
  Building2,
  ChevronRight,
  Award,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Menu,
  X
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  role?: string;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout, role, isCollapsed, setIsCollapsed }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'employees', label: 'Data Pegawai', icon: Users },
    { id: 'add-employee', label: 'Input Pegawai', icon: UserPlus, hidden: role === 'viewer' },
    { id: 'analytics', label: 'Laporan & Analitik', icon: BarChart3 },
    { id: 'certifications', label: 'Data Sertifikasi', icon: Award },
    { id: 'org-structure', label: 'Struktur Organisasi', icon: ShieldCheck },
    { id: 'units', label: 'Data Pembangkit', icon: Building2, hidden: role !== 'super_admin' },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <aside className={cn(
      "sidebar-gradient text-white h-screen sticky top-0 flex flex-col shadow-xl shrink-0 transition-all duration-300 z-30",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className={cn("p-6 border-b border-white/10 relative", isCollapsed ? "px-4" : "p-6")}>
        <div className={cn(
          "bg-white p-3 rounded-xl shadow-lg mb-3 transition-all duration-300",
          isCollapsed ? "p-2 rounded-lg" : ""
        )}>
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/PLN_Nusantara_Power.png/400px-PLN_Nusantara_Power.png" 
            alt="PLN Logo" 
            className={cn("object-contain transition-all duration-300", isCollapsed ? "h-6 mx-auto" : "h-8")} 
            referrerPolicy="no-referrer"
          />
        </div>
        {!isCollapsed && (
          <div className="px-1">
            <h1 className="text-sm font-black leading-tight uppercase tracking-tight">SIMAP PLN NP</h1>
            <p className="text-[10px] text-white/50 uppercase tracking-widest font-black">UP KAPUAS</p>
          </div>
        )}
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg border border-slate-100 text-pln-blue flex items-center justify-center hover:scale-110 transition-all z-40",
            isCollapsed && "right-[-12px]"
          )}
        >
          {isCollapsed ? <ChevronRightIcon size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {menuItems.map((item) => (
          !item.hidden && (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : ""}
              className={cn(
                "w-full flex items-center px-4 py-2.5 rounded-lg transition-all duration-200 group relative text-sm",
                isCollapsed ? "justify-center px-0" : "gap-3",
                activeTab === item.id 
                  ? "bg-white/15 text-white font-bold" 
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon size={20} className={cn(
                "transition-colors shrink-0",
                activeTab === item.id ? "text-white" : "text-white/50 group-hover:text-white"
              )} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
              {activeTab === item.id && (
                <div className={cn(
                  "absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-full",
                  isCollapsed ? "hidden" : "block"
                )} />
              )}
            </button>
          )
        ))}
      </nav>

      <div className={cn("p-4 border-t border-white/10", isCollapsed ? "p-2" : "p-4")}>
        <button 
          onClick={onLogout}
          title={isCollapsed ? "Log Out" : ""}
          className={cn(
            "w-full flex items-center justify-center transition-all duration-200 font-bold",
            isCollapsed 
              ? "p-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/40" 
              : "py-2 text-xs bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/40"
          )}
        >
          {isCollapsed ? <LogOut size={20} /> : "Log Out"}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
