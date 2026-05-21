import React from 'react';
import { 
  ShieldCheck, 
  Settings, 
  BarChart3, 
  Users, 
  Building2, 
  Zap, 
  ChevronRight,
  ArrowRight,
  MapPin,
  Cpu,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Youtube,
  Twitter
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const features = [
    {
      title: "Manajemen Unit Pelayanan",
      description: "Monitoring aset pembangkit secara real-time di seluruh wilayah UP Kapuas.",
      icon: Building2,
      color: "bg-blue-500"
    },
    {
      title: "Data Kompetensi Pegawai",
      description: "Database sertifikasi dan riwayat pelatihan untuk pengembangan talenta.",
      icon: Users,
      color: "bg-emerald-500"
    },
    {
      title: "Analitik Data Aset",
      description: "Laporan performa mesin dan beban puncak untuk optimasi operasional.",
      icon: BarChart3,
      color: "bg-amber-500"
    },
    {
      title: "Keamanan Terintegrasi",
      description: "Akses data terkontrol dengan sistem autentikasi terpusat.",
      icon: ShieldCheck,
      color: "bg-indigo-500"
    }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-50">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/PLN_Nusantara_Power.png/400px-PLN_Nusantara_Power.png" 
                alt="PLN Nusantara Power Logo" 
                className="h-8 object-contain" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block" />
            <div className="hidden sm:block">
              <span className="text-lg font-black tracking-tighter text-slate-800 uppercase block leading-none">SIMAP</span>
              <span className="text-[9px] font-black tracking-widest text-pln-blue uppercase">UP Kapuas</span>
            </div>
          </div>
          <button 
            onClick={onStart}
            className="px-6 py-2.5 bg-pln-blue text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-200"
          >
            Login Dashboard
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 relative">
        <div className="absolute top-0 right-0 w-1/3 h-2/3 bg-blue-50/50 rounded-bl-[200px] -z-10" />
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-pln-blue rounded-full">
                <Settings size={14} className="animate-spin-slow" />
                <span className="text-[10px] font-black uppercase tracking-widest">Sistem Manajemen Aset & Pegawai</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/PLN_Nusantara_Power.png/600px-PLN_Nusantara_Power.png" 
                alt="PLN NP" 
                className="h-14 object-contain mb-2"
                referrerPolicy="no-referrer"
              />
              <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] tracking-tighter">
                Digitalisasi <br/>
                <span className="text-pln-blue italic">Operasional</span> <br/>
                Pembangkit.
              </h1>
            </div>
            <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-lg">
              Optimalkan pengelolaan data unit, monitoring aset mesin, dan pengembangan kompetensi pegawai dalam satu platform terintegrasi untuk PLN NP UP Kapuas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={onStart}
                className="group px-8 py-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 hover:bg-pln-blue transition-all shadow-2xl shadow-slate-200"
              >
                <span className="font-black uppercase tracking-widest text-sm">Masuk ke Dashboard</span>
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center gap-4 px-6 py-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                <MapPin className="text-blue-500" size={20} />
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lokasi Operasional</p>
                  <p className="text-xs font-bold text-slate-700">UP KAPUAS, Kalimantan Barat</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-square rounded-[60px] overflow-hidden shadow-2xl border-8 border-white">
              <img 
                src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=2070&auto=format&fit=crop" 
                alt="Industrial Control Room" 
                className="object-cover w-full h-full grayscale hover:grayscale-0 transition-all duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-pln-blue/20 to-transparent" />
            </div>
            
            {/* Stats Overlay */}
            <div className="absolute -bottom-10 -left-10 bg-white p-8 rounded-[40px] shadow-2xl border border-slate-50 space-y-4 max-w-[240px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Cpu size={20} />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900 tracking-tighter">100%</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Digital Readiness</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Sistem manajemen data terintegrasi sesuai standar PLN Nusantara Power.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
            <h2 className="text-[10px] font-black text-pln-blue uppercase tracking-[0.2em]">Core Capabilities</h2>
            <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Optimasi Tanpa Batas</h3>
            <p className="text-slate-500 font-medium">Solusi digital yang dirancang khusus untuk memenuhi kebutuhan spesifik pengelolaan unit pelayanan dan pembangkit.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="bg-white p-8 rounded-[40px] border border-slate-100 hover:shadow-2xl hover:shadow-blue-100/50 transition-all group"
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform shadow-lg", feature.color)}>
                  <feature.icon size={26} />
                </div>
                <h4 className="text-lg font-black text-slate-800 mb-3 uppercase tracking-tight">{feature.title}</h4>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto bg-slate-900 rounded-[60px] p-12 md:p-20 relative overflow-hidden text-center text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-pln-blue/20 blur-[100px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full" />
          
          <div className="relative z-10 space-y-8">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight uppercase leading-none">
              Siap Menuju <br/>
              <span className="text-pln-blue italic">Excellent Service?</span>
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto font-medium">
              Mulai kelola aset dan data pegawai Anda secara profesional melalui platform SIMAP. Hubungi Administrator untuk akses akun.
            </p>
            <div className="flex justify-center">
              <button 
                onClick={onStart}
                className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center gap-3 hover:bg-pln-blue hover:text-white transition-all group"
              >
                Mulai Sekarang
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-20 pb-10 bg-[#151b36] text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 pb-16 border-b border-white/10">
            {/* Column 1: Contact & Address */}
            <div className="space-y-8">
              <div className="bg-white/5 p-4 rounded-2xl w-fit">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/PLN_Nusantara_Power.png/400px-PLN_Nusantara_Power.png" 
                  alt="PLN NP" 
                  className="h-10 object-contain brightness-0 invert"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-pln-blue mb-3">Head Office</h4>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed">
                    Jl. Ketintang Baru No. 11, Surabaya, Indonesia
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-pln-blue mb-3">Strategic Office</h4>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed">
                    18 Office Park, Jl. TB Simatupang No.18 Jakarta Selatan, DKI Jakarta, Indonesia
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <a href="tel:+62318283180" className="flex items-center gap-3 text-sm text-slate-400 hover:text-white transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-pln-blue transition-colors">
                      <Phone size={14} />
                    </div>
                    <span className="font-bold">+62 31 8283180</span>
                  </a>
                  <a href="mailto:info@plnnusantarapower.co.id" className="flex items-center gap-3 text-sm text-slate-400 hover:text-white transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-pln-blue transition-colors">
                      <Mail size={14} />
                    </div>
                    <span className="font-bold">info@plnnusantarapower.co.id</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Column 2: Our Company */}
            <div className="space-y-6 lg:pl-12">
              <h3 className="text-lg font-black uppercase tracking-tight">Our Company</h3>
              <ul className="space-y-4">
                {['Overview', 'Who We Are', 'Project & Achievement'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-slate-400 hover:text-white hover:translate-x-1 transition-all inline-block font-medium">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
              
              <div className="pt-8 border-t border-white/5">
                <h4 className="text-sm font-black uppercase tracking-widest text-pln-blue mb-4">Follow Us</h4>
                <div className="flex items-center gap-3">
                  {[
                    { icon: Instagram, label: 'Instagram' },
                    { icon: Facebook, label: 'Facebook' },
                    { icon: Youtube, label: 'Youtube' },
                    { icon: Twitter, label: 'X' }
                  ].map((social) => (
                    <a 
                      key={social.label}
                      href="#" 
                      className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:bg-pln-blue hover:text-white transition-all"
                      title={social.label}
                    >
                      <social.icon size={18} />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 3: Sustainability */}
            <div className="space-y-6 lg:pl-12">
              <h3 className="text-lg font-black uppercase tracking-tight">Sustainability</h3>
              <ul className="space-y-4">
                {['Environment', 'Social', 'Governance'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-slate-400 hover:text-white hover:translate-x-1 transition-all inline-block font-medium">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Media Relation */}
            <div className="space-y-6 lg:pl-12">
              <h3 className="text-lg font-black uppercase tracking-tight">Media Relation</h3>
              <ul className="space-y-4">
                {['NP News', 'Press Release', 'Gallery Photo'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-slate-400 hover:text-white hover:translate-x-1 transition-all inline-block font-medium">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-pln-blue flex items-center justify-center text-white">
                <Zap size={14} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Managed by PLN NP UP Kapuas
              </span>
            </div>
            
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              © 2026 PT PLN NUSANTARA POWER. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
