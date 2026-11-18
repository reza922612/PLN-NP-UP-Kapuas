import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Compass,
  ExternalLink,
  Facebook,
  FileText,
  Instagram,
  Layers,
  Mail,
  MapPin,
  Menu,
  Newspaper,
  Phone,
  QrCode,
  Search,
  ShieldCheck,
  Twitter,
  Users,
  X,
  Youtube,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import PlnNpLogo from '../common/PlnNpLogo';
import ThemeToggle from '../common/ThemeToggle';
import LandingInfographic from './LandingInfographic';
import UnitLocationMap from './UnitLocationMap';
import { usePublicStats } from '../../hooks/usePublicStats';
import {
  COMMAND_NOTIFICATIONS,
  KNOWLEDGE_ARTICLES,
  KnowledgeArticle,
  NEWS_ITEMS,
  NewsItem,
  SERVICE_UNIT_PROFILES,
  ServiceUnitProfile,
} from '../../data/landingContent';
import { cn } from '../../lib/utils';

const HERO_IMAGE = '/src/assets/images/hero_digital_powerplant_1794932209286.jpg';
const COMMAND_IMAGE = '/src/assets/images/kapuas_grid_control_1794932209715.jpg';

interface LandingPageProps {
  onStart: () => void;
  onVerifyEmployee?: (employeeId: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart, onVerifyEmployee }) => {
  const { stats, loading: statsLoading, error: statsError, refresh: refreshStats } = usePublicStats();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [commandImgFailed, setCommandImgFailed] = useState(false);

  // Interactive Filters & Selection
  const [selectedUnitId, setSelectedUnitId] = useState<string>(SERVICE_UNIT_PROFILES[0].id);
  const [knowledgeFilter, setKnowledgeFilter] = useState<string>('Semua');
  const [newsFilter, setNewsFilter] = useState<string>('Semua');

  // Modals & Popovers
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<string>('Semua');
  const [notifReadIds, setNotifReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('simap_public_notif_read');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeKnowledge, setActiveKnowledge] = useState<KnowledgeArticle | null>(null);
  const [activeNews, setActiveNews] = useState<NewsItem | null>(null);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyInputId, setVerifyInputId] = useState('');

  // Ctrl+K / Cmd+K shortcut for Global Search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setActiveKnowledge(null);
        setActiveNews(null);
        setVerifyModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const scrollToSection = (selector: string) => {
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
    setSearchOpen(false);
    if (selector === '#top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.querySelector(selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const unreadNotifsCount = COMMAND_NOTIFICATIONS.filter((n) => !notifReadIds.includes(n.id)).length;

  const markAllNotificationsRead = () => {
    const allIds = COMMAND_NOTIFICATIONS.map((n) => n.id);
    setNotifReadIds(allIds);
    try {
      localStorage.setItem('simap_public_notif_read', JSON.stringify(allIds));
    } catch {
      // ignore storage errors
    }
  };

  const filteredNotifications = useMemo(() => {
    if (notifFilter === 'Semua') return COMMAND_NOTIFICATIONS;
    return COMMAND_NOTIFICATIONS.filter((n) => n.type === notifFilter);
  }, [notifFilter]);

  const selectedUnit: ServiceUnitProfile = useMemo(() => {
    return (
      SERVICE_UNIT_PROFILES.find((u) => u.id === selectedUnitId) || SERVICE_UNIT_PROFILES[0]
    );
  }, [selectedUnitId]);

  const getMatchedUnitSummary = (profile: ServiceUnitProfile) => {
    if (!stats?.unitSummaries) return null;
    return (
      stats.unitSummaries.find((summary) => {
        const normalized = summary.name.toLowerCase();
        return profile.matchKeywords.some((kw) => normalized.includes(kw));
      }) || null
    );
  };

  const matchedSelectedUnitSummary = getMatchedUnitSummary(selectedUnit);

  const filteredKnowledge = useMemo(() => {
    if (knowledgeFilter === 'Semua') return KNOWLEDGE_ARTICLES;
    return KNOWLEDGE_ARTICLES.filter((k) => k.category === knowledgeFilter);
  }, [knowledgeFilter]);

  const filteredNews = useMemo(() => {
    if (newsFilter === 'Semua') return NEWS_ITEMS;
    return NEWS_ITEMS.filter((n) => n.category === newsFilter);
  }, [newsFilter]);

  const quickAccessItems = [
    {
      id: 'qa-employees',
      title: 'Manajemen Pegawai & SDM',
      description: 'Kelola profil pegawai organik, tugas khusus, tenaga alih daya, dan riwayat jabatan.',
      actionLabel: 'Masuk Portal',
      icon: Users,
      accentBg: 'bg-pln-blue text-white',
      onClick: onStart,
    },
    {
      id: 'qa-units',
      title: 'Monitoring Unit & Mesin',
      description: 'Pantau kapasitas DMN, beban puncak, jenis mesin, serta peta unit layanan UP Kapuas.',
      actionLabel: 'Lihat Unit',
      icon: Building2,
      accentBg: 'bg-pln-cyan text-white',
      onClick: () => scrollToSection('#unit-layanan'),
    },
    {
      id: 'qa-verify',
      title: 'Verifikasi ID Pegawai (QR)',
      description: 'Periksa keabsahan status aktif pegawai melalui ID dokumen atau pemindaian QR Code.',
      actionLabel: 'Cek Verifikasi',
      icon: QrCode,
      accentBg: 'bg-pln-yellow text-slate-900',
      onClick: () => setVerifyModalOpen(true),
    },
    {
      id: 'qa-certs',
      title: 'Sertifikasi & Pelatihan',
      description: 'Pantau masa berlaku sertifikat kompetensi dan pindai dokumen fisik langsung via kamera.',
      actionLabel: 'Buka Dashboard',
      icon: Award,
      accentBg: 'bg-sky-600 text-white',
      onClick: onStart,
    },
    {
      id: 'qa-knowledge',
      title: 'Knowledge Center & SOP',
      description: 'Akses standar operasional, regulasi RBAC, pedoman data pembangkit, dan panduan sistem.',
      actionLabel: 'Baca Pustaka',
      icon: BookOpen,
      accentBg: 'bg-slate-800 dark:bg-slate-700 text-white',
      onClick: () => scrollToSection('#knowledge'),
    },
    {
      id: 'qa-news',
      title: 'Informasi & Agenda UP Kapuas',
      description: 'Ikuti pengumuman pembaruan platform, agenda sinkronisasi unit, dan informasi korporat.',
      actionLabel: 'Lihat Agenda',
      icon: Newspaper,
      accentBg: 'bg-blue-700 text-white',
      onClick: () => scrollToSection('#informasi'),
    },
  ];

  // Global Search Results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return {
        units: SERVICE_UNIT_PROFILES.slice(0, 3),
        knowledge: KNOWLEDGE_ARTICLES.slice(0, 3),
        news: NEWS_ITEMS.slice(0, 2),
        quick: quickAccessItems.slice(0, 3),
      };
    }

    return {
      quick: quickAccessItems.filter(
        (item) =>
          item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
      ),
      units: SERVICE_UNIT_PROFILES.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.region.toLowerCase().includes(q) ||
          u.system.toLowerCase().includes(q) ||
          u.summary.toLowerCase().includes(q)
      ),
      knowledge: KNOWLEDGE_ARTICLES.filter(
        (k) =>
          k.title.toLowerCase().includes(q) ||
          k.category.toLowerCase().includes(q) ||
          k.summary.toLowerCase().includes(q)
      ),
      news: NEWS_ITEMS.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.category.toLowerCase().includes(q) ||
          n.excerpt.toLowerCase().includes(q)
      ),
    };
  }, [searchQuery]);

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = verifyInputId.trim();
    if (!cleaned) return;
    setVerifyModalOpen(false);
    setVerifyInputId('');
    if (onVerifyEmployee) {
      onVerifyEmployee(cleaned);
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('verify', cleaned);
      window.history.pushState({}, '', url.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div
      id="top"
      className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden transition-colors duration-200"
    >
      {/* Top Navigation Bar (Strict 3-zone structure) */}
      <header className="fixed top-0 inset-x-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Brand Mark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('#top');
            }}
            className="flex items-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pln-blue rounded-lg"
            aria-label="Beranda SIMAP PLN Nusantara Power UP Kapuas"
          >
            <PlnNpLogo className="h-8 sm:h-9 w-auto" />
          </a>

          {/* Zone 2: Primary Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-slate-600 dark:text-slate-300">
            {[
              { label: 'Quick Access', target: '#quick-access' },
              { label: 'Infografis', target: '#infografis' },
              { label: 'Unit Layanan', target: '#unit-layanan' },
              { label: 'Knowledge', target: '#knowledge' },
              { label: 'Informasi', target: '#informasi' },
            ].map((nav) => (
              <a
                key={nav.target}
                href={nav.target}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(nav.target);
                }}
                className="whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-pln-blue dark:hover:border-cyan-400 hover:text-pln-blue dark:hover:text-cyan-400 transition-colors"
              >
                {nav.label}
              </a>
            ))}
          </nav>

          {/* Zone 3: Command Controls & Primary Action */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Buka pencarian global"
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-pln-blue dark:hover:border-cyan-400 hover:text-pln-blue dark:hover:text-cyan-400 transition-colors text-xs font-medium whitespace-nowrap shrink-0"
            >
              <Search size={15} />
              <span className="hidden sm:inline">Cari</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-400">
                Ctrl K
              </kbd>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((prev) => !prev)}
                aria-label="Buka pusat notifikasi"
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-pln-blue dark:hover:text-cyan-400 transition-colors relative"
              >
                <Bell size={17} />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-pln-blue text-white text-[10px] font-mono font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Notification Center
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Pembaruan sistem & agenda UP Kapuas
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-xs font-semibold text-pln-blue dark:text-cyan-400 hover:underline flex items-center gap-1 whitespace-nowrap shrink-0"
                      >
                        <Check size={13} />
                        Tandai dibaca
                      </button>
                    </div>

                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1 bg-slate-50/70 dark:bg-slate-950/40">
                      {['Semua', 'Sistem', 'SOP', 'Agenda'].map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setNotifFilter(tab)}
                          className={cn(
                            'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0',
                            notifFilter === tab
                              ? 'bg-pln-blue text-white'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                          )}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredNotifications.map((item) => {
                        const isRead = notifReadIds.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              if (!isRead) {
                                const next = [...notifReadIds, item.id];
                                setNotifReadIds(next);
                                try {
                                  localStorage.setItem('simap_public_notif_read', JSON.stringify(next));
                                } catch {
                                  // ignore
                                }
                              }
                              if (item.targetSection) {
                                scrollToSection(item.targetSection);
                              }
                            }}
                            className={cn(
                              'w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors',
                              !isRead && 'bg-blue-50/40 dark:bg-blue-950/20'
                            )}
                          >
                            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                              <span className="font-semibold text-pln-blue dark:text-cyan-400">
                                {item.type} · {item.timeLabel}
                              </span>
                              {!isRead && <span className="font-semibold text-amber-600 dark:text-amber-400">Baru</span>}
                            </div>
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {item.title}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                              {item.message}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <ThemeToggle />

            <button
              type="button"
              onClick={onStart}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 bg-pln-blue text-white rounded-xl text-xs font-bold tracking-wide hover:bg-pln-dark transition-colors whitespace-nowrap shrink-0"
            >
              Masuk Portal
              <ArrowRight size={14} />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Menu navigasi"
              className="lg:hidden p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-4 space-y-2 overflow-hidden"
            >
              {[
                { label: 'Quick Access', target: '#quick-access' },
                { label: 'Infografis Data', target: '#infografis' },
                { label: 'Unit Layanan UP Kapuas', target: '#unit-layanan' },
                { label: 'Knowledge Center', target: '#knowledge' },
                { label: 'Berita & Agenda', target: '#informasi' },
              ].map((nav) => (
                <button
                  key={nav.target}
                  type="button"
                  onClick={() => scrollToSection(nav.target)}
                  className="block w-full text-left py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-pln-blue dark:hover:text-cyan-400"
                >
                  {nav.label}
                </button>
              ))}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onStart();
                  }}
                  className="w-full py-3 bg-pln-blue text-white rounded-xl text-xs font-bold tracking-wide flex items-center justify-center gap-2"
                >
                  Masuk ke Dashboard SIMAP
                  <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section: Digital Command Center */}
      <section className="relative pt-28 sm:pt-36 pb-20 px-6 overflow-hidden">
        {/* Subtle corporate gradient wash (PLN Light Blue + Corporate Blue + subtle PLN Yellow) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,174,239,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_left,_rgba(247,232,46,0.10),_transparent_45%)] dark:bg-[radial-gradient(ellipse_at_top_right,_rgba(0,174,239,0.14),_transparent_55%),radial-gradient(ellipse_at_bottom_left,_rgba(0,93,170,0.18),_transparent_50%)]"
        />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          {/* Hero Left Column */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="lg:col-span-6 flex flex-col justify-between space-y-8 py-2"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-pln-blue dark:text-cyan-400">
                <Zap size={15} className="text-amber-500 shrink-0" />
                <span>Digital Command Center · PLN NP UP Kapuas</span>
              </div>

              <h1
                className="font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] text-balance"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.6rem)' }}
              >
                Pusat Kendali Digital{' '}
                <span className="bg-gradient-to-r from-pln-blue to-pln-cyan bg-clip-text text-transparent">
                  Aset Pembangkit
                </span>{' '}
                & Talenta UP Kapuas.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl text-justify">
                Optimalkan pengelolaan data unit, monitoring aset mesin, dan pengembangan kompetensi pegawai dalam satu platform terintegrasi untuk PLN NP UP Kapuas.
              </p>

              {/* Interactive Global Search Entry */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="w-full max-w-xl flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-pln-blue dark:hover:border-cyan-400 transition-colors text-left group"
                >
                  <span className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 truncate">
                    <Search
                      size={18}
                      className="text-pln-blue dark:text-cyan-400 shrink-0"
                    />
                    <span className="truncate">
                      Cari unit Sei Raya, Siantan, SOP, atau verifikasi ID pegawai...
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-pln-blue dark:text-cyan-400 whitespace-nowrap shrink-0 group-hover:translate-x-0.5 transition-transform">
                    Telusuri
                  </span>
                </button>
              </div>

              {/* Primary & Secondary Actions */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={onStart}
                  className="px-7 py-3.5 bg-pln-blue text-white rounded-xl text-sm font-bold hover:bg-pln-dark transition-colors shadow-lg shadow-blue-900/15 flex items-center gap-2.5 whitespace-nowrap shrink-0"
                >
                  <span>Masuk ke Dashboard</span>
                  <ChevronRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setVerifyModalOpen(true)}
                  className="px-5 py-3.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold hover:border-pln-blue dark:hover:border-cyan-400 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <QrCode size={17} className="text-pln-blue dark:text-cyan-400" />
                  <span>Verifikasi ID Pegawai</span>
                </button>
              </div>
            </div>

            {/* Quiet Regional & Data Trust Line */}
            <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <MapPin size={14} className="text-pln-blue dark:text-cyan-400" />
                Kalimantan Barat · 4 Unit Layanan Pembangkitan
              </span>
              <span aria-hidden="true" className="hidden sm:inline">
                ·
              </span>
              <span className="font-medium">
                {stats && (stats.totalUnits > 0 || stats.totalEmployees > 0)
                  ? `${stats.totalUnits} Unit & ${stats.totalEmployees} Pegawai Tersinkronisasi`
                  : 'Integrasi Real-Time Firestore & QR Verification'}
              </span>
            </div>
          </motion.div>

          {/* Hero Right Column: Digital Power Plant Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="lg:col-span-6 flex"
          >
            <div className="relative w-full min-h-[340px] lg:h-full rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-2xl">
              {!heroImgFailed ? (
                <img
                  src={HERO_IMAGE}
                  alt="Ilustrasi Digital Command Center Pembangkit Listrik PLN Nusantara Power UP Kapuas"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 bg-gradient-to-br from-pln-dark via-pln-blue to-pln-cyan text-white text-center space-y-3">
                  <Zap size={44} className="text-pln-yellow" />
                  <p className="text-lg font-bold">Digital Command Center UP Kapuas</p>
                  <p className="text-xs text-white/80 max-w-xs">
                    Sistem Manajemen Unit Pembangkit, Mesin, dan Kompetensi Pegawai
                  </p>
                </div>
              )}

              {/* Bottom Contrast Scrim Overlay */}
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-transparent text-white">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-pln-yellow">
                      Cakupan Wilayah Operasi
                    </p>
                    <p className="text-sm sm:text-base font-bold leading-snug">
                      Sei Raya · Siantan · Ketapang · Sanggau & Sintang
                    </p>
                  </div>
                  <div className="flex items-center gap-5 shrink-0 text-left sm:text-right">
                    <div>
                      <p className="text-[11px] text-slate-300">Kapasitas DMN</p>
                      <p className="text-lg font-extrabold font-mono tabular-nums text-white">
                        {stats ? `${new Intl.NumberFormat('id-ID').format(stats.totalCapacityKW)} kW` : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Access Section */}
      <section id="quick-access" className="py-20 px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-pln-blue dark:text-cyan-400">
                Quick Access
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white text-balance">
                Layanan & Modul Terintegrasi SIMAP
              </h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
              Pilih layanan untuk langsung menuju modul operasional, verifikasi identitas publik, atau pustaka panduan kerja.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickAccessItems.map((item, idx) => (
              <motion.button
                key={item.id}
                type="button"
                onClick={item.onClick}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
                className="group text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 hover:border-pln-blue dark:hover:border-cyan-400 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between gap-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105',
                        item.accentBg
                      )}
                    >
                      <item.icon size={20} />
                    </div>
                    <ArrowRight
                      size={16}
                      className="text-slate-300 dark:text-slate-600 group-hover:text-pln-blue dark:group-hover:text-cyan-400 group-hover:translate-x-1 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-pln-blue dark:text-cyan-400 inline-flex items-center gap-1.5">
                  {item.actionLabel}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Infographic Dashboard (Actual Data from Firestore) */}
      <LandingInfographic
        stats={stats}
        loading={statsLoading}
        error={statsError}
        onRefresh={refreshStats}
        onLoginClick={onStart}
      />

      {/* Service Unit Profiles: Sei Raya, Siantan, Ketapang, Sanggau & Sintang */}
      <section id="unit-layanan" className="py-24 px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-pln-blue dark:text-cyan-400">
                Profil Unit Layanan
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white text-balance">
                Empat Gugus Unit Pembangkitan UP Kapuas
              </h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
              Pilih unit layanan untuk meninjau profil operasional serta metrik mesin aktual apabila telah tersinkronisasi dari Data Pembangkit.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Selector Column */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              {SERVICE_UNIT_PROFILES.map((unit) => {
                const isSelected = unit.id === selectedUnit.id;
                const matched = getMatchedUnitSummary(unit);
                return (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => setSelectedUnitId(unit.id)}
                    className={cn(
                      'w-full text-left p-5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4',
                      isSelected
                        ? 'bg-pln-blue text-white border-pln-blue shadow-lg shadow-blue-900/15'
                        : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:border-pln-blue dark:hover:border-cyan-400'
                    )}
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-base font-bold truncate">{unit.name}</p>
                      <p
                        className={cn(
                          'text-xs truncate',
                          isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                        )}
                      >
                        {unit.region} · {unit.system}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {matched ? (
                        <span
                          className={cn(
                            'text-xs font-mono font-bold tabular-nums',
                            isSelected ? 'text-pln-yellow' : 'text-pln-blue dark:text-cyan-400'
                          )}
                        >
                          {new Intl.NumberFormat('id-ID').format(matched.capacityKW)} kW
                        </span>
                      ) : (
                        <ChevronRight
                          size={18}
                          className={cn(isSelected ? 'text-white' : 'text-slate-400')}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Unit Detail Panel */}
            <div className="lg:col-span-7 flex">
              <motion.div
                key={selectedUnit.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className="w-full bg-slate-50/70 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 md:p-10 flex flex-col justify-between gap-8"
              >
                <div className="space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-pln-blue dark:text-cyan-400">
                        {selectedUnit.system} · {selectedUnit.region}
                      </p>
                      <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        {selectedUnit.name}
                      </h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-pln-blue/10 dark:bg-cyan-500/10 flex items-center justify-center text-pln-blue dark:text-cyan-400 shrink-0">
                      <Compass size={24} />
                    </div>
                  </div>

                  <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                    {selectedUnit.summary}
                  </p>

                  {/* Actual Unit Data from Firestore if Matched */}
                  <div className="grid grid-cols-3 gap-4 py-4 border-y border-slate-200 dark:border-slate-800">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Mesin Terdaftar</p>
                      <p className="text-xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                        {matchedSelectedUnitSummary
                          ? matchedSelectedUnitSummary.machinesCount
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Daya Mampu (DMN)</p>
                      <p className="text-xl font-extrabold font-mono tabular-nums text-pln-blue dark:text-cyan-400 mt-1">
                        {matchedSelectedUnitSummary
                          ? `${new Intl.NumberFormat('id-ID').format(matchedSelectedUnitSummary.capacityKW)} kW`
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Beban Puncak</p>
                      <p className="text-xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                        {matchedSelectedUnitSummary
                          ? `${new Intl.NumberFormat('id-ID').format(matchedSelectedUnitSummary.peakLoadKW)} kW`
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {!matchedSelectedUnitSummary && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Data teknis mesin untuk {selectedUnit.shortName} belum ditemukan dalam ringkasan tersinkronisasi. Kelola melalui menu Data Pembangkit setelah masuk.
                    </p>
                  )}

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Fokus Operasional & Pengelolaan Data
                    </h4>
                    <ul className="space-y-2.5">
                      {selectedUnit.focusAreas.map((focus) => (
                        <li
                          key={focus}
                          className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300"
                        >
                          <Zap size={15} className="text-pln-blue dark:text-cyan-400 mt-0.5 shrink-0" />
                          <span>{focus}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedUnit.mapShareUrl && selectedUnit.mapSearchQueries && (
                    <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <MapPin size={14} className="text-pln-blue dark:text-cyan-400" />
                          Lokasi Google Maps · {selectedUnit.name}
                        </h4>
                        <a
                          href={selectedUnit.mapShareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-pln-blue dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
                        >
                          Tautan Resmi Google Maps
                          <ExternalLink size={12} />
                        </a>
                      </div>
                      <UnitLocationMap
                        unitName={selectedUnit.name}
                        region={selectedUnit.region}
                        mapShareUrl={selectedUnit.mapShareUrl}
                        searchQueries={selectedUnit.mapSearchQueries}
                        addressHint={matchedSelectedUnitSummary?.address}
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedUnit.role}
                  </span>
                  <button
                    type="button"
                    onClick={onStart}
                    className="px-5 py-2.5 bg-slate-900 dark:bg-pln-blue text-white rounded-xl text-xs font-bold hover:bg-pln-blue dark:hover:bg-pln-dark transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                  >
                    Kelola di Dashboard
                    <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Knowledge Center: SOP, Regulasi, Pedoman, Tutorial */}
      <section
        id="knowledge"
        className="py-24 px-6 bg-slate-50/70 dark:bg-slate-900/30 border-y border-slate-200/70 dark:border-slate-800/80"
      >
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-pln-blue dark:text-cyan-400">
                Knowledge Center
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white text-balance">
                SOP, Regulasi, Pedoman, dan Tutorial SIMAP
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Referensi kerja digital untuk administrator unit, pengelola aset pembangkit, dan seluruh pegawai UP Kapuas.
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-fit overflow-x-auto max-w-full">
              {['Semua', 'SOP', 'Regulasi', 'Pedoman', 'Tutorial'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setKnowledgeFilter(cat)}
                  className={cn(
                    'px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0',
                    knowledgeFilter === cat
                      ? 'bg-pln-blue text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredKnowledge.map((article) => (
              <article
                key={article.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-7 flex flex-col justify-between gap-6 hover:border-pln-blue dark:hover:border-cyan-400 transition-colors"
              >
                <div className="space-y-3">
                  {/* Unboxed typographic metadata (Zero-Pill Rule) */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-pln-blue dark:text-cyan-400">
                      {article.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{article.readTime}</span>
                    <span aria-hidden="true">·</span>
                    <span>{article.audience}</span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {article.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {article.summary}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {article.updatedLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveKnowledge(article)}
                    className="text-xs font-bold text-pln-blue dark:text-cyan-400 hover:underline inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    Baca Panduan Lengkap
                    <ChevronRight size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* News & Information Section */}
      <section id="informasi" className="py-24 px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-pln-blue dark:text-cyan-400">
                News & Information
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white text-balance">
                Berita, Pengumuman, dan Agenda Kegiatan
              </h2>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-fit">
              {['Semua', 'Berita', 'Pengumuman', 'Agenda'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setNewsFilter(cat)}
                  className={cn(
                    'px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0',
                    newsFilter === cat
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Editorial Visual Feature */}
            <div className="lg:col-span-5 flex">
              <div className="relative w-full min-h-[300px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900">
                {!commandImgFailed ? (
                  <img
                    src={COMMAND_IMAGE}
                    alt="Ruang Kendali Operasi Energi Terpadu UP Kapuas"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => setCommandImgFailed(true)}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 to-pln-dark text-white text-center space-y-2">
                    <Layers size={36} className="text-pln-cyan" />
                    <p className="text-base font-bold">Pusat Informasi UP Kapuas</p>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent text-white space-y-1.5">
                  <p className="text-xs font-semibold text-pln-yellow">
                    Ekosistem Digital PLN Nusantara Power
                  </p>
                  <p className="text-lg font-bold leading-snug">
                    Satu Sumber Informasi Terverifikasi untuk Pegawai dan Pengelola Unit.
                  </p>
                </div>
              </div>
            </div>

            {/* News & Agenda List */}
            <div className="lg:col-span-7 divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              {filteredNews.map((item) => (
                <div
                  key={item.id}
                  className="py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-2 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-pln-blue dark:text-cyan-400">
                        {item.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{item.dateLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.location}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.excerpt}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveNews(item)}
                    className="self-start sm:self-center px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-pln-blue dark:hover:border-cyan-400 hover:text-pln-blue dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
                  >
                    Selengkapnya
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Conversion Banner */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto rounded-3xl bg-gradient-to-br from-pln-dark via-pln-blue to-sky-600 text-white p-8 sm:p-14 flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative overflow-hidden">
          <div className="space-y-3 max-w-2xl relative z-10">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-pln-yellow">
              Akses Portal SIMAP UP Kapuas
            </p>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-balance">
              Kelola Data Pegawai, Unit Pembangkit, dan Sertifikasi dalam Satu Akses.
            </h2>
            <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
              Masuk menggunakan akun korporat Admin, Viewer, atau Portal Pegawai Mandiri untuk mengakses seluruh fitur operasional SIMAP.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 relative z-10 shrink-0">
            <button
              type="button"
              onClick={onStart}
              className="px-7 py-4 bg-white text-pln-dark rounded-xl text-sm font-bold hover:bg-pln-yellow hover:text-slate-900 transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              Masuk ke Dashboard
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-300 pt-16 pb-10 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800/80">
            {/* Brand & Identity */}
            <div className="space-y-5">
              <PlnNpLogo theme="dark" className="h-9 w-auto" />
              <div className="space-y-2 text-sm text-slate-400">
                <p className="font-semibold text-white">
                  PT PLN Nusantara Power — Unit Pembangkitan Kapuas
                </p>
                <p className="leading-relaxed text-xs">
                  Digital Command Center pengelolaan unit layanan pembangkit, aset mesin, serta kompetensi pegawai wilayah Kalimantan Barat.
                </p>
              </div>
              <div className="space-y-2 text-xs">
                <a
                  href="tel:+62318283180"
                  className="flex items-center gap-2.5 text-slate-400 hover:text-white transition-colors"
                >
                  <Phone size={14} className="text-pln-cyan" />
                  <span>+62 31 8283180</span>
                </a>
                <a
                  href="mailto:info@plnnusantarapower.co.id"
                  className="flex items-center gap-2.5 text-slate-400 hover:text-white transition-colors"
                >
                  <Mail size={14} className="text-pln-cyan" />
                  <span>info@plnnusantarapower.co.id</span>
                </a>
              </div>
            </div>

            {/* Kantor Korporat */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Kantor Korporat
              </h3>
              <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
                <div>
                  <p className="font-semibold text-slate-200">Head Office</p>
                  <p>Jl. Ketintang Baru No. 11, Surabaya, Indonesia</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-200">Strategic Office</p>
                  <p>18 Office Park, Jl. TB Simatupang No. 18, Jakarta Selatan</p>
                </div>
              </div>
            </div>

            {/* Navigasi Command Center */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Navigasi SIMAP
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-400">
                {[
                  { label: 'Quick Access Layanan', target: '#quick-access' },
                  { label: 'Infografis Data Aktual', target: '#infografis' },
                  { label: 'Profil Unit UP Kapuas', target: '#unit-layanan' },
                  { label: 'Knowledge Center & SOP', target: '#knowledge' },
                  { label: 'Berita & Agenda', target: '#informasi' },
                ].map((link) => (
                  <li key={link.target}>
                    <a
                      href={link.target}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection(link.target);
                      }}
                      className="hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Unit Layanan & Sosial */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Cakupan Unit Layanan
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                ULPLTD Sei Raya · ULPLTG/D Siantan · ULPLTD Ketapang · ULPLTD Sanggau & Sintang
              </p>
              <div className="pt-2">
                <p className="text-xs font-bold text-white mb-3">Kanal Resmi</p>
                <div className="flex items-center gap-2.5">
                  {[
                    { icon: Instagram, label: 'Instagram', href: 'https://www.instagram.com/plnnusantarapower/' },
                    { icon: Facebook, label: 'Facebook', href: 'https://www.facebook.com/plnnusantarapower/' },
                    { icon: Youtube, label: 'YouTube', href: 'https://www.youtube.com/@PLNNusantaraPower' },
                    { icon: Twitter, label: 'X', href: 'https://x.com/plnnusantarapwr' },
                  ].map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={social.label}
                      className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:bg-pln-blue hover:text-white hover:border-pln-blue transition-colors"
                    >
                      <social.icon size={15} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <span>Dikelola oleh PT PLN Nusantara Power Unit Pembangkitan Kapuas</span>
            <span>© 2026 PT PLN Nusantara Power UP Kapuas. Hak Cipta Dilindungi.</span>
          </div>
        </div>
      </footer>

      {/* Global Search Modal (Ctrl + K) */}
      <AnimatePresence>
        {searchOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-start justify-center p-4 pt-20 sm:pt-24">
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <Search size={18} className="text-pln-blue dark:text-cyan-400 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari unit layanan, SOP, berita, modul dashboard, atau ID pegawai..."
                  className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Tutup pencarian"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[65vh] overflow-y-auto p-4 space-y-5">
                {searchQuery.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const targetId = searchQuery.trim();
                      setSearchOpen(false);
                      if (onVerifyEmployee) {
                        onVerifyEmployee(targetId);
                      }
                    }}
                    className="w-full p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/60 flex items-center justify-between gap-3 text-left hover:border-pln-blue transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <QrCode size={18} className="text-pln-blue dark:text-cyan-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          Verifikasi ID Pegawai: &ldquo;{searchQuery.trim()}&rdquo;
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Buka halaman verifikasi identitas publik SIMAP
                        </p>
                      </div>
                    </div>
                    <ExternalLink size={15} className="text-pln-blue dark:text-cyan-400 shrink-0" />
                  </button>
                )}

                {searchResults.units.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                      Unit Layanan UP Kapuas
                    </p>
                    <div className="space-y-1">
                      {searchResults.units.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSelectedUnitId(u.id);
                            scrollToSection('#unit-layanan');
                          }}
                          className="w-full p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between gap-3 text-left transition-colors"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {u.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {u.region} · {u.system}
                            </p>
                          </div>
                          <ChevronRight size={15} className="text-slate-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.knowledge.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                      Knowledge Center
                    </p>
                    <div className="space-y-1">
                      {searchResults.knowledge.map((k) => (
                        <button
                          key={k.id}
                          type="button"
                          onClick={() => {
                            setSearchOpen(false);
                            setActiveKnowledge(k);
                          }}
                          className="w-full p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between gap-3 text-left transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {k.title}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {k.category} · {k.readTime}
                            </p>
                          </div>
                          <FileText size={15} className="text-slate-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.news.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                      Berita & Agenda
                    </p>
                    <div className="space-y-1">
                      {searchResults.news.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            setSearchOpen(false);
                            setActiveNews(n);
                          }}
                          className="w-full p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between gap-3 text-left transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {n.title}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {n.category} · {n.dateLabel}
                            </p>
                          </div>
                          <Calendar size={15} className="text-slate-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.quick.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                      Layanan Aplikasi
                    </p>
                    <div className="space-y-1">
                      {searchResults.quick.map((qItem) => (
                        <button
                          key={qItem.id}
                          type="button"
                          onClick={() => {
                            setSearchOpen(false);
                            qItem.onClick();
                          }}
                          className="w-full p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between gap-3 text-left transition-colors"
                        >
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {qItem.title}
                          </p>
                          <span className="text-xs font-semibold text-pln-blue dark:text-cyan-400">
                            {qItem.actionLabel}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.units.length === 0 &&
                  searchResults.knowledge.length === 0 &&
                  searchResults.news.length === 0 &&
                  searchResults.quick.length === 0 && (
                    <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-6">
                      Tidak ada konten yang cocok dengan kata kunci tersebut.
                    </p>
                  )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Knowledge Article Reader Modal */}
      <AnimatePresence>
        {activeKnowledge && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-pln-blue dark:text-cyan-400">
                      {activeKnowledge.category}
                    </span>{' '}
                    · {activeKnowledge.audience} · {activeKnowledge.readTime}
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
                    {activeKnowledge.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveKnowledge(null)}
                  aria-label="Tutup panduan"
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeKnowledge.summary}
              </p>

              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Langkah Pelaksanaan
                </p>
                <ol className="space-y-3">
                  {activeKnowledge.steps.map((step, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200 leading-relaxed"
                    >
                      <span className="w-6 h-6 rounded-lg bg-pln-blue/10 dark:bg-cyan-500/15 text-pln-blue dark:text-cyan-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">{activeKnowledge.updatedLabel}</span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveKnowledge(null);
                    onStart();
                  }}
                  className="px-5 py-2.5 bg-pln-blue text-white rounded-xl text-xs font-bold hover:bg-pln-dark transition-colors"
                >
                  Buka di Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* News & Agenda Detail Modal */}
      <AnimatePresence>
        {activeNews && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-pln-blue dark:text-cyan-400">
                      {activeNews.category}
                    </span>{' '}
                    · {activeNews.dateLabel} · {activeNews.location}
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
                    {activeNews.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveNews(null)}
                  aria-label="Tutup informasi"
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeNews.content.map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveNews(null)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Public ID Verification Lookup Modal */}
      <AnimatePresence>
        {verifyModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Verifikasi ID Pegawai SIMAP
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Masukkan ID dokumen pegawai yang tertera pada QR Code kartu identitas digital untuk memeriksa status keaktifan resmi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setVerifyModalOpen(false)}
                  aria-label="Tutup modal verifikasi"
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleVerifySubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    ID Dokumen Pegawai
                  </label>
                  <input
                    type="text"
                    required
                    value={verifyInputId}
                    onChange={(e) => setVerifyInputId(e.target.value)}
                    placeholder="Contoh: emp_abc123..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-pln-blue"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setVerifyModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-pln-blue text-white rounded-xl text-xs font-bold hover:bg-pln-dark transition-colors inline-flex items-center gap-2"
                  >
                    <ShieldCheck size={15} />
                    Cek Keaslian ID
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
