import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { ShieldCheck, Mail, Lock, Loader2, AlertCircle, UserPlus, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import PlnNpLogo from '../common/PlnNpLogo';

interface LoginProps {
  onBack?: () => void;
}

const Login: React.FC<LoginProps> = ({ onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError("Email tidak terdaftar.");
      } else if (err.code === 'auth/wrong-password') {
        setError("Password salah.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("Email sudah terdaftar.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("Fitur pendaftaran email belum diaktifkan di Console Firebase. Hubungi developer.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password terlalu lemah (minimal 6 karakter).");
      } else {
        setError(isLogin ? "Gagal masuk. Periksa email & password Anda." : "Gagal membuat akun. Pastikan Email Provider sudah aktif di Firebase Console.");
      }
      console.error("Firebase Auth Error:", err.code, err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Masukkan email terlebih dahulu untuk reset password.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError(null);
    } catch (err) {
      setError("Gagal mengirim email reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F8FAFC]">
      {/* Left Pane - Branding */}
      <div className="hidden lg:flex flex-col justify-between p-12 pln-gradient text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3.5 mb-12">
            <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/25 p-1.5 shadow-lg">
              <PlnNpLogo variant="icon" className="w-full h-full" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight uppercase leading-none">PLN Nusantara Power</h1>
              <p className="text-[10px] opacity-85 font-bold uppercase tracking-widest mt-1">UP KAPUAS</p>
            </div>
          </div>

          <div className="max-w-md">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-black leading-[1.1] mb-6 tracking-tighter"
            >
              Solusi <br /> <span className="text-cyan-300">Data Pegawai</span> <br /> Terintegrasi.
            </motion.h2>
            <p className="text-lg text-white/80 leading-relaxed font-medium">
              Sistem manajemen kepegawaian modern untuk PT PLN Nusantara Power Unit Pembangkitan Kapuas. Dashboard terpadu untuk efisiensi operasional.
            </p>
            {onBack && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={onBack}
                  className="flex items-center gap-2.5 px-6 py-3 bg-white text-slate-700 rounded-xl shadow-xl shadow-blue-950/20 text-xs font-black uppercase tracking-widest hover:bg-cyan-50 hover:text-pln-blue transition-all active:scale-95"
                >
                  <ArrowLeft size={15} />
                  Kembali
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-white/60">
          <div className="h-px w-12 bg-white/30"></div>
          <span>Digital Empowerment for Energy</span>
        </div>

        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400 rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-pln-blue rounded-full blur-[100px] opacity-30 -translate-x-1/4 translate-y-1/4"></div>
      </div>

      {/* Right Pane - Form */}
      <div className="flex items-center justify-center p-8 relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex justify-center lg:justify-start">
            <PlnNpLogo className="h-12 sm:h-14 w-auto" />
          </div>
          <div className="mb-10 text-center lg:text-left">
            <h3 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">
              {isLogin ? 'Login Admin' : 'Daftar Akun'}
            </h3>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">
              {isLogin ? 'Akses Dashboard Pegawai' : 'Buat Akun Baru Korporat'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Email Korporat</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 group-focus-within:text-pln-blue transition-colors" />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3.5 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-pln-blue transition-all outline-none text-sm font-semibold placeholder:text-slate-400 shadow-sm"
                  placeholder="admin@plnnusantarapower.co.id"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Password</label>
                {isLogin && (
                  <button 
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[10px] font-bold text-pln-blue hover:underline uppercase tracking-tight"
                  >
                    Lupa?
                  </button>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 group-focus-within:text-pln-blue transition-colors" />
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3.5 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-pln-blue transition-all outline-none text-sm font-semibold placeholder:text-slate-400 shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-[10px] font-bold uppercase tracking-tight"
              >
                <AlertCircle size={14} />
                {error}
              </motion.div>
            )}

            {resetSent && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-[10px] font-bold uppercase tracking-tight"
              >
                Reset dikirim ke email.
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full pln-gradient text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-blue-900/10 transition-all flex items-center justify-center gap-2 active:scale-[0.98] mt-2 group"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : (
                <>
                  {isLogin ? <ShieldCheck size={20} className="group-hover:rotate-12 transition-transform" /> : <UserPlus size={20} />}
                  <span className="uppercase tracking-widest text-xs">
                    {isLogin ? 'Masuk Sekarang' : 'Daftar Akun'}
                  </span>
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center space-y-4">
             <button 
               onClick={() => { setIsLogin(!isLogin); setError(null); }}
               className="text-xs font-bold text-slate-500 hover:text-pln-blue transition-colors"
             >
               {isLogin ? 'Belum punya akun? Daftar di sini' : 'Sudah punya akun? Masuk di sini'}
             </button>
             {onBack && (
               <div className="flex justify-center lg:hidden pt-1">
                 <button
                   type="button"
                   onClick={onBack}
                   className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-xl shadow-md border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-pln-blue transition-all"
                 >
                   <ArrowLeft size={14} />
                   Kembali
                 </button>
               </div>
             )}
          </div>

          <div className="mt-16 text-center">
             <div className="flex items-center justify-center gap-4 mb-4">
               <div className="h-px flex-1 bg-slate-100"></div>
               <span className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.3em]">Authorized Only</span>
               <div className="h-px flex-1 bg-slate-100"></div>
             </div>
             <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
               SIMAP PLN NP KAPUAS © 2026
             </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
