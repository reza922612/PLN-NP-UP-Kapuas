import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import {
  ShieldCheck,
  AlertTriangle,
  Building2,
  Briefcase,
  BadgeCheck,
  ArrowLeft,
  Loader2,
  User as UserIcon,
  Lock,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { PublicEmployeeVerification } from '../../types';
import PlnNpLogo from '../common/PlnNpLogo';
import ThemeToggle from '../common/ThemeToggle';
import { StoredImage } from '../common/StoredFileUI';
import { cn } from '../../lib/utils';

interface PublicEmployeeVerifyProps {
  employeeId: string;
  onBackHome: () => void;
}

const PublicEmployeeVerify: React.FC<PublicEmployeeVerifyProps> = ({ employeeId, onBackHome }) => {
  const [record, setRecord] = useState<PublicEmployeeVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchVerification = async () => {
      setLoading(true);
      setNotFound(false);

      // Guard invalid ID format before hitting Firestore rules
      if (!employeeId || !/^[a-zA-Z0-9_-]{1,128}$/.test(employeeId)) {
        if (active) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }

      try {
        const snap = await getDoc(doc(db, 'public_verifications', employeeId));
        if (!active) return;
        if (snap.exists()) {
          setRecord(snap.data() as PublicEmployeeVerification);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.GET, `public_verifications/${employeeId}`);
        } catch {
          // Display clean not-found / unverified state
        }
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchVerification();
    return () => {
      active = false;
    };
  }, [employeeId]);

  const updatedDate = record?.updatedAt?.toDate
    ? record.updatedAt.toDate()
    : record?.updatedAt?.seconds
    ? new Date(record.updatedAt.seconds * 1000)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 sm:p-8 transition-colors duration-200">
      <header className="max-w-xl w-full mx-auto flex items-center justify-between py-2">
        <PlnNpLogo className="h-9 w-auto" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={onBackHome}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:text-pln-blue dark:hover:text-cyan-400 hover:border-pln-blue transition-all shadow-xs"
          >
            <ArrowLeft size={14} />
            Beranda
          </button>
        </div>
      </header>

      <main className="max-w-xl w-full mx-auto my-8">
        {loading ? (
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-16 shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center gap-4">
            <Loader2 size={36} className="animate-spin text-pln-blue dark:text-cyan-400" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Memverifikasi Identitas Pegawai...
            </p>
          </div>
        ) : notFound || !record ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-[32px] p-10 shadow-xl border border-red-100 dark:border-red-900/50 text-center space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-950/50 text-red-500 flex items-center justify-center mx-auto">
              <AlertTriangle size={38} />
            </div>
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest border border-red-100 dark:border-red-900/50">
                Verifikasi Gagal
              </span>
              <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                Data ID Pegawai Tidak Ditemukan
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-sm mx-auto">
                QR Code verifikasi tidak valid atau profil pegawai belum disinkronkan oleh Administrator SIMAP PT PLN Nusantara Power UP Kapuas.
              </p>
            </div>
            <button
              onClick={onBackHome}
              className="px-6 py-3 bg-slate-900 dark:bg-pln-blue text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-pln-blue transition-colors"
            >
              Kembali ke Halaman Utama
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
          >
            {/* Status Banner */}
            <div className="pln-gradient p-6 sm:p-8 text-white relative overflow-hidden">
              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center">
                    <ShieldCheck size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
                      Digital ID Verification
                    </p>
                    <h1 className="text-base sm:text-lg font-black uppercase tracking-tight">
                      {record.verifiedStatus === 'ACTIVE' ? 'Identitas Terverifikasi Resmi' : 'Status Non-Aktif'}
                    </h1>
                  </div>
                </div>
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shrink-0',
                    record.verifiedStatus === 'ACTIVE'
                      ? 'bg-emerald-400/20 text-emerald-100 border-emerald-300/40'
                      : 'bg-red-500/30 text-red-100 border-red-300/40'
                  )}
                >
                  {record.verifiedStatus === 'ACTIVE' ? 'AKTIF' : 'NON-AKTIF'}
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="w-28 h-28 rounded-3xl bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-800 shadow-lg overflow-hidden flex items-center justify-center text-slate-300 dark:text-slate-600 shrink-0">
                  {record.photoUrl ? (
                    <StoredImage
                      src={record.photoUrl}
                      alt={record.fullName}
                      className="w-full h-full object-cover"
                      fallback={<UserIcon size={52} />}
                    />
                  ) : (
                    <UserIcon size={52} />
                  )}
                </div>

                <div className="text-center sm:text-left space-y-1.5 min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-pln-blue dark:text-cyan-400 text-[10px] font-black uppercase tracking-wider">
                    <BadgeCheck size={12} />
                    NIP: {record.nip}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                    {record.fullName}
                  </h2>
                  <p className="text-xs font-bold text-pln-blue dark:text-cyan-400 uppercase tracking-wider">
                    {record.jabatanLengkap || '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Building2 size={12} className="text-pln-blue dark:text-cyan-400" /> Unit Pelaksana
                  </p>
                  <p className="text-xs font-black text-slate-700 dark:text-slate-200">{record.unitPelaksana}</p>
                  {record.subUnit && record.subUnit !== '-' && (
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{record.subUnit}</p>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Briefcase size={12} className="text-pln-blue dark:text-cyan-400" /> Status &amp; Perusahaan
                  </p>
                  <p className="text-xs font-black text-slate-700 dark:text-slate-200">{record.status}</p>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    {record.perusahaan}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex items-start gap-3">
                <Lock size={16} className="text-pln-blue dark:text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Perlindungan Privasi Data
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    Halaman ini hanya menampilkan informasi identitas kepegawaian publik untuk verifikasi kartu pegawai resmi. Data pribadi sensitif dilindungi sistem SIMAP.
                  </p>
                </div>
              </div>

              {updatedDate && (
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 pt-1">
                  <Clock size={12} />
                  <span>Terakhir disinkronkan: {format(updatedDate, 'dd MMM yyyy, HH:mm')}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>

      <footer className="max-w-xl w-full mx-auto text-center py-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          SIMAP PT PLN Nusantara Power UP Kapuas © 2026
        </p>
      </footer>
    </div>
  );
};

export default PublicEmployeeVerify;
