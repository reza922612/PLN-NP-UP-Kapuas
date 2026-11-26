import React, { useEffect, useRef, useState } from 'react';
import { Employee } from '../../types';
import {
  Phone,
  ArrowLeft,
  Printer,
  Edit,
  User as UserIcon,
  FileSpreadsheet,
  QrCode,
  Download,
  Copy,
  Check,
  ExternalLink,
  ScanLine,
  FileText,
  CheckCircle2,
  Award,
  BookOpen,
  ShieldCheck,
  Briefcase,
  BellRing,
  Users,
  ArrowLeftRight,
  Clock,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { logActivity } from '../../lib/activityLogger';
import { useAuth } from '../../context/AuthContext';
import { syncPublicVerification } from '../../lib/publicVerification';
import { formatDate, calculateAge, calculateTenure, calculatePositionTenure, cn } from '../../lib/utils';
import { evaluateCertificationStatus } from '../../lib/certificationStatus';
import { SectionCard } from '../common/DashboardUI';
import { StoredImage, StoredFileLink } from '../common/StoredFileUI';
import DocumentScannerModal from './DocumentScannerModal';
import MutationFormModal from './MutationFormModal';
import { useMutations } from '../../hooks/useMutations';
import { MUTATION_STATUS_META, inferMutationTypeBadge } from '../../data/mutationConstants';

interface EmployeeDetailProps {
  employee: Employee;
  onBack: () => void;
  onEdit?: () => void;
  onPreviewVerify?: (employeeId: string) => void;
  onUpdateEmployee?: (id: string, data: Partial<Employee>) => Promise<void>;
}

type DetailTab = 'general' | 'legal' | 'family' | 'competency' | 'mutations' | 'documents';

const EmployeeDetail: React.FC<EmployeeDetailProps> = ({
  employee,
  onBack,
  onEdit,
  onPreviewVerify,
  onUpdateEmployee,
}) => {
  const { profile } = useAuth();
  const [activeSection, setActiveSection] = useState<DetailTab>('general');
  const [copied, setCopied] = useState(false);
  const [syncReady, setSyncReady] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMutationModalOpen, setIsMutationModalOpen] = useState(false);
  const [scanToast, setScanToast] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLDivElement>(null);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const { mutations: employeeMutations, submitMutation } = useMutations({
    enabled: Boolean(employee.id),
    employeeIdFilter: employee.id,
  });

  const verificationUrl = employee.id
    ? `${window.location.origin}/?verify=${encodeURIComponent(employee.id)}`
    : '';

  useEffect(() => {
    const isAdm = profile?.role === 'admin' || profile?.role === 'super_admin';
    if (employee.id && isAdm) {
      syncPublicVerification(employee.id, employee).then(() => {
        setSyncReady(true);
      });
    }
  }, [employee, profile?.role]);

  const handleCopyUrl = async () => {
    if (!verificationUrl) return;
    try {
      await navigator.clipboard.writeText(verificationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API fallback ignored cleanly
    }
  };

  const handleDownloadQR = () => {
    const canvas = qrCanvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `QR_Verifikasi_${employee.nip}_${employee.fullName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveScan = async (updates: Partial<Employee>, activityDetail: string) => {
    if (!employee.id) return;
    if (onUpdateEmployee) {
      await onUpdateEmployee(employee.id, updates);
    } else {
      try {
        await updateDoc(doc(db, 'employees', employee.id), {
          ...updates,
          updatedAt: serverTimestamp(),
        });
        await logActivity({
          action: 'UPDATE',
          entityType: 'employee',
          entityId: employee.id,
          entityName: `${employee.fullName} (${employee.nip})`,
          description: activityDetail,
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `employees/${employee.id}`);
      }
    }
    setScanToast('Dokumen hasil pindaian berhasil disimpan ke profil pegawai.');
    setTimeout(() => setScanToast(null), 4000);
  };

  const InfoItem = ({ label, value }: { label: string; value?: string }) => (
    <div className="space-y-1">
      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-[#173B65] dark:text-slate-100 break-words">
        {value || '-'}
      </p>
    </div>
  );

  const tabs: { id: DetailTab; label: string; icon: React.ElementType }[] = [
    { id: 'general', label: 'Informasi Umum', icon: Briefcase },
    { id: 'legal', label: 'Pendidikan & Legal', icon: ShieldCheck },
    { id: 'family', label: `Data Keluarga (${employee.familyMembers?.length || 0})`, icon: Users },
    { id: 'competency', label: 'Pelatihan & Sertifikasi', icon: Award },
    { id: 'mutations', label: `Riwayat Mutasi (${employeeMutations.length})`, icon: ArrowLeftRight },
    { id: 'documents', label: 'Arsip Scan & Dokumen', icon: FileText },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Action Header */}
      <div className="corporate-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {profile?.role !== 'employee' && (
            <button
              type="button"
              onClick={onBack}
              className="p-2.5 bg-[#F4F8FB] dark:bg-slate-800 hover:bg-[#EAF6FC] dark:hover:bg-slate-700 rounded-xl transition-colors text-[#173B65] dark:text-slate-200"
              title="Kembali ke Daftar"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold text-[#173B65] dark:text-slate-100 tracking-tight">
                {employee.fullName}
              </h2>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase',
                  employee.status === 'Pegawai Organik'
                    ? 'bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1]'
                    : employee.status === 'Pegawai Tugas Khusus'
                    ? 'bg-amber-50 dark:bg-[#F9D423]/15 text-amber-700 dark:text-[#F9D423]'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                )}
              >
                {employee.status}
              </span>
              {employee.placementStatus === 'Mutasi Keluar' && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Mutasi Keluar
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              NIP {employee.nip} · {employee.unitPelaksana}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && employee.id && (
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <ScanLine size={14} />
              Scan Dokumen
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[#173B65] dark:text-slate-200 hover:border-[#0072BC] transition-colors"
          >
            <Printer size={14} />
            Cetak Profil
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0072BC] text-white rounded-xl text-xs font-bold hover:bg-[#173B65] transition-colors shadow-xs"
            >
              <Edit size={14} />
              Edit Data
            </button>
          )}
        </div>
      </div>

      {scanToast && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 px-5 py-3.5 rounded-2xl flex items-center gap-3 text-xs font-bold">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{scanToast}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar Profile Summary + QR */}
        <div className="lg:col-span-1 space-y-6">
          <div className="corporate-card p-6 text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#0072BC] via-[#72C8F1] to-[#F9D423]" />
            <div className="w-36 h-36 bg-[#EAF6FC] dark:bg-slate-800 rounded-2xl mx-auto mb-5 flex items-center justify-center text-[#0072BC]/40 dark:text-slate-600 ring-4 ring-[#F4F8FB] dark:ring-slate-800 overflow-hidden mt-2">
              {employee.photoUrl ? (
                <StoredImage
                  src={employee.photoUrl}
                  alt={employee.fullName}
                  className="w-full h-full object-cover"
                  fallback={<UserIcon size={68} />}
                />
              ) : (
                <UserIcon size={68} />
              )}
            </div>
            <h3 className="text-lg font-extrabold text-[#173B65] dark:text-slate-100 leading-snug">
              {employee.fullName}
            </h3>
            <p className="text-xs font-bold text-[#0072BC] dark:text-[#72C8F1] mt-1">
              {employee.jabatanLengkap}
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-1">
              {employee.perusahaan}
            </p>

            <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
              <div className="p-3 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/60">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Masa Kerja</p>
                <p className="text-xs font-extrabold text-[#173B65] dark:text-slate-100 mt-0.5 tabular-nums">
                  {calculateTenure(employee.tanggalPengangkatan)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/60">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Usia</p>
                <p className="text-xs font-extrabold text-[#173B65] dark:text-slate-100 mt-0.5 tabular-nums">
                  {calculateAge(employee.tanggalLahir)} Tahun
                </p>
              </div>
            </div>
          </div>

          <SectionCard title="Informasi Kontak" icon={Phone}>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email Korporat</p>
                <p className="text-xs font-bold text-[#173B65] dark:text-slate-200 truncate mt-0.5">
                  {employee.emailKorporat || '-'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nomor Telepon</p>
                <p className="text-xs font-bold text-[#173B65] dark:text-slate-200 font-mono mt-0.5">
                  {employee.noTelepon || '-'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Alamat Lengkap</p>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5">
                  {employee.alamatLengkap || '-'}
                </p>
              </div>
            </div>
          </SectionCard>

          {employee.dossierUrl && (
            <StoredFileLink
              url={employee.dossierUrl}
              fileName={`Dossier_${employee.fullName}`}
              className="flex items-center justify-center gap-2.5 w-full p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl text-emerald-700 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
            >
              <FileSpreadsheet size={17} />
              Buka Digital Dossier Pegawai
            </StoredFileLink>
          )}

          {employee.id && (
            <SectionCard
              title="QR Verifikasi ID"
              icon={QrCode}
              action={
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase px-2 py-0.5 rounded-md',
                    syncReady
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      : 'bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1]'
                  )}
                >
                  {syncReady ? 'Tersinkron' : 'Publik ID'}
                </span>
              }
            >
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center p-4 bg-[#F4F8FB] dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2.5">
                  <div className="p-2.5 bg-white rounded-xl shadow-xs border border-slate-100">
                    <QRCodeSVG
                      value={verificationUrl}
                      size={140}
                      level="M"
                      fgColor="#173B65"
                      bgColor="#FFFFFF"
                    />
                  </div>
                  <div ref={qrCanvasRef} className="hidden" aria-hidden="true">
                    <QRCodeCanvas
                      value={verificationUrl}
                      size={512}
                      level="H"
                      includeMargin={true}
                      fgColor="#173B65"
                      bgColor="#FFFFFF"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-[#173B65] dark:text-slate-100">
                      {employee.fullName}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400 font-semibold">
                      NIP {employee.nip}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-center">
                  Pindai QR untuk membuka halaman verifikasi kartu pegawai resmi tanpa data pribadi sensitif.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadQR}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0072BC] text-white rounded-xl text-xs font-bold hover:bg-[#173B65] transition-colors"
                  >
                    <Download size={13} />
                    Unduh PNG
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#F4F8FB] dark:bg-slate-800 text-[#173B65] dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-[#EAF6FC] dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                  >
                    {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    {copied ? 'Tersalin' : 'Salin Link'}
                  </button>
                </div>

                {onPreviewVerify && (
                  <button
                    type="button"
                    onClick={() => onPreviewVerify(employee.id!)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 text-[#173B65] dark:text-slate-300 rounded-xl text-xs font-bold hover:border-[#0072BC] hover:text-[#0072BC] dark:hover:text-[#72C8F1] transition-colors"
                  >
                    <ExternalLink size={13} />
                    Pratinjau Halaman Verifikasi
                  </button>
                )}
              </div>
            </SectionCard>
          )}
        </div>

        {/* Right Detail Tabs & Content */}
        <div className="lg:col-span-2">
          <div className="corporate-card overflow-hidden">
            <div className="flex overflow-x-auto border-b border-slate-100 dark:border-slate-800 bg-[#F8FBFD] dark:bg-[#11223B]/60">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeSection === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSection(tab.id)}
                    className={cn(
                      'flex items-center gap-2 px-5 py-3.5 text-xs font-bold whitespace-nowrap transition-all border-b-2',
                      active
                        ? 'border-[#0072BC] dark:border-[#72C8F1] text-[#0072BC] dark:text-[#72C8F1] bg-white dark:bg-[#0E1A2E]'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-[#173B65] dark:hover:text-slate-200'
                    )}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              {activeSection === 'general' && (
                <>
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold text-[#0072BC] dark:text-[#72C8F1] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                      Informasi Kepegawaian &amp; Organisasi
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      <InfoItem label="Nama Lengkap" value={employee.fullName} />
                      <InfoItem label="NIP" value={employee.nip} />
                      <InfoItem label="Jabatan Lengkap" value={employee.jabatanLengkap} />
                      <InfoItem
                        label="Atasan Langsung"
                        value={
                          employee.atasanNama
                            ? employee.atasanJabatan
                              ? `${employee.atasanNama} (${employee.atasanJabatan})`
                              : employee.atasanNama
                            : 'Pimpinan Tertinggi / Belum Diatur'
                        }
                      />
                      <InfoItem label="Unit Pelaksana" value={employee.unitPelaksana} />
                      <InfoItem label="Bidang / Sub Unit" value={employee.bidang || employee.subUnit} />
                      <InfoItem label="Perusahaan" value={employee.perusahaan} />
                      <InfoItem label="Person Grade" value={employee.personGrade} />
                      <InfoItem label="Position Grade" value={employee.positionGrade} />
                      <InfoItem label="Status Pegawai" value={employee.status} />
                      <InfoItem
                        label="Status Penempatan"
                        value={
                          employee.placementStatus === 'Mutasi Keluar'
                            ? `Mutasi Keluar${employee.externalEntity ? ` (${employee.externalEntity})` : ''}`
                            : 'Aktif Bertugas'
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold text-[#0072BC] dark:text-[#72C8F1] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                      Administrasi Tanggal Penting
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      <InfoItem label="Tanggal Lahir" value={formatDate(employee.tanggalLahir)} />
                      <InfoItem label="Tanggal Masuk" value={formatDate(employee.tanggalMasuk)} />
                      <InfoItem label="Tanggal CP" value={formatDate(employee.tanggalCalonPegawai)} />
                      <InfoItem label="Tanggal Pengangkatan" value={formatDate(employee.tanggalPengangkatan)} />
                      <InfoItem label="Mulai Jabatan" value={formatDate(employee.tanggalMulaiJabatan)} />
                      <InfoItem
                        label="Masa Jabatan"
                        value={calculatePositionTenure(employee.tanggalMulaiJabatan) || employee.masaJabatan || '-'}
                      />
                      <InfoItem label="Tgl Pensiun Normal" value={formatDate(employee.tanggalPensiunNormal)} />
                      <InfoItem label="Tgl Berakhir" value={formatDate(employee.tanggalBerakhirBekerja)} />
                    </div>
                  </div>
                </>
              )}

              {activeSection === 'legal' && (
                <>
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold text-[#0072BC] dark:text-[#72C8F1] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                      Profil Personal &amp; Pendidikan
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      <InfoItem label="Pendidikan Terakhir" value={employee.pendidikanTerakhir} />
                      <InfoItem label="Jenis Kelamin" value={employee.jenisKelamin} />
                      <InfoItem label="Agama" value={employee.agama} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold text-[#0072BC] dark:text-[#72C8F1] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                      Identitas Legal &amp; Jaminan Sosial
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <InfoItem label="Nomor KTP (NIK)" value={employee.noKTP} />
                      <InfoItem label="Nomor NPWP" value={employee.noNPWP} />
                      <InfoItem label="BPJS Kesehatan" value={employee.noBPJSKesehatan} />
                      <InfoItem label="BPJS Ketenagakerjaan" value={employee.noBPJSKetenagakerjaan} />
                      <InfoItem label="Nomor KPS Pegawai" value={employee.noKPS} />
                    </div>
                  </div>
                </>
              )}

              {activeSection === 'family' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-[#0072BC] dark:text-[#72C8F1] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                    <Users size={14} /> Data Keluarga &amp; Jaminan Kesehatan ({employee.familyMembers?.length || 0})
                  </h4>
                  {employee.familyMembers && employee.familyMembers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {employee.familyMembers.map((member, idx) => (
                        <div
                          key={member.id || idx}
                          className="p-4 bg-[#F4F8FB] dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-extrabold text-[#173B65] dark:text-slate-100 truncate">
                                {member.nama}
                              </p>
                              <p className="text-[11px] font-bold text-[#0072BC] dark:text-[#72C8F1] mt-0.5">
                                {member.hubunganKeluarga} · {member.jenisKelamin}
                              </p>
                            </div>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-md text-[10px] font-extrabold shrink-0',
                                member.jaminanKesehatan === 'Dijamin'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              )}
                            >
                              {member.jaminanKesehatan}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 text-xs">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Tanggal Lahir</p>
                              <p className="font-semibold text-[#173B65] dark:text-slate-200 mt-0.5">
                                {formatDate(member.tanggalLahir)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Nomor KPS</p>
                              <p className="font-mono font-semibold text-[#173B65] dark:text-slate-200 mt-0.5 truncate">
                                {member.noKPS || '-'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-6 text-center">
                      Belum ada data anggota keluarga yang tercatat untuk pegawai ini.
                    </p>
                  )}
                </div>
              )}

              {activeSection === 'competency' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-[#0072BC] dark:text-[#72C8F1] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                      <BookOpen size={14} /> Riwayat Pelatihan ({employee.trainings?.length || 0})
                    </h4>
                    {employee.trainings && employee.trainings.length > 0 ? (
                      <div className="space-y-2.5">
                        {employee.trainings.map((t, i) => (
                          <div
                            key={i}
                            className="p-3.5 bg-[#F4F8FB] dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#173B65] dark:text-slate-100 truncate">
                                {t.namaPelatihan}
                              </p>
                              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                {formatDate(t.tanggalPelaksanaan)}
                              </p>
                            </div>
                            {t.certificateUrl && (
                              <StoredFileLink
                                url={t.certificateUrl}
                                fileName={t.namaPelatihan}
                                className="p-2 rounded-lg bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-[#0072BC] dark:text-[#72C8F1] hover:bg-[#0072BC] hover:text-white transition-colors shrink-0"
                                title="Lihat Dokumen Pelatihan"
                              >
                                <FileText size={14} />
                              </StoredFileLink>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-4">
                        Belum ada riwayat pelatihan tercatat.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-[#0072BC] dark:text-[#72C8F1] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                      <Award size={14} /> Sertifikasi ({employee.certifications?.length || 0})
                    </h4>
                    {employee.certifications && employee.certifications.length > 0 ? (
                      <div className="space-y-2.5">
                        {employee.certifications.map((c, i) => {
                          const { statusType, daysLeft } = evaluateCertificationStatus(c.masaBerlaku);
                          const isExpiringSoon = statusType === 'warning';
                          return (
                            <div
                              key={i}
                              className={
                                isExpiringSoon
                                  ? 'p-3.5 bg-red-50/70 dark:bg-red-950/30 rounded-xl border border-red-300 dark:border-red-800/80 border-l-4 border-l-red-500 flex items-center justify-between gap-3'
                                  : 'p-3.5 bg-[#F4F8FB] dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3'
                              }
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-xs font-bold text-[#173B65] dark:text-slate-100 truncate">
                                    {c.namaSertifikasi}
                                  </p>
                                  {isExpiringSoon && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-extrabold shrink-0">
                                      <BellRing size={10} />
                                      {daysLeft === 0 ? 'Berakhir Hari Ini' : `H-${daysLeft} ≤ 30 Hari`}
                                    </span>
                                  )}
                                </div>
                                <p
                                  className={
                                    isExpiringSoon
                                      ? 'text-[11px] text-red-600 dark:text-red-400 font-semibold mt-0.5'
                                      : 'text-[11px] text-slate-400 font-medium mt-0.5'
                                  }
                                >
                                  Terbit: {formatDate(c.tanggalPelaksanaan)} · Berlaku: {formatDate(c.masaBerlaku)}
                                </p>
                              </div>
                              {c.certificateUrl && (
                                <StoredFileLink
                                  url={c.certificateUrl}
                                  fileName={c.namaSertifikasi}
                                  className="p-2 rounded-lg bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-[#0072BC] dark:text-[#72C8F1] hover:bg-[#0072BC] hover:text-white transition-colors shrink-0"
                                  title="Lihat Sertifikat"
                                >
                                  <FileText size={14} />
                                </StoredFileLink>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-4">
                        Belum ada riwayat sertifikasi tercatat.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeSection === 'mutations' && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h4 className="text-xs font-extrabold text-[#0072BC] dark:text-[#72C8F1] uppercase tracking-wider flex items-center gap-2">
                        <ArrowLeftRight size={14} /> Jejak Pergerakan &amp; Riwayat Mutasi Pegawai
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5 font-mono">
                        Penelusuran permanen NIP {employee.nip} · Penempatan Saat Ini: {employee.unitPelaksana}
                      </p>
                    </div>
                    {isAdmin && employee.id && (
                      <button
                        type="button"
                        onClick={() => setIsMutationModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0072BC] text-white text-xs font-bold hover:bg-[#173B65] transition-colors shrink-0"
                      >
                        <Plus size={14} />
                        Ajukan Mutasi
                      </button>
                    )}
                  </div>

                  {employeeMutations.length > 0 ? (
                    <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                      {employeeMutations.map((mut) => {
                        const statusMeta =
                          MUTATION_STATUS_META[mut.status] ||
                          MUTATION_STATUS_META['Menunggu Persetujuan'];
                        const effYear = (mut.effectiveDate || '').slice(0, 4) || '-';
                        return (
                          <div key={mut.id} className="relative">
                            <span
                              className={cn(
                                'absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 border-white dark:border-[#0E1A2E] flex items-center justify-center shadow-xs',
                                mut.status === 'Diterapkan'
                                  ? 'bg-emerald-500 text-white'
                                  : mut.status === 'Ditolak'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-[#0072BC] text-white'
                              )}
                            >
                              <Clock size={10} />
                            </span>

                            <div className="p-4 rounded-2xl bg-[#F4F8FB] dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="text-xs font-extrabold text-[#173B65] dark:text-white">
                                    {effYear} – {mut.unitKerjaBaru} – {mut.jabatanBaru}
                                  </p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Efektif: <strong>{formatDate(mut.effectiveDate)}</strong> ·{' '}
                                    {inferMutationTypeBadge(mut.jenisMutasi, mut.arahMutasi)} ·{' '}
                                    {mut.kategoriMutasi}
                                  </p>
                                </div>
                                <span
                                  className={cn(
                                    'px-2 py-0.5 rounded-md text-[10px] font-extrabold shrink-0',
                                    statusMeta.badgeClass
                                  )}
                                >
                                  {statusMeta.label}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] bg-white dark:bg-[#0E1A2E] p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-bold uppercase text-slate-400">
                                    Sebelumnya
                                  </p>
                                  <p className="font-semibold text-slate-600 dark:text-slate-300">
                                    {mut.jabatanSebelumnya}
                                  </p>
                                  <p className="text-slate-400">
                                    {mut.unitKerjaSebelumnya} · {mut.bidangSebelumnya}
                                  </p>
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-bold uppercase text-[#0072BC] dark:text-[#72C8F1] flex items-center gap-1">
                                    <ArrowRight size={11} /> Penempatan Baru
                                  </p>
                                  <p className="font-bold text-[#173B65] dark:text-slate-100">
                                    {mut.jabatanBaru}
                                  </p>
                                  <p className="text-[#0072BC] dark:text-[#72C8F1] font-medium">
                                    {mut.unitKerjaBaru} · {mut.bidangBaru}
                                  </p>
                                  {mut.entitasEksternal && (
                                    <p className="text-amber-600 dark:text-amber-400 font-semibold">
                                      Entitas: {mut.entitasEksternal}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                                <div className="space-x-2">
                                  <span className="font-mono font-bold text-[#173B65] dark:text-slate-200">
                                    SK: {mut.nomorSk}
                                  </span>
                                  <span>· Tgl SK: {formatDate(mut.tanggalSk)}</span>
                                  <span>
                                    · Diproses: {mut.approvedByName || mut.createdByName}
                                  </span>
                                </div>
                                {mut.dokumenPendukung?.url && (
                                  <StoredFileLink
                                    url={mut.dokumenPendukung.url}
                                    fileName={mut.dokumenPendukung.name}
                                    className="inline-flex items-center gap-1 text-[#0072BC] dark:text-[#72C8F1] font-bold hover:underline"
                                  >
                                    <FileText size={12} />
                                    Dokumen SK
                                  </StoredFileLink>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-[#F4F8FB] dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center space-y-2">
                      <p className="text-xs font-bold text-[#173B65] dark:text-slate-200">
                        Belum ada riwayat perpindahan / mutasi tercatat untuk NIP {employee.nip}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Penempatan saat ini: {employee.unitPelaksana} · {employee.jabatanLengkap}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'documents' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h4 className="text-xs font-extrabold text-[#0072BC] dark:text-[#72C8F1] uppercase tracking-wider">
                      Dokumen Fisik Terpindai ({employee.scannedDocuments?.length || 0})
                    </h4>
                    {isAdmin && employee.id && (
                      <button
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        <ScanLine size={13} />
                        + Pindai Baru
                      </button>
                    )}
                  </div>

                  {employee.scannedDocuments && employee.scannedDocuments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {employee.scannedDocuments.map((docItem, idx) => (
                        <div
                          key={docItem.id || idx}
                          className="p-3.5 bg-[#F4F8FB] dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3.5 hover:border-[#0072BC]/40 transition-colors"
                        >
                          <StoredFileLink
                            url={docItem.fileUrl}
                            fileName={docItem.title}
                            className="w-14 h-14 rounded-xl bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center"
                          >
                            <StoredImage
                              src={docItem.fileUrl}
                              alt={docItem.title}
                              className="w-full h-full object-cover"
                              fallback={<FileText size={18} className="text-[#0072BC]" />}
                            />
                          </StoredFileLink>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <span className="inline-block px-2 py-0.5 rounded bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] text-[10px] font-bold">
                              {docItem.category}
                            </span>
                            <p className="text-xs font-bold text-[#173B65] dark:text-slate-100 truncate">
                              {docItem.title}
                            </p>
                            {docItem.notes && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {docItem.notes}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-400 font-medium">
                              Scan: {formatDate(docItem.scannedAt)}
                            </p>
                          </div>
                          <a
                            href={docItem.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-[#0072BC] dark:text-[#72C8F1] hover:bg-[#0072BC] hover:text-white transition-colors shrink-0"
                            title="Buka Hasil Scan"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-6 text-center">
                      Belum ada dokumen fisik yang dipindai melalui kamera.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isScannerOpen && (
        <DocumentScannerModal
          employee={employee}
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onSaveScan={handleSaveScan}
        />
      )}

      {isMutationModalOpen && (
        <MutationFormModal
          open={isMutationModalOpen}
          onClose={() => setIsMutationModalOpen(false)}
          employees={[employee]}
          defaultEmployee={employee}
          onSubmit={submitMutation}
          onSuccess={(msg) => {
            setScanToast(msg);
            setTimeout(() => setScanToast(null), 5000);
          }}
        />
      )}
    </div>
  );
};

export default EmployeeDetail;
