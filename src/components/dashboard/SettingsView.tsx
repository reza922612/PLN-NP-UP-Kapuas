import React, { useEffect, useState } from 'react';
import {
  Sun,
  Moon,
  User,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Sparkles,
  Eye,
  Mail,
  Building2,
  Settings,
  Users,
  Lock,
} from 'lucide-react';
import { collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { logActivity } from '../../lib/activityLogger';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';
import { ThemeMode, UserProfile, UserRole } from '../../types';
import { PageHeader, SectionCard } from '../common/DashboardUI';

const ROLE_LABELS: Record<UserRole, { name: string; desc: string; color: string }> = {
  super_admin: {
    name: 'Super Admin',
    desc: 'Akses penuh seluruh modul, Data Pembangkit, hapus data, dan pengaturan peran akun.',
    color: 'bg-[#F9D423]/20 text-amber-800 dark:text-[#F9D423]',
  },
  admin: {
    name: 'Admin SDM / Unit',
    desc: 'Tambah dan perbarui data pegawai, sertifikasi, scan dokumen, dan lihat daftar pengguna.',
    color: 'bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1]',
  },
  viewer: {
    name: 'Viewer / Eksekutif',
    desc: 'Akses baca seluruh dashboard, laporan analitik, struktur organisasi, dan ekspor laporan.',
    color: 'bg-slate-100 dark:bg-slate-800 text-[#173B65] dark:text-slate-200',
  },
  employee: {
    name: 'Pegawai (Self-Service)',
    desc: 'Akses portal mandiri pegawai untuk melihat & memperbarui informasi kontak/dokumen pribadi.',
    color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
  },
};

const SettingsView: React.FC = () => {
  const { user, profile, updateUserProfile } = useAuth();
  const { theme, setTheme, savingTheme } = useTheme();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isSuperAdmin = profile?.role === 'super_admin';

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.displayName || '');
  }, [profile?.displayName]);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const snap = await getDocs(collection(db, 'users'));
        if (!active) return;
        const list = snap.docs.map((d) => ({ ...d.data(), uid: d.id } as UserProfile));
        list.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
        setUsersList(list);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        if (active) setLoadingUsers(false);
      }
    };
    loadUsers();
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const handleSelectTheme = async (mode: ThemeMode) => {
    setErrorMsg(null);
    await setTheme(mode);
    setSavedNotice(
      mode === 'dark'
        ? 'Mode Gelap diaktifkan dan disimpan ke pengaturan profil Anda.'
        : 'Mode Terang diaktifkan dan disimpan ke pengaturan profil Anda.'
    );
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg('Nama tampilan tidak boleh kosong.');
      return;
    }
    setErrorMsg(null);
    setSavingProfile(true);
    try {
      await updateUserProfile({ displayName: displayName.trim() });
      setSavedNotice('Profil pengguna berhasil diperbarui.');
      setTimeout(() => setSavedNotice(null), 3500);
    } catch {
      setErrorMsg('Gagal menyimpan perubahan profil. Silakan coba lagi.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangeUserRole = async (targetUser: UserProfile, newRole: UserRole) => {
    if (!isSuperAdmin || targetUser.uid === user?.uid) return;
    setUpdatingUid(targetUser.uid);
    setErrorMsg(null);
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        role: newRole,
        updatedAt: serverTimestamp(),
      });
      await logActivity({
        action: 'UPDATE',
        entityType: 'system',
        entityId: targetUser.uid,
        entityName: targetUser.email,
        description: `Mengubah hak akses akun ${targetUser.email} menjadi ${newRole.replace('_', ' ')}`,
      });
      setUsersList((prev) =>
        prev.map((u) => (u.uid === targetUser.uid ? { ...u, role: newRole } : u))
      );
      setSavedNotice(`Hak akses ${targetUser.email} diperbarui menjadi ${ROLE_LABELS[newRole].name}.`);
      setTimeout(() => setSavedNotice(null), 3500);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.uid}`);
      setErrorMsg('Gagal memperbarui peran pengguna.');
    } finally {
      setUpdatingUid(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <PageHeader
        title="Pengaturan Sistem &amp; Akun"
        subtitle="Kelola profil pengguna, preferensi tampilan antarmuka, hak akses, dan peran akun"
        icon={Settings}
        badge={profile?.role ? ROLE_LABELS[profile.role]?.name : 'Akun'}
      />

      {savedNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-3 text-xs font-bold">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-300 text-xs font-bold">
          {errorMsg}
        </div>
      )}

      {/* Theme Appearance Card */}
      <SectionCard
        title="Preferensi Tampilan &amp; Aksesibilitas"
        subtitle="Pilihan tema otomatis tersinkron ke akun Anda di semua perangkat"
        icon={Eye}
        action={
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[11px] font-bold text-[#0072BC] dark:text-[#72C8F1]">
            {savingTheme ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Menyimpan...
              </>
            ) : (
              <>
                <Sparkles size={12} /> Tersinkron ke Profil
              </>
            )}
          </span>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <button
            type="button"
            onClick={() => handleSelectTheme('light')}
            aria-pressed={theme === 'light'}
            className={cn(
              'text-left p-5 rounded-2xl border-2 transition-all space-y-4',
              theme === 'light'
                ? 'border-[#0072BC] bg-[#EAF6FC]/40 dark:bg-[#0072BC]/15 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:border-[#72C8F1] bg-[#F8FBFD] dark:bg-[#091426]'
            )}
          >
            <div className="h-24 rounded-xl bg-[#F4F8FB] border border-slate-200 p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0072BC]" />
                  <span className="h-2 w-16 rounded bg-slate-300" />
                </div>
                <Sun size={14} className="text-amber-500" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-8 rounded-lg bg-white border border-slate-200" />
                <div className="h-8 rounded-lg bg-white border border-slate-200" />
                <div className="h-8 rounded-lg bg-white border border-slate-200" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-[#173B65] dark:text-slate-100 flex items-center gap-2">
                  <Sun size={15} className="text-amber-500" />
                  Mode Terang (Light)
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Optimal untuk ruangan terang dan pembacaan laporan kerja.
                </p>
              </div>
              {theme === 'light' && (
                <span className="px-2.5 py-1 rounded-lg bg-[#0072BC] text-white text-[10px] font-bold uppercase">
                  Aktif
                </span>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTheme('dark')}
            aria-pressed={theme === 'dark'}
            className={cn(
              'text-left p-5 rounded-2xl border-2 transition-all space-y-4',
              theme === 'dark'
                ? 'border-[#72C8F1] bg-[#0B172A] shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:border-[#72C8F1] bg-[#F8FBFD] dark:bg-[#091426]'
            )}
          >
            <div className="h-24 rounded-xl bg-[#071120] border border-slate-800 p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#72C8F1]" />
                  <span className="h-2 w-16 rounded bg-slate-700" />
                </div>
                <Moon size={14} className="text-[#72C8F1]" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-8 rounded-lg bg-[#0E1A2E] border border-slate-800" />
                <div className="h-8 rounded-lg bg-[#0E1A2E] border border-slate-800" />
                <div className="h-8 rounded-lg bg-[#0E1A2E] border border-slate-800" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-[#173B65] dark:text-slate-100 flex items-center gap-2">
                  <Moon size={15} className="text-[#72C8F1]" />
                  Mode Gelap (Dark)
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Mengurangi silau layar di ruang kontrol dan pencahayaan rendah.
                </p>
              </div>
              {theme === 'dark' && (
                <span className="px-2.5 py-1 rounded-lg bg-[#72C8F1] text-[#173B65] text-[10px] font-bold uppercase">
                  Aktif
                </span>
              )}
            </div>
          </button>
        </div>
      </SectionCard>

      {/* Account Profile Card */}
      <SectionCard
        title="Profil Akun Pengguna"
        subtitle="Informasi akun dan identitas tampilan yang dicatat pada Activity Log"
        icon={User}
      >
        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Nama Tampilan
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={256}
                placeholder="Nama lengkap admin / pengguna"
                className="w-full px-4 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Mail size={12} /> Email Akun
              </label>
              <input
                type="text"
                disabled
                value={user?.email || profile?.email || '-'}
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={12} /> Hak Akses (Role)
              </label>
              <div className="px-4 py-2.5 bg-[#EAF6FC] dark:bg-[#0072BC]/15 border border-[#72C8F1]/30 dark:border-slate-800 rounded-xl text-xs font-extrabold uppercase text-[#0072BC] dark:text-[#72C8F1]">
                {profile?.role ? ROLE_LABELS[profile.role]?.name : '-'}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={12} /> Unit Kerja
              </label>
              <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
                {profile?.unitId || 'UP Kapuas'}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0072BC] text-white rounded-xl text-xs font-bold hover:bg-[#173B65] transition-colors disabled:opacity-50"
            >
              {savingProfile ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Menyimpan...
                </>
              ) : (
                'Simpan Profil'
              )}
            </button>
          </div>
        </form>
      </SectionCard>

      {/* Role & Permission Matrix */}
      <SectionCard
        title="Matriks Hak Akses &amp; Kewenangan Sistem"
        subtitle="Pembagian peran operasional sesuai kebijakan keamanan aplikasi SIMAP"
        icon={Lock}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {(Object.entries(ROLE_LABELS) as [UserRole, (typeof ROLE_LABELS)[UserRole]][]).map(
            ([key, info]) => (
              <div
                key={key}
                className={cn(
                  'p-4 rounded-xl border bg-[#F8FBFD] dark:bg-[#0B172A]',
                  profile?.role === key
                    ? 'border-[#0072BC] dark:border-[#72C8F1]'
                    : 'border-slate-200/80 dark:border-slate-800'
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-bold', info.color)}>
                    {info.name}
                  </span>
                  {profile?.role === key && (
                    <span className="text-[10px] font-bold text-[#0072BC] dark:text-[#72C8F1]">
                      Peran Anda
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {info.desc}
                </p>
              </div>
            )
          )}
        </div>
      </SectionCard>

      {/* Account & Role Management (visible for admin/super_admin, editable by super_admin) */}
      {isAdmin && (
        <SectionCard
          title="Manajemen Akun &amp; Peran Pengguna"
          subtitle={
            isSuperAdmin
              ? 'Kelola peran akses akun terdaftar di SIMAP UP Kapuas'
              : 'Daftar akun terdaftar (perubahan peran hanya tersedia untuk Super Admin)'
          }
          icon={Users}
        >
          {loadingUsers ? (
            <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-400 font-semibold">
              <Loader2 size={16} className="animate-spin text-[#0072BC]" />
              Memuat daftar pengguna...
            </div>
          ) : usersList.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              Belum ada akun pengguna terdaftar.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-6 -my-6">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F4F8FB] dark:bg-[#0B172A] border-b border-slate-100 dark:border-slate-800">
                  <tr className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    <th className="px-6 py-3.5">Pengguna</th>
                    <th className="px-6 py-3.5">Unit</th>
                    <th className="px-6 py-3.5">Tema</th>
                    <th className="px-6 py-3.5 text-right">Peran Akses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {usersList.map((u) => {
                    const isSelf = u.uid === user?.uid;
                    const roleInfo = ROLE_LABELS[u.role] || ROLE_LABELS.viewer;
                    return (
                      <tr key={u.uid} className="hover:bg-[#EAF6FC]/40 dark:hover:bg-[#0072BC]/10">
                        <td className="px-6 py-3.5">
                          <p className="font-bold text-[#173B65] dark:text-slate-100">
                            {u.displayName || 'Tanpa Nama'}{' '}
                            {isSelf && (
                              <span className="text-[10px] font-bold text-[#0072BC] dark:text-[#72C8F1]">
                                (Anda)
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 dark:text-slate-300 font-medium">
                          {u.unitId || 'UP Kapuas'}
                        </td>
                        <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400 capitalize">
                          {u.themePreference || 'light'}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          {isSuperAdmin && !isSelf ? (
                            <div className="inline-flex items-center gap-2">
                              {updatingUid === u.uid && (
                                <Loader2 size={13} className="animate-spin text-[#0072BC]" />
                              )}
                              <select
                                value={u.role}
                                disabled={updatingUid === u.uid}
                                onChange={(e) =>
                                  handleChangeUserRole(u, e.target.value as UserRole)
                                }
                                className="px-2.5 py-1.5 bg-white dark:bg-[#0B172A] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                              >
                                <option value="super_admin">Super Admin</option>
                                <option value="admin">Admin SDM</option>
                                <option value="viewer">Viewer</option>
                                <option value="employee">Pegawai</option>
                              </select>
                            </div>
                          ) : (
                            <span className={cn('px-2.5 py-1 rounded-md text-[11px] font-bold', roleInfo.color)}>
                              {roleInfo.name}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
};

export default SettingsView;
