import React, { useCallback, useEffect, useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  Loader2,
  Lock,
  ScanFace,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';
import {
  BiometricCapabilities,
  getBiometricCapabilities,
  listFirestoreBiometrics,
  listLocalBiometricCredentials,
  LocalBiometricCredential,
  registerBiometricCredential,
  revokeBiometricCredential,
  translateWebAuthnError,
} from '../../lib/biometricAuth';
import { BiometricCredentialRecord } from '../../types';
import { SectionCard } from './DashboardUI';

const BiometricSettingsCard: React.FC = () => {
  const { user, profile } = useAuth();
  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);
  const [firestoreDevices, setFirestoreDevices] = useState<BiometricCredentialRecord[]>([]);
  const [localCreds, setLocalCreds] = useState<LocalBiometricCredential[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadBiometricState = useCallback(async () => {
    if (!user?.uid) return;
    setLoadingList(true);
    try {
      const [caps, localList, remoteList] = await Promise.all([
        getBiometricCapabilities(),
        listLocalBiometricCredentials(),
        listFirestoreBiometrics(user.uid),
      ]);
      setCapabilities(caps);
      setLocalCreds(localList.filter((item) => item.uid === user.uid));
      remoteList.sort((a, b) => {
        const aSec = a.lastUsedAt?.seconds || 0;
        const bSec = b.lastUsedAt?.seconds || 0;
        return bSec - aSec;
      });
      setFirestoreDevices(remoteList);
    } catch (err) {
      console.error('Failed to load biometric state:', err);
    } finally {
      setLoadingList(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadBiometricState();
  }, [loadBiometricState]);

  const localCredDocIds = new Set(localCreds.map((c) => c.credDocId));
  const isThisDeviceEnrolled = firestoreDevices.some((d) => localCredDocIds.has(d.id)) || localCreds.length > 0;

  const handleEnrollCurrentDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;
    if (!password) {
      setErrorMsg('Masukkan password akun Anda untuk memverifikasi kepemilikan.');
      return;
    }

    setErrorMsg(null);
    setNotice(null);
    setEnrolling(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      await registerBiometricCredential({
        uid: user.uid,
        email: user.email,
        displayName: profile?.displayName || user.displayName || user.email,
        secret: password,
      });

      setPassword('');
      setShowEnrollForm(false);
      setNotice(
        'Login biometrik berhasil diaktifkan di perangkat ini! Anda dapat masuk menggunakan Sidik Jari / Face ID pada tampilan mobile.'
      );
      await loadBiometricState();
    } catch (err: any) {
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        setErrorMsg('Password tidak sesuai. Periksa kembali password akun Anda.');
      } else if (err?.code === 'auth/too-many-requests') {
        setErrorMsg('Terlalu banyak percobaan verifikasi. Coba beberapa saat lagi.');
      } else {
        setErrorMsg(translateWebAuthnError(err));
      }
    } finally {
      setEnrolling(false);
    }
  };

  const handleRevoke = async (credDocId: string) => {
    if (!user?.uid) return;
    setRevokingId(credDocId);
    setErrorMsg(null);
    setNotice(null);
    try {
      await revokeBiometricCredential(user.uid, credDocId);
      setFirestoreDevices((prev) => prev.filter((item) => item.id !== credDocId));
      setLocalCreds((prev) => prev.filter((item) => item.credDocId !== credDocId));
      setNotice('Perangkat biometrik berhasil dicabut dari akun Anda.');
    } catch (err) {
      setErrorMsg(translateWebAuthnError(err));
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <SectionCard
      title="Login Biometrik Perangkat (WebAuthn)"
      subtitle="Masuk cepat & aman di perangkat mobile menggunakan Sidik Jari atau Face ID"
      icon={Fingerprint}
      action={
        isThisDeviceEnrolled ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
            <ShieldCheck size={13} />
            Aktif di Perangkat Ini
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] text-[11px] font-bold">
            <Smartphone size={13} />
            Siap Diaktifkan
          </span>
        )
      }
    >
      <div className="space-y-5">
        {notice && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5 text-xs font-semibold">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <span>{notice}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-300 flex items-start gap-2.5 text-xs font-semibold">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Current Device Enrollment Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#F4F8FB] to-[#EAF6FC]/70 dark:from-[#0B172A] dark:to-[#0E1E36] border border-[#72C8F1]/35 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0072BC] to-[#173B65] text-white flex items-center justify-center shrink-0 shadow-sm">
              <ScanFace size={22} className="text-[#F9D423]" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-extrabold text-[#173B65] dark:text-slate-100">
                {capabilities?.deviceName || 'Perangkat Saat Ini'}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {capabilities && !capabilities.supported
                  ? 'Perangkat atau konteks browser saat ini belum mendukung WebAuthn. Buka SIMAP menggunakan browser mobile HTTPS.'
                  : isThisDeviceEnrolled
                  ? 'Perangkat ini sudah terhubung dengan kunci biometrik terenkripsi (AES-GCM + WebAuthn).'
                  : 'Daftarkan Sidik Jari atau Face ID perangkat ini agar Anda tidak perlu mengetik ulang password saat login di mobile.'}
              </p>
            </div>
          </div>

          {capabilities?.supported && (
            <button
              type="button"
              onClick={() => {
                setShowEnrollForm((prev) => !prev);
                setErrorMsg(null);
              }}
              className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0072BC] hover:bg-[#173B65] text-white text-xs font-bold transition-colors shadow-sm"
            >
              <Fingerprint size={15} className="text-[#F9D423]" />
              {isThisDeviceEnrolled ? 'Daftarkan Ulang Perangkat' : 'Aktifkan di Perangkat Ini'}
            </button>
          )}
        </div>

        {/* Inline Password Verification Form to Seal Biometric Credential */}
        {showEnrollForm && (
          <form
            onSubmit={handleEnrollCurrentDevice}
            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0B172A] border border-[#0072BC]/30 dark:border-[#72C8F1]/30 space-y-4 shadow-sm"
          >
            <div className="flex items-start gap-2.5">
              <Lock size={16} className="text-[#0072BC] dark:text-[#72C8F1] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-[#173B65] dark:text-slate-100">
                  Verifikasi Password Sebelum Pemindaian Biometrik
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Password Anda dienkripsi secara lokal menggunakan kunci non-ekstrak Web Crypto dan hanya dibuka setelah sidik jari / wajah terverifikasi.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password akun Anda saat ini"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={enrolling}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0072BC] hover:bg-[#173B65] text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {enrolling ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Memindai...
                    </>
                  ) : (
                    <>
                      <Fingerprint size={14} className="text-[#F9D423]" />
                      Pindai &amp; Simpan
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEnrollForm(false);
                    setPassword('');
                    setErrorMsg(null);
                  }}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Registered Devices List */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Perangkat Biometrik Terdaftar ({firestoreDevices.length})
          </p>

          {loadingList ? (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400 font-semibold">
              <Loader2 size={15} className="animate-spin text-[#0072BC]" />
              Memuat daftar perangkat...
            </div>
          ) : firestoreDevices.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
              Belum ada perangkat biometrik terdaftar pada akun ini.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-[#0B172A]">
              {firestoreDevices.map((device) => {
                const isCurrentDevice = localCredDocIds.has(device.id);
                const lastUsedDate = device.lastUsedAt?.toDate
                  ? device.lastUsedAt.toDate()
                  : device.lastUsedAt?.seconds
                  ? new Date(device.lastUsedAt.seconds * 1000)
                  : null;
                return (
                  <div
                    key={device.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-[#F8FBFD] dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center shrink-0">
                        <Smartphone size={17} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-[#173B65] dark:text-slate-100 truncate">
                            {device.deviceName}
                          </p>
                          {isCurrentDevice && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                              Perangkat Ini
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {lastUsedDate
                            ? `Terakhir digunakan ${formatDistanceToNow(lastUsedDate, {
                                addSuffix: true,
                                locale: idLocale,
                              })}`
                            : 'Terdaftar'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={revokingId === device.id}
                      onClick={() => handleRevoke(device.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 text-[11px] font-bold transition-colors shrink-0 disabled:opacity-50"
                    >
                      {revokingId === device.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                      Cabut
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
};

export default BiometricSettingsCard;
