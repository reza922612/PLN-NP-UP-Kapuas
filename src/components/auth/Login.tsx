import React, { useEffect, useState } from 'react';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  Fingerprint,
  Loader2,
  Lock,
  Mail,
  ScanFace,
  ShieldCheck,
  Trash2,
  UserPlus,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { signOut } from 'firebase/auth';
import PlnNpLogo from '../common/PlnNpLogo';
import ThemeToggle from '../common/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import {
  authenticateWithBiometric,
  BiometricCapabilities,
  getBiometricCapabilities,
  listLocalBiometricCredentials,
  LocalBiometricCredential,
  registerBiometricCredential,
  removeLocalBiometricCredential,
  touchBiometricLastUsed,
  translateWebAuthnError,
} from '../../lib/biometricAuth';

const LOGIN_ILLUSTRATION = '/src/assets/images/login_powerplant_digital_1794932962355.jpg';
const REMEMBER_EMAIL_KEY = 'simap_remembered_email';

interface LoginProps {
  onBack?: () => void;
}

const Login: React.FC<LoginProps> = ({ onBack }) => {
  const { setBiometricEnrollmentActive } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem(REMEMBER_EMAIL_KEY) || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return Boolean(localStorage.getItem(REMEMBER_EMAIL_KEY));
    } catch {
      return true;
    }
  });
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [enrollingBiometric, setEnrollingBiometric] = useState(false);
  const [enrollBiometricOnLogin, setEnrollBiometricOnLogin] = useState(false);
  const [bioCapabilities, setBioCapabilities] = useState<BiometricCapabilities | null>(null);
  const [localBiometrics, setLocalBiometrics] = useState<LocalBiometricCredential[]>([]);
  const [selectedBioCredId, setSelectedBioCredId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [illustrationFailed, setIllustrationFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const initBiometrics = async () => {
      const [caps, creds] = await Promise.all([
        getBiometricCapabilities(),
        listLocalBiometricCredentials(),
      ]);
      if (!active) return;
      setBioCapabilities(caps);
      setLocalBiometrics(creds);
      if (creds.length > 0) {
        const remembered = creds.find(
          (c) => email.trim() && c.email.toLowerCase() === email.trim().toLowerCase()
        );
        setSelectedBioCredId((remembered || creds[0]).credDocId);
      }
    };
    initBiometrics();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!rememberMe) {
      try {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      } catch {
        // ignore storage errors
      }
    }
  }, [rememberMe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setResetSent(false);

    const isMobileViewport =
      typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
    const shouldEnrollBiometric =
      isLogin && isMobileViewport && enrollBiometricOnLogin && Boolean(bioCapabilities?.supported);

    if (shouldEnrollBiometric) {
      setBiometricEnrollmentActive(true);
    }

    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );

      if (rememberMe && email.trim()) {
        try {
          localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
        } catch {
          // ignore storage errors
        }
      }

      if (isLogin) {
        const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);

        if (shouldEnrollBiometric) {
          setEnrollingBiometric(true);
          setSuccessMessage(
            'Login berhasil. Pindai Sidik Jari / Face ID perangkat untuk mengaktifkan Biometric Login...'
          );
          try {
            await registerBiometricCredential({
              uid: userCred.user.uid,
              email: userCred.user.email || email.trim(),
              displayName: userCred.user.displayName || email.trim(),
              secret: password,
            });
            setSuccessMessage('Login & Biometric Login aktif. Memuat dashboard SIMAP...');
          } catch (bioErr) {
            console.warn('Biometric enrollment skipped:', bioErr);
          } finally {
            setEnrollingBiometric(false);
          }
        } else {
          setSuccessMessage('Login berhasil. Memuat dashboard SIMAP UP Kapuas...');
        }
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        setSuccessMessage('Akun berhasil dibuat. Mengarahkan ke portal SIMAP...');
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('Email tidak terdaftar.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Email atau password tidak sesuai.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email sudah terdaftar.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Fitur pendaftaran email belum diaktifkan di Console Firebase. Hubungi developer.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password terlalu lemah (minimal 6 karakter).');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Terlalu banyak percobaan login. Silakan coba beberapa saat lagi.');
      } else {
        setError(
          isLogin
            ? 'Gagal masuk. Periksa email & password Anda.'
            : 'Gagal membuat akun. Pastikan Email Provider sudah aktif di Firebase Console.'
        );
      }
      console.error('Firebase Auth Error:', err.code, err.message);
    } finally {
      if (shouldEnrollBiometric) {
        setBiometricEnrollmentActive(false);
      }
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setError(null);
    setSuccessMessage(null);
    setResetSent(false);
    setBiometricLoading(true);

    try {
      const unlocked = await authenticateWithBiometric(selectedBioCredId || undefined);

      await setPersistence(auth, browserLocalPersistence);
      try {
        localStorage.setItem(REMEMBER_EMAIL_KEY, unlocked.email);
      } catch {
        // ignore storage errors
      }

      const userCred = await signInWithEmailAndPassword(auth, unlocked.email, unlocked.secret);
      const stillValid = await touchBiometricLastUsed(userCred.user.uid, unlocked.credDocId);

      if (!stillValid) {
        await signOut(auth);
        const remaining = await listLocalBiometricCredentials();
        setLocalBiometrics(remaining);
        setSelectedBioCredId(remaining[0]?.credDocId || '');
        setError(
          'Akses biometrik perangkat ini telah dicabut. Silakan masuk menggunakan password.'
        );
        return;
      }

      setSuccessMessage('Verifikasi biometrik berhasil! Membuka dashboard pegawai...');
    } catch (err: any) {
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        if (selectedBioCredId) {
          await removeLocalBiometricCredential(selectedBioCredId);
          const remaining = await listLocalBiometricCredentials();
          setLocalBiometrics(remaining);
          setSelectedBioCredId(remaining[0]?.credDocId || '');
        }
        setError(
          'Password akun Anda telah berubah. Silakan masuk sekali dengan password baru untuk memperbarui kunci biometrik.'
        );
      } else {
        setError(translateWebAuthnError(err));
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleForgetLocalBiometric = async (credDocId: string) => {
    await removeLocalBiometricCredential(credDocId);
    const remaining = await listLocalBiometricCredentials();
    setLocalBiometrics(remaining);
    setSelectedBioCredId(remaining[0]?.credDocId || '');
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Masukkan email korporat terlebih dahulu untuk reset password.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch {
      setError('Gagal mengirim email reset password. Pastikan alamat email valid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-[#F4F8FC] dark:bg-slate-950 transition-colors duration-200">
      {/* Left Pane: Enterprise Energy Branding & Digital Power Plant Showcase */}
      <div className="hidden lg:flex lg:col-span-6 flex-col justify-between p-10 xl:p-14 bg-gradient-to-br from-[#003E72] via-[#005DAA] to-[#009CE0] text-white relative overflow-hidden">
        {/* Ambient Light Accents */}
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-300/20 rounded-full blur-[110px]"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -left-16 w-80 h-80 bg-[#F7E82E]/15 rounded-full blur-[110px]"
        />

        {/* Top Corporate Identity */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-lg border border-white/40 inline-flex items-center">
            <PlnNpLogo theme="light" className="h-8 w-auto" />
          </div>
          <span className="text-xs font-semibold tracking-wider uppercase text-cyan-100/90">
            UP Kapuas · Kalimantan Barat
          </span>
        </div>

        {/* Center Visual Showcase & Tagline */}
        <div className="relative z-10 my-auto py-8 space-y-7 max-w-xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="rounded-3xl overflow-hidden bg-white/10 backdrop-blur-md border border-white/25 p-2 shadow-2xl"
          >
            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-slate-900">
              {!illustrationFailed ? (
                <img
                  src={LOGIN_ILLUSTRATION}
                  alt="Ilustrasi Pembangkit Listrik Digital Modern PLN Nusantara Power UP Kapuas"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setIllustrationFailed(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#003E72] to-[#00AEEF] p-8 text-center">
                  <Zap size={40} className="text-[#F7E82E] mb-2" />
                  <p className="text-sm font-bold text-white">Smart Grid & Power Generation</p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/70 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-white/90 font-medium">
                <span className="flex items-center gap-1.5">
                  <Cpu size={14} className="text-[#F7E82E]" />
                  Digital Energy Infrastructure
                </span>
                <span>4 Unit Layanan</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="space-y-4"
          >
            <div className="w-12 h-1 rounded-full bg-[#F7E82E]" />
            <h2 className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight text-balance">
              &ldquo;Powering Excellence Through Digital Transformation.&rdquo;
            </h2>
            <p className="text-sm xl:text-base text-blue-100/90 leading-relaxed">
              Portal terintegrasi untuk pengelolaan sumber daya manusia, pemantauan aset mesin pembangkit, serta verifikasi kompetensi pegawai di lingkungan PT PLN Nusantara Power Unit Pembangkitan Kapuas.
            </p>
          </motion.div>

          {onBack && (
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2.5 px-6 py-3 bg-white/15 hover:bg-white text-white hover:text-[#003E72] backdrop-blur-md border border-white/30 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95"
              >
                <ArrowLeft size={15} />
                Kembali ke Beranda
              </button>
            </div>
          )}
        </div>

        {/* Bottom Corporate Divider */}
        <div className="relative z-10 flex items-center justify-between text-xs text-blue-100/75 pt-4 border-t border-white/15">
          <span>PT PLN Nusantara Power</span>
          <span>SIMAP Digital Command Center</span>
        </div>
      </div>

      {/* Right Pane: Minimalist Glassmorphic White Login Card */}
      <div className="lg:col-span-6 flex flex-col justify-center items-center p-5 sm:p-8 lg:p-12 relative overflow-hidden">
        {/* Soft atmospheric background glow */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_rgba(0,174,239,0.12),_transparent_45%),radial-gradient(circle_at_bottom_left,_rgba(247,232,46,0.12),_transparent_40%)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(0,174,239,0.12),_transparent_45%),radial-gradient(circle_at_bottom_left,_rgba(0,93,170,0.15),_transparent_45%)]"
        />

        {/* Top Bar Actions on Right Pane */}
        <div className="w-full max-w-md flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-pln-blue transition-colors shadow-sm"
              >
                <ArrowLeft size={14} />
                Kembali
              </button>
            )}
          </div>
          <ThemeToggle />
        </div>

        {/* White Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_24px_60px_-15px_rgba(0,93,170,0.14)] dark:shadow-slate-950/70 p-7 sm:p-10"
        >
          {/* Mobile / Card Brand Header */}
          <div className="flex items-center justify-between gap-4 mb-7">
            <PlnNpLogo className="h-9 sm:h-10 w-auto" />
            <span className="h-1.5 w-10 rounded-full bg-gradient-to-r from-[#005DAA] via-[#00AEEF] to-[#F7E82E]" />
          </div>

          {/* Headings */}
          <div className="space-y-2 mb-8">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-snug">
              WELCOME TO SIMAP UP KAPUAS
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Satu Platform, Satu Informasi, Terintegrasi.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email / Username Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Username / Email Korporat
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-pln-blue dark:group-focus-within:text-cyan-400 transition-colors" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@plnnusantarapower.co.id"
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-pln-blue focus:ring-4 focus:ring-pln-blue/10 dark:focus:ring-cyan-500/15 transition-all outline-none"
                />
              </div>
            </div>

            {/* Password Field with Show/Hide Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Password
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-semibold text-pln-blue dark:text-cyan-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pln-blue rounded"
                  >
                    Lupa Password?
                  </button>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-pln-blue dark:group-focus-within:text-cyan-400 transition-colors" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="block w-full pl-10 pr-11 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-pln-blue focus:ring-4 focus:ring-pln-blue/10 dark:focus:ring-cyan-500/15 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Mobile Biometric Enrollment Toggle */}
            <div className="space-y-2.5 pt-0.5">
              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-pln-blue focus:ring-pln-blue dark:bg-slate-800 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                  Remember Me (Simpan sesi &amp; email)
                </span>
              </label>

              {/* Mobile View Only: Opt-in to bind WebAuthn fingerprint/Face ID on login */}
              {isLogin && bioCapabilities?.supported && (
                <label className="lg:hidden flex items-start gap-2.5 cursor-pointer select-none group p-2.5 rounded-xl bg-[#EAF6FC]/70 dark:bg-[#0072BC]/15 border border-[#72C8F1]/35 dark:border-slate-700/80">
                  <input
                    type="checkbox"
                    checked={enrollBiometricOnLogin}
                    onChange={(e) => setEnrollBiometricOnLogin(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-slate-600 text-pln-blue focus:ring-pln-blue dark:bg-slate-800 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-[#173B65] dark:text-slate-200 leading-snug">
                    Aktifkan Login Biometrik (Sidik Jari / Face ID) di perangkat mobile ini
                  </span>
                </label>
              )}
            </div>

            {/* Status / Error Notifications */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  role="alert"
                  className="flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 rounded-xl text-xs font-medium"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {successMessage && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex items-start gap-2.5 p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-medium"
                >
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </motion.div>
              )}

              {resetSent && (
                <motion.div
                  key="reset"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex items-start gap-2.5 p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-medium"
                >
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <span>Tautan reset password telah dikirim ke email Anda.</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Primary LOGIN Button with Blue & PLN Yellow Accent */}
            <button
              type="submit"
              disabled={loading || biometricLoading || enrollingBiometric}
              className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#005DAA] via-[#0078D4] to-[#00AEEF] text-white font-bold py-3.5 px-6 shadow-lg shadow-blue-900/20 hover:shadow-xl hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 group"
            >
              {/* Subtle PLN Yellow accent stripe at bottom edge */}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-1 bg-[#F7E82E] opacity-90 group-hover:opacity-100 transition-opacity"
              />
              {loading || enrollingBiometric ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-xs uppercase tracking-widest">
                    {enrollingBiometric ? 'Memindai Biometrik...' : 'Memproses...'}
                  </span>
                </>
              ) : (
                <>
                  {isLogin ? (
                    <ShieldCheck size={18} className="text-[#F7E82E] group-hover:scale-110 transition-transform" />
                  ) : (
                    <UserPlus size={18} className="text-[#F7E82E]" />
                  )}
                  <span className="text-xs uppercase tracking-widest">
                    {isLogin ? 'LOGIN' : 'DAFTAR AKUN'}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Mobile View Only: Biometric Quick Login (WebAuthn Platform Authenticator) */}
          {isLogin && (
            <div className="lg:hidden mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center">
                    <Fingerprint size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-[#173B65] dark:text-slate-100 leading-none">
                      Biometric Login
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                      Sidik Jari / Face ID Mobile
                    </p>
                  </div>
                </div>
                {localBiometrics.length > 0 && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Siap Digunakan
                  </span>
                )}
              </div>

              {localBiometrics.length > 0 ? (
                <div className="space-y-2.5">
                  {localBiometrics.length > 1 ? (
                    <select
                      value={selectedBioCredId}
                      onChange={(e) => setSelectedBioCredId(e.target.value)}
                      aria-label="Pilih akun biometrik tersimpan"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                    >
                      {localBiometrics.map((cred) => (
                        <option key={cred.credDocId} value={cred.credDocId}>
                          {cred.email}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/80">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                        {localBiometrics[0].email}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleForgetLocalBiometric(localBiometrics[0].credDocId)}
                        title="Hapus akun biometrik dari perangkat ini"
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleBiometricLogin}
                    disabled={biometricLoading || loading}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#173B65] to-[#0072BC] hover:brightness-110 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-[#0072BC]/15 transition-all flex items-center justify-center gap-2.5 disabled:opacity-60"
                  >
                    {biometricLoading ? (
                      <>
                        <Loader2 size={17} className="animate-spin text-[#F9D423]" />
                        <span>Memindai Sidik Jari / Wajah...</span>
                      </>
                    ) : (
                      <>
                        <Fingerprint size={18} className="text-[#F9D423]" />
                        <span>Masuk dengan Biometrik</span>
                        <ScanFace size={16} className="text-[#72C8F1]" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {bioCapabilities && !bioCapabilities.supported
                    ? 'Akses login biometrik memerlukan browser mobile dengan dukungan WebAuthn (HTTPS).'
                    : 'Centang "Aktifkan Login Biometrik" di atas saat Anda masuk dengan password, atau aktifkan melalui menu Keamanan Biometrik di Portal Pegawai.'}
                </div>
              )}
            </div>
          )}

          {/* Toggle Login / Sign Up */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center space-y-3">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setSuccessMessage(null);
                setResetSent(false);
              }}
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-pln-blue dark:hover:text-cyan-400 transition-colors"
            >
              {isLogin ? 'Belum punya akun? Daftar di sini' : 'Sudah punya akun? Masuk di sini'}
            </button>
          </div>
        </motion.div>

        {/* Quiet Footer */}
        <div className="mt-8 text-center space-y-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Akses Khusus Pegawai & Administrator Resmi
          </p>
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
            SIMAP PT PLN Nusantara Power UP Kapuas © 2026
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
