import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  Gauge,
  Loader2,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVehicleManagement } from '../../hooks/useVehicleManagement';
import { fetchEmployeeDirectory } from '../../lib/employeeDirectory';
import {
  SIMAP_WHATSAPP_DISPLAY,
  SIMAP_WHATSAPP_NUMBER_LOCAL,
  buildVehicleLoanWhatsAppMessage,
  formatWhatsAppPhone,
  isValidIndonesianWhatsApp,
  toWaMeLink,
} from '../../data/whatsappConstants';
import { WHATSAPP_STATUS_META } from '../../data/letterConstants';
import {
  DriverStatus,
  Employee,
  VehicleDriver,
  VehicleLoanRequest,
  VehicleLoanStatus,
  VehicleStatus,
  VehicleType,
  VehicleUnit,
} from '../../types';
import {
  ConfirmDialog,
  EmptyState,
  MetricCard,
  PageHeader,
  TableSkeleton,
} from '../common/DashboardUI';
import VehicleLoanFormModal from './VehicleLoanFormModal';
import PerintahJalanModal from './PerintahJalanModal';
import VehicleTrackingMap from './VehicleTrackingMap';
import { cn } from '../../lib/utils';

type SubTabKey = 'loans' | 'perintah-jalan' | 'tracking' | 'master';

interface VehicleLoanManagementProps {
  employees: Employee[];
  canManage: boolean;
  defaultEmployee?: Employee | null;
  compactHeader?: boolean;
  initialSubTab?: SubTabKey;
}

const LOAN_STATUS_STYLE: Record<VehicleLoanStatus, string> = {
  'Menunggu Persetujuan':
    'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
  Disetujui:
    'bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1] border-[#72C8F1]/40',
  'Perintah Jalan Terbit':
    'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
  'Sedang Berpergian':
    'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
  Selesai:
    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  Ditolak:
    'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 border-red-200 dark:border-red-800/60',
};

const VEHICLE_TYPES: VehicleType[] = [
  'MPV',
  'SUV',
  'Double Cabin',
  'Sedan',
  'Bus / Minibus',
  'Pick Up / Operasional',
];

const VehicleLoanManagement: React.FC<VehicleLoanManagementProps> = ({
  employees,
  canManage,
  defaultEmployee = null,
  compactHeader = false,
  initialSubTab = 'loans',
}) => {
  const { user } = useAuth();
  const {
    vehicles,
    drivers,
    loans,
    loading,
    vehicleStats,
    gatewayStatus,
    saveVehicle,
    deleteVehicle,
    saveDriver,
    deleteDriver,
    saveVehicleLoan,
    approveOrRejectLoan,
    savePerintahJalan,
    sendVehicleLoanWhatsApp,
    deleteVehicleLoan,
    pushLiveTracking,
    stopLiveTracking,
  } = useVehicleManagement(true);

  const [subTab, setSubTab] = useState<SubTabKey>(initialSubTab);
  const [directoryEmployees, setDirectoryEmployees] = useState<Employee[]>(employees);

  useEffect(() => {
    setDirectoryEmployees(employees);
    if (defaultEmployee && employees.length <= 1) {
      fetchEmployeeDirectory().then((dirList) => {
        if (dirList.length > 0) {
          setDirectoryEmployees(dirList);
        }
      });
    }
  }, [employees, defaultEmployee?.id]);

  // Loan filters & modals
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | VehicleLoanStatus>('ALL');
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<VehicleLoanRequest | null>(null);
  const [perintahJalanLoan, setPerintahJalanLoan] = useState<VehicleLoanRequest | null>(null);

  // WhatsApp notification modal & helpers
  const [waModalLoan, setWaModalLoan] = useState<VehicleLoanRequest | null>(null);
  const [waPhoneInput, setWaPhoneInput] = useState('+62');
  const [sendingWaId, setSendingWaId] = useState<string | null>(null);
  const [copiedWaId, setCopiedWaId] = useState<string | null>(null);

  // Approve / Reject dialog
  const [decisionLoan, setDecisionLoan] = useState<{
    loan: VehicleLoanRequest;
    approve: boolean;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'loan'; item: VehicleLoanRequest }
    | { type: 'vehicle'; item: VehicleUnit }
    | { type: 'driver'; item: VehicleDriver }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  // Master Vehicle modal
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleUnit | null>(null);
  const [vNoPol, setVNoPol] = useState('');
  const [vNama, setVNama] = useState('');
  const [vJenis, setVJenis] = useState<string>('MPV');
  const [vKapasitas, setVKapasitas] = useState<number>(6);
  const [vUnitKerja, setVUnitKerja] = useState('UP Kapuas');
  const [vTahun, setVTahun] = useState('');
  const [vKmTerakhir, setVKmTerakhir] = useState<number>(0);
  const [vStatus, setVStatus] = useState<VehicleStatus>('Tersedia');
  const [savingMaster, setSavingMaster] = useState(false);

  // Master Driver modal
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<VehicleDriver | null>(null);
  const [dNama, setDNama] = useState('');
  const [dNoHp, setDNoHp] = useState('');
  const [dNoSim, setDNoSim] = useState('');
  const [dEmployeeId, setDEmployeeId] = useState<string>('');
  const [dUnitKerja, setDUnitKerja] = useState('UP Kapuas');
  const [dStatus, setDStatus] = useState<DriverStatus>('Aktif');

  const [banner, setBanner] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    waTarget?: { phone: string; message: string; key: string };
  } | null>(null);

  const resolveLoanPhone = (loan: VehicleLoanRequest): string => {
    if (loan.nomorWhatsapp && isValidIndonesianWhatsApp(loan.nomorWhatsapp)) {
      return formatWhatsAppPhone(loan.nomorWhatsapp);
    }
    const matched = directoryEmployees.find(
      (e) =>
        (loan.pemohonEmployeeId && e.id === loan.pemohonEmployeeId) ||
        (loan.pemohonNip && e.nip === loan.pemohonNip)
    );
    if (matched?.noTelepon && isValidIndonesianWhatsApp(matched.noTelepon)) {
      return formatWhatsAppPhone(matched.noTelepon);
    }
    return '';
  };

  const activeWaModalLoan = useMemo(() => {
    if (!waModalLoan?.id) return waModalLoan;
    return loans.find((l) => l.id === waModalLoan.id) || waModalLoan;
  }, [waModalLoan, loans]);

  const handleOpenWaModal = (loan: VehicleLoanRequest) => {
    setWaPhoneInput(resolveLoanPhone(loan) || '+62');
    setWaModalLoan(loan);
  };

  const handleCopyLoanWa = async (key: string, message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedWaId(key);
      setTimeout(() => setCopiedWaId(null), 2500);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleSendLoanWa = async (loan: VehicleLoanRequest, overridePhone?: string) => {
    const rawTarget = (overridePhone ?? resolveLoanPhone(loan)).trim();
    const formatted = formatWhatsAppPhone(rawTarget);
    if (!isValidIndonesianWhatsApp(formatted)) {
      setBanner({
        type: 'error',
        message: 'Nomor WhatsApp peminjam belum valid. Gunakan format +628xxxxxxxxxx.',
      });
      return;
    }
    const key = loan.id || loan.loanNumber;
    setSendingWaId(key);
    try {
      const waResult = await sendVehicleLoanWhatsApp(loan, formatted);
      const waMessage = buildVehicleLoanWhatsAppMessage(loan);
      if (waResult.sent) {
        setBanner({
          type: 'success',
          message: `Notifikasi WhatsApp ${loan.loanNumber} berhasil dikirim dari SIMAP (${SIMAP_WHATSAPP_NUMBER_LOCAL}) ke ${formatted}.`,
        });
      } else {
        setBanner({
          type: 'warning',
          message: `Pengiriman otomatis WA untuk ${loan.loanNumber} gagal (${waResult.error || 'Gateway belum aktif'}). Gunakan tombol WhatsApp Web di samping.`,
          waTarget: { phone: formatted, message: waMessage, key },
        });
      }
    } finally {
      setSendingWaId(null);
    }
  };

  const filteredLoans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return loans.filter((l) => {
      const matchStatus = statusFilter === 'ALL' || l.status === statusFilter;
      const matchQuery =
        !q ||
        l.loanNumber.toLowerCase().includes(q) ||
        l.nama.toLowerCase().includes(q) ||
        l.pemohonNama.toLowerCase().includes(q) ||
        l.tujuan.toLowerCase().includes(q) ||
        l.bidang.toLowerCase().includes(q) ||
        (l.perintahJalan?.kendaraanNoPol || '').toLowerCase().includes(q) ||
        (l.perintahJalan?.driverNama || '').toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [loans, searchQuery, statusFilter]);

  const openVehicleForm = (unit?: VehicleUnit) => {
    if (unit) {
      setEditingVehicle(unit);
      setVNoPol(unit.noPol);
      setVNama(unit.namaKendaraan);
      setVJenis(unit.jenisKendaraan || 'MPV');
      setVKapasitas(unit.kapasitasPenumpang || 4);
      setVUnitKerja(unit.unitKerja || 'UP Kapuas');
      setVTahun(unit.tahun || '');
      setVKmTerakhir(unit.kmTerakhir || 0);
      setVStatus(unit.status || 'Tersedia');
    } else {
      setEditingVehicle(null);
      setVNoPol('');
      setVNama('');
      setVJenis('MPV');
      setVKapasitas(6);
      setVUnitKerja('UP Kapuas');
      setVTahun('');
      setVKmTerakhir(0);
      setVStatus('Tersedia');
    }
    setVehicleModalOpen(true);
  };

  const openDriverForm = (drv?: VehicleDriver) => {
    if (drv) {
      setEditingDriver(drv);
      setDNama(drv.namaDriver);
      setDNoHp(drv.noHp);
      setDNoSim(drv.noSim);
      setDEmployeeId(drv.employeeId || '');
      setDUnitKerja(drv.unitKerja || 'UP Kapuas');
      setDStatus(drv.status || 'Aktif');
    } else {
      setEditingDriver(null);
      setDNama('');
      setDNoHp('');
      setDNoSim('');
      setDEmployeeId('');
      setDUnitKerja('UP Kapuas');
      setDStatus('Aktif');
    }
    setDriverModalOpen(true);
  };

  const handleSaveVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vNoPol.trim() || !vNama.trim()) return;
    setSavingMaster(true);
    try {
      await saveVehicle(
        {
          noPol: vNoPol,
          namaKendaraan: vNama,
          jenisKendaraan: vJenis,
          kapasitasPenumpang: vKapasitas,
          unitKerja: vUnitKerja,
          tahun: vTahun || null,
          kmTerakhir: vKmTerakhir,
          status: vStatus,
        },
        editingVehicle?.id
      );
      setVehicleModalOpen(false);
      setBanner({
        type: 'success',
        message: `Data kendaraan ${vNoPol.toUpperCase()} berhasil disimpan.`,
      });
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: formatVehicleActionError(err, 'Gagal menyimpan data kendaraan dinas.'),
      });
    } finally {
      setSavingMaster(false);
    }
  };

  const formatVehicleActionError = (err: unknown, fallback: string): string => {
    const rawMsg = err instanceof Error ? err.message : String(err || '');
    if (!rawMsg) return fallback;
    try {
      const parsed = JSON.parse(rawMsg);
      if (parsed && typeof parsed === 'object' && parsed.error) {
        const emailInfo = parsed.authInfo?.email ? ` (Akun: ${parsed.authInfo.email})` : '';
        if (String(parsed.error).toLowerCase().includes('permission')) {
          return `Akses ditolak oleh aturan keamanan Firestore${emailInfo}. Pastikan Anda masuk sebagai Admin / Super Admin yang aktif lalu coba kembali.`;
        }
        return `${parsed.error}${emailInfo}`;
      }
    } catch {
      // Fallback to raw message
    }
    return rawMsg;
  };

  const handleSaveDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dNama.trim()) return;
    setSavingMaster(true);
    try {
      await saveDriver(
        {
          namaDriver: dNama,
          noHp: dNoHp,
          noSim: dNoSim,
          employeeId: dEmployeeId || null,
          unitKerja: dUnitKerja,
          status: dStatus,
        },
        editingDriver?.id
      );
      setDriverModalOpen(false);
      setBanner({
        type: 'success',
        message: `Data pengemudi ${dNama} berhasil disimpan.`,
      });
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: formatVehicleActionError(err, 'Gagal menyimpan data pengemudi.'),
      });
    } finally {
      setSavingMaster(false);
    }
  };

  const handleConfirmDecision = async () => {
    if (!decisionLoan) return;
    setDecisionSubmitting(true);
    const fallbackPhone = resolveLoanPhone(decisionLoan.loan) || undefined;
    try {
      const waResult = await approveOrRejectLoan(
        decisionLoan.loan,
        decisionLoan.approve,
        rejectReason,
        fallbackPhone
      );
      const nextStatus: VehicleLoanStatus = decisionLoan.approve ? 'Disetujui' : 'Ditolak';
      const updatedMsg = buildVehicleLoanWhatsAppMessage({
        ...decisionLoan.loan,
        status: nextStatus,
        rejectionReason: decisionLoan.approve ? null : rejectReason || 'Pengajuan ditolak oleh admin.',
      });

      if (waResult?.sent && fallbackPhone) {
        setBanner({
          type: 'success',
          message: `${
            decisionLoan.approve
              ? `Pengajuan ${decisionLoan.loan.loanNumber} disetujui`
              : `Pengajuan ${decisionLoan.loan.loanNumber} ditolak`
          } & notifikasi WhatsApp SIMAP (${SIMAP_WHATSAPP_NUMBER_LOCAL}) terkirim ke ${fallbackPhone}.`,
        });
      } else if (fallbackPhone) {
        setBanner({
          type: 'warning',
          message: `${
            decisionLoan.approve
              ? `Pengajuan ${decisionLoan.loan.loanNumber} disetujui.`
              : `Pengajuan ${decisionLoan.loan.loanNumber} ditolak.`
          } Notifikasi WA otomatis tertunda (${waResult?.error || 'gunakan WhatsApp Web'}).`,
          waTarget: {
            phone: fallbackPhone,
            message: updatedMsg,
            key: decisionLoan.loan.id || decisionLoan.loan.loanNumber,
          },
        });
      } else {
        setBanner({
          type: 'success',
          message: decisionLoan.approve
            ? `Pengajuan ${decisionLoan.loan.loanNumber} disetujui.`
            : `Pengajuan ${decisionLoan.loan.loanNumber} ditolak.`,
        });
      }
      setDecisionLoan(null);
      setRejectReason('');
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: formatVehicleActionError(
          err,
          'Gagal memproses persetujuan pengajuan kendaraan.'
        ),
      });
      setDecisionLoan(null);
    } finally {
      setDecisionSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'loan') {
        await deleteVehicleLoan(deleteTarget.item);
      } else if (deleteTarget.type === 'vehicle') {
        await deleteVehicle(deleteTarget.item);
      } else {
        await deleteDriver(deleteTarget.item);
      }
      setDeleteTarget(null);
      setBanner({ type: 'success', message: 'Data berhasil dihapus.' });
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: formatVehicleActionError(err, 'Gagal menghapus data.'),
      });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title={
          compactHeader
            ? 'Peminjaman & Tracking Kendaraan Dinas'
            : 'Peminjaman Kendaraan Dinas, Perintah Jalan & Live Tracking'
        }
        subtitle="Pengajuan kendaraan dinas terintegrasi pegawai, penerbitan Perintah Jalan oleh PIC, master armada & driver, serta pemantauan GPS"
        icon={Car}
        badge={`${vehicleStats.activeTrips} Sedang Bepergian`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSubTab('tracking')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-[#0072BC] dark:text-[#72C8F1] text-xs font-bold hover:border-[#0072BC] transition-colors"
            >
              <Navigation size={14} />
              Live Tracking
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingLoan(null);
                setLoanModalOpen(true);
              }}
              className="relative overflow-hidden inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0072BC] to-[#173B65] text-white rounded-xl text-xs font-bold hover:brightness-110 transition-all shadow-sm"
            >
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-[#F9D423]" />
              <Plus size={15} className="text-[#F9D423]" />
              Ajukan Peminjaman
            </button>
          </div>
        }
      />

      {/* Official SIMAP WhatsApp Sender Strip */}
      <div
        className={cn(
          'rounded-2xl px-4 py-3 border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs',
          gatewayStatus.configured
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300'
            : 'bg-[#EAF6FC]/70 dark:bg-[#0072BC]/15 border-[#72C8F1]/40 dark:border-[#0072BC]/40 text-[#173B65] dark:text-slate-200'
        )}
      >
        <div className="flex items-center gap-2.5">
          <MessageSquare size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            <strong>Nomor WhatsApp Resmi SIMAP ({SIMAP_WHATSAPP_DISPLAY}):</strong>{' '}
            {gatewayStatus.configured
              ? `Gateway ${gatewayStatus.provider?.toUpperCase()} aktif — notifikasi pengajuan, approval, dan Perintah Jalan dikirim otomatis ke Pengaju Peminjam Kendaraan.`
              : 'Notifikasi peminjam kendaraan siap dikirim otomatis via server atau melalui tombol Kirim WA / WhatsApp Web pada setiap pengajuan.'}
          </span>
        </div>
        <span className="shrink-0 font-bold text-[11px] uppercase tracking-wider text-[#0072BC] dark:text-[#72C8F1]">
          {gatewayStatus.configured ? 'Gateway Terhubung' : `Pengirim: ${SIMAP_WHATSAPP_NUMBER_LOCAL}`}
        </span>
      </div>

      {banner && (
        <div
          className={cn(
            'p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold',
            banner.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
              : banner.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300'
              : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300'
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {banner.type === 'success' ? (
              <CheckCircle2 size={15} className="shrink-0" />
            ) : (
              <AlertCircle size={15} className="shrink-0" />
            )}
            <span className="min-w-0 break-words">{banner.message}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {banner.waTarget && (
              <>
                <a
                  href={toWaMeLink(banner.waTarget.phone, banner.waTarget.message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700"
                >
                  <ExternalLink size={12} />
                  Kirim via WhatsApp Web
                </a>
                <button
                  type="button"
                  onClick={() => handleCopyLoanWa(banner.waTarget!.key, banner.waTarget!.message)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#173B65] dark:text-slate-100 text-[11px] font-bold"
                >
                  {copiedWaId === banner.waTarget.key ? (
                    <>
                      <Check size={12} className="text-emerald-600" />
                      Disalin
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      Salin Pesan
                    </>
                  )}
                </button>
              </>
            )}
            <button type="button" onClick={() => setBanner(null)} className="p-1 rounded-lg shrink-0">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Pengajuan"
          value={loans.length}
          subtitle="Riwayat peminjaman dinas"
          icon={FileText}
          accent="blue"
          onClick={() => setSubTab('loans')}
        />
        <MetricCard
          title="Menunggu Approval"
          value={vehicleStats.pendingLoans}
          subtitle="Perlu persetujuan admin"
          icon={Clock}
          accent={vehicleStats.pendingLoans > 0 ? 'amber' : 'cyan'}
        />
        <MetricCard
          title="Sedang Bepergian"
          value={vehicleStats.activeTrips}
          subtitle="Terpantau GPS SIMAP"
          icon={Navigation}
          accent="emerald"
          onClick={() => setSubTab('tracking')}
        />
        <MetricCard
          title="Armada & Driver"
          value={`${vehicleStats.availableVehicles}/${vehicleStats.totalVehicles}`}
          subtitle={`${vehicleStats.activeDrivers} pengemudi aktif`}
          icon={Car}
          accent="navy"
          onClick={() => setSubTab('master')}
        />
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'loans' as SubTabKey, label: `Pengajuan Peminjaman (${loans.length})`, icon: Car },
          {
            id: 'perintah-jalan' as SubTabKey,
            label: 'Perintah Jalan (PIC)',
            icon: ClipboardCheck,
          },
          {
            id: 'tracking' as SubTabKey,
            label: `Tracking Kendaraan (${vehicleStats.activeTrips} Live)`,
            icon: MapPin,
          },
          {
            id: 'master' as SubTabKey,
            label: `Data Kendaraan (${vehicles.length}) & Driver (${drivers.length})`,
            icon: Users,
          },
        ].map((tab) => {
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
                active
                  ? 'bg-[#0072BC] text-white shadow-xs'
                  : 'bg-white dark:bg-[#0E1A2E] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-[#0072BC]'
              )}
            >
              <tab.icon size={14} className={active ? 'text-[#F9D423]' : 'text-[#0072BC]'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PENGAJUAN PEMINJAMAN KENDARAAN DINAS */}
      {subTab === 'loans' && (
        <div className="corporate-card overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-[#F8FBFD] dark:bg-[#11223B]/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor, pemohon, tujuan, bidang, no pol, driver..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-xs font-medium text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#173B65] dark:text-slate-200 outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="Menunggu Persetujuan">Menunggu Persetujuan</option>
              <option value="Disetujui">Disetujui</option>
              <option value="Perintah Jalan Terbit">Perintah Jalan Terbit</option>
              <option value="Sedang Berpergian">Sedang Berpergian</option>
              <option value="Selesai">Selesai</option>
              <option value="Ditolak">Ditolak</option>
            </select>
          </div>

          {loading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : filteredLoans.length === 0 ? (
            <EmptyState
              icon={Car}
              title="Belum Ada Pengajuan Kendaraan Dinas"
              description="Ajukan peminjaman kendaraan dinas untuk perjalanan operasional atau koordinasi antar unit."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setEditingLoan(null);
                    setLoanModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0072BC] text-white text-xs font-bold"
                >
                  <Plus size={14} /> Ajukan Peminjaman
                </button>
              }
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLoans.map((loan) => {
                const isOwner = loan.createdByUid === user?.uid;
                const canEdit =
                  (canManage && loan.status !== 'Selesai') ||
                  (isOwner &&
                    (loan.status === 'Menunggu Persetujuan' || loan.status === 'Ditolak'));
                const canDelete =
                  canManage || (isOwner && loan.status === 'Menunggu Persetujuan');

                return (
                  <div
                    key={loan.id}
                    className="p-5 hover:bg-[#F8FBFD] dark:hover:bg-[#0B172A]/60 transition-colors space-y-3"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-[#0072BC] dark:text-[#72C8F1]">
                            {loan.loanNumber}
                          </span>
                          <span
                            className={cn(
                              'px-2.5 py-0.5 rounded-md border text-[11px] font-bold',
                              LOAN_STATUS_STYLE[loan.status]
                            )}
                          >
                            {loan.status}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold">
                            {loan.bidang}
                          </span>
                          {loan.whatsappStatus && (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold',
                                (WHATSAPP_STATUS_META[loan.whatsappStatus] ||
                                  WHATSAPP_STATUS_META['Menunggu Pengiriman']).badgeClass
                              )}
                            >
                              <MessageSquare size={10} />
                              WA: {loan.whatsappStatus}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-extrabold text-[#173B65] dark:text-white">
                          {loan.tujuan} — <span className="font-semibold">{loan.keperluan}</span>
                        </h4>

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1.5">
                            <User size={13} className="text-[#0072BC]" />
                            Nama: <strong>{loan.nama}</strong> · Pemohon:{' '}
                            <strong>{loan.pemohonNama}</strong>
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Users size={13} className="text-[#0072BC]" />
                            {loan.jumlahPenumpang} Penumpang
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar size={13} className="text-[#0072BC]" />
                            {loan.tanggalDipergunakan} ({loan.jamMulai} – {loan.jamSelesai} ·{' '}
                            {loan.durasiJam})
                          </span>
                          {resolveLoanPhone(loan) && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                              <Phone size={12} />
                              {resolveLoanPhone(loan)}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>
                            Atasan Langsung: <strong>{loan.atasanLangsungNama}</strong>
                          </span>
                          <span>
                            Menyetujui Asman Business Support:{' '}
                            <strong>{loan.asmanBisnisSupportNama}</strong>
                          </span>
                        </div>

                        {loan.perintahJalan && (
                          <div className="mt-2 p-3 rounded-xl bg-[#EAF6FC]/70 dark:bg-[#0072BC]/15 border border-[#72C8F1]/30 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#173B65] dark:text-slate-200">
                            <span className="font-extrabold text-[#0072BC] dark:text-[#72C8F1]">
                              PERINTAH JALAN:
                            </span>
                            <span>
                              Unit: <strong>{loan.perintahJalan.kendaraanNoPol}</strong> (
                              {loan.perintahJalan.kendaraanNama})
                            </span>
                            <span>
                              Driver: <strong>{loan.perintahJalan.driverNama}</strong>
                            </span>
                            <span>
                              Jam: {loan.perintahJalan.berangkatJam} –{' '}
                              {loan.perintahJalan.kembaliJam || '-'} (
                              {loan.perintahJalan.lamaDipergunakan})
                            </span>
                            <span>
                              KM: {loan.perintahJalan.standKmAwal} →{' '}
                              {loan.perintahJalan.standKmAkhir} (
                              <strong>{loan.perintahJalan.jarakTempuh} km</strong>)
                            </span>
                          </div>
                        )}

                        {loan.status === 'Ditolak' && loan.rejectionReason && (
                          <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                            Alasan Penolakan: {loan.rejectionReason}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {canManage && loan.status === 'Menunggu Persetujuan' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setDecisionLoan({ loan, approve: true })}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                            >
                              <CheckCircle2 size={13} />
                              Setujui
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectReason('');
                                setDecisionLoan({ loan, approve: false });
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800/60 text-xs font-bold hover:bg-red-100"
                            >
                              <XCircle size={13} />
                              Tolak
                            </button>
                          </>
                        )}

                        {canManage && loan.status !== 'Ditolak' && (
                          <button
                            type="button"
                            onClick={() => setPerintahJalanLoan(loan)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0072BC] text-white text-xs font-bold hover:bg-[#173B65]"
                          >
                            <ClipboardCheck size={13} />
                            {loan.perintahJalan ? 'Edit Perintah Jalan' : 'Isi Perintah Jalan'}
                          </button>
                        )}

                        {['Disetujui', 'Perintah Jalan Terbit', 'Sedang Berpergian', 'Selesai'].includes(
                          loan.status
                        ) && (
                          <button
                            type="button"
                            onClick={() => setSubTab('tracking')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold hover:bg-emerald-100"
                          >
                            <MapPin size={13} />
                            Tracking GPS
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenWaModal(loan)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold hover:bg-emerald-100"
                          title={`Kirim Notifikasi WhatsApp dari SIMAP (${SIMAP_WHATSAPP_NUMBER_LOCAL})`}
                        >
                          <MessageSquare size={13} />
                          Kirim WA
                        </button>

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLoan(loan);
                              setLoanModalOpen(true);
                            }}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#0072BC]"
                            title="Edit Pengajuan"
                          >
                            <Edit3 size={14} />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ type: 'loan', item: loan })}
                            className="p-2 rounded-xl border border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                            title="Hapus Pengajuan"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PERINTAH JALAN (PIC ADMINISTRASI KENDARAAN) */}
      {subTab === 'perintah-jalan' && (
        <div className="corporate-card overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-[#F8FBFD] dark:bg-[#11223B]/50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-[#173B65] dark:text-white">
                Daftar Perintah Jalan (PIC Administrasi Kendaraan)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Catat tanggal, pengemudi/driver, jam berangkat &amp; kembali, kendaraan/No Pol,
                Stand KM Awal/Akhir, serta jarak tempuh otomatis.
              </p>
            </div>
          </div>

          {loans.filter((l) => l.status !== 'Ditolak').length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Belum Ada Perintah Jalan"
              description="Perintah Jalan dapat diisi oleh PIC Administrasi Kendaraan setelah pengajuan peminjaman kendaraan dibuat."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F4F8FB] dark:bg-[#0B172A] border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4">No / Tanggal</th>
                    <th className="py-3.5 px-4">Kendaraan / No Pol</th>
                    <th className="py-3.5 px-4">Pengemudi / Driver</th>
                    <th className="py-3.5 px-4">Berangkat – Kembali</th>
                    <th className="py-3.5 px-4">Keperluan</th>
                    <th className="py-3.5 px-4">Stand KM &amp; Jarak</th>
                    <th className="py-3.5 px-4">Status</th>
                    {canManage && <th className="py-3.5 px-4 text-right">Aksi PIC</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {loans
                    .filter((l) => l.status !== 'Ditolak')
                    .map((loan) => {
                      const pj = loan.perintahJalan;
                      return (
                        <tr
                          key={loan.id}
                          className="hover:bg-[#F8FBFD] dark:hover:bg-[#0B172A]/60 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <p className="font-mono font-extrabold text-[#0072BC] dark:text-[#72C8F1]">
                              {loan.loanNumber}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {pj?.tanggal || loan.tanggalDipergunakan}
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            {pj ? (
                              <div>
                                <p className="font-extrabold text-[#173B65] dark:text-white">
                                  {pj.kendaraanNoPol}
                                </p>
                                <p className="text-[11px] text-slate-500">{pj.kendaraanNama}</p>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Belum ditetapkan</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-[#173B65] dark:text-slate-100">
                              {pj?.driverNama || '-'}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Pemohon: {loan.pemohonNama}
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            {pj ? (
                              <div>
                                <p className="font-bold text-[#173B65] dark:text-slate-100 tabular-nums">
                                  {pj.berangkatJam} – {pj.kembaliJam || '...'}
                                </p>
                                <p className="text-[11px] text-[#0072BC] dark:text-[#72C8F1] font-semibold">
                                  {pj.lamaDipergunakan}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 max-w-[220px]">
                            <p className="truncate font-semibold text-[#173B65] dark:text-slate-200">
                              {pj?.keperluan || loan.keperluan}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              Tujuan: {loan.tujuan}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 tabular-nums">
                            {pj ? (
                              <div>
                                <p className="text-[11px] text-slate-500">
                                  {pj.standKmAwal.toLocaleString('id-ID')} →{' '}
                                  {pj.standKmAkhir.toLocaleString('id-ID')} km
                                </p>
                                <p className="font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                  <Gauge size={12} /> {pj.jarakTempuh.toLocaleString('id-ID')} km
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-md border text-[10px] font-bold whitespace-nowrap',
                                LOAN_STATUS_STYLE[loan.status]
                              )}
                            >
                              {loan.status}
                            </span>
                          </td>
                          {canManage && (
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setPerintahJalanLoan(loan)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0072BC] text-white text-xs font-bold hover:bg-[#173B65]"
                              >
                                <ClipboardCheck size={13} />
                                {pj ? 'Edit / PDF' : 'Isi Perintah Jalan'}
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LIVE GPS TRACKING KENDARAAN DINAS */}
      {subTab === 'tracking' && (
        <VehicleTrackingMap
          loans={loans}
          currentUserUid={user?.uid}
          canManage={canManage}
          onPushTracking={pushLiveTracking}
          onStopTracking={stopLiveTracking}
        />
      )}

      {/* TAB 4: MASTER DATA KENDARAAN & DRIVER */}
      {subTab === 'master' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Master Vehicles */}
          <div className="corporate-card overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-[#F8FBFD] dark:bg-[#11223B]/50 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#173B65] dark:text-white flex items-center gap-2">
                  <Car size={16} className="text-[#0072BC]" />
                  Data Kendaraan Dinas ({vehicles.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Digunakan untuk pilihan Kendaraan / No Pol pada Perintah Jalan
                </p>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => openVehicleForm()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0072BC] text-white text-xs font-bold hover:bg-[#173B65]"
                >
                  <Plus size={14} /> Tambah Kendaraan
                </button>
              )}
            </div>

            {vehicles.length === 0 ? (
              <EmptyState
                icon={Car}
                title="Belum Ada Data Kendaraan"
                description="Tambahkan daftar kendaraan dinas beserta Nomor Polisi dan Stand KM terakhir."
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {vehicles.map((v) => (
                  <div
                    key={v.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-[#F8FBFD] dark:hover:bg-[#0B172A]/60"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-[#0072BC] dark:text-[#72C8F1]">
                          {v.noPol}
                        </span>
                        <span className="text-xs font-bold text-[#173B65] dark:text-white truncate">
                          {v.namaKendaraan}
                        </span>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold',
                            v.status === 'Tersedia'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : v.status === 'Sedang Dipinjam'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300'
                          )}
                        >
                          {v.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {v.jenisKendaraan} · Kap. {v.kapasitasPenumpang} org · {v.unitKerja} · KM:{' '}
                        <strong className="tabular-nums">
                          {Number(v.kmTerakhir || 0).toLocaleString('id-ID')}
                        </strong>
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openVehicleForm(v)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#0072BC]"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ type: 'vehicle', item: v })}
                          className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Master Drivers */}
          <div className="corporate-card overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-[#F8FBFD] dark:bg-[#11223B]/50 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#173B65] dark:text-white flex items-center gap-2">
                  <UserCheck size={16} className="text-[#0072BC]" />
                  Data Pengemudi / Driver ({drivers.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Digunakan untuk penugasan Pengemudi pada Perintah Jalan
                </p>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => openDriverForm()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0072BC] text-white text-xs font-bold hover:bg-[#173B65]"
                >
                  <Plus size={14} /> Tambah Driver
                </button>
              )}
            </div>

            {drivers.length === 0 ? (
              <EmptyState
                icon={UserCheck}
                title="Belum Ada Data Pengemudi"
                description="Tambahkan daftar pengemudi/driver operasional unit kerja."
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {drivers.map((d) => (
                  <div
                    key={d.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-[#F8FBFD] dark:hover:bg-[#0B172A]/60"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-[#173B65] dark:text-white truncate">
                          {d.namaDriver}
                        </span>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold',
                            d.status === 'Aktif'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          )}
                        >
                          {d.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        HP: {d.noHp || '-'} · SIM: {d.noSim || '-'} · {d.unitKerja}
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openDriverForm(d)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#0072BC]"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ type: 'driver', item: d })}
                          className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loan Form Modal */}
      <VehicleLoanFormModal
        open={loanModalOpen}
        onClose={() => {
          setLoanModalOpen(false);
          setEditingLoan(null);
        }}
        onSave={async (input) => {
          const id = await saveVehicleLoan(input);
          setBanner({
            type: 'success',
            message: editingLoan
              ? 'Pengajuan peminjaman kendaraan berhasil diperbarui.'
              : 'Pengajuan peminjaman kendaraan dinas berhasil dikirim.',
          });
          return id;
        }}
        employees={directoryEmployees}
        defaultEmployee={defaultEmployee}
        initialLoan={editingLoan}
      />

      {/* Perintah Jalan Modal */}
      <PerintahJalanModal
        open={!!perintahJalanLoan}
        onClose={() => setPerintahJalanLoan(null)}
        loan={perintahJalanLoan}
        vehicles={vehicles}
        drivers={drivers}
        onSave={async (loan, input) => {
          const fallbackPhone = resolveLoanPhone(loan);
          const loanWithPhone =
            loan.nomorWhatsapp || !fallbackPhone
              ? loan
              : { ...loan, nomorWhatsapp: fallbackPhone };
          const waResult = await savePerintahJalan(loanWithPhone, input);
          if (waResult?.sent && fallbackPhone) {
            setBanner({
              type: 'success',
              message: `Perintah Jalan untuk ${loan.loanNumber} tersimpan & notifikasi WA SIMAP (${SIMAP_WHATSAPP_NUMBER_LOCAL}) terkirim ke ${fallbackPhone}.`,
            });
          } else if (fallbackPhone) {
            const msgText = buildVehicleLoanWhatsAppMessage({
              ...loan,
              status: input.targetStatus || 'Perintah Jalan Terbit',
              perintahJalan: {
                tanggal: input.tanggal,
                driverId: input.driverId || null,
                driverNama: input.driverNama,
                berangkatJam: input.berangkatJam,
                kembaliJam: input.kembaliJam,
                lamaDipergunakan: '-',
                vehicleId: input.vehicleId || null,
                kendaraanNoPol: input.kendaraanNoPol,
                kendaraanNama: input.kendaraanNama,
                keperluan: input.keperluan,
                standKmAwal: input.standKmAwal,
                standKmAkhir: input.standKmAkhir,
                jarakTempuh: Math.max(0, input.standKmAkhir - input.standKmAwal),
                picUid: user?.uid || '',
                picNama: '',
                issuedAt: new Date().toISOString(),
              },
            });
            setBanner({
              type: 'warning',
              message: `Perintah Jalan untuk ${loan.loanNumber} berhasil disimpan. Notifikasi WA otomatis tertunda (${waResult?.error || 'gunakan WhatsApp Web'}).`,
              waTarget: {
                phone: fallbackPhone,
                message: msgText,
                key: loan.id || loan.loanNumber,
              },
            });
          } else {
            setBanner({
              type: 'success',
              message: `Perintah Jalan untuk ${loan.loanNumber} berhasil disimpan.`,
            });
          }
        }}
      />

      {/* WhatsApp Notification Modal (Sender: SIMAP 085111320701) */}
      {activeWaModalLoan && (() => {
        const effectivePhone = isValidIndonesianWhatsApp(waPhoneInput)
          ? formatWhatsAppPhone(waPhoneInput)
          : resolveLoanPhone(activeWaModalLoan);
        const waMessage = buildVehicleLoanWhatsAppMessage(activeWaModalLoan);
        const loanKey = activeWaModalLoan.id || activeWaModalLoan.loanNumber;
        const waMeta = activeWaModalLoan.whatsappStatus
          ? WHATSAPP_STATUS_META[activeWaModalLoan.whatsappStatus] ||
            WHATSAPP_STATUS_META['Menunggu Pengiriman']
          : null;

        return (
          <div
            className="fixed inset-0 z-50 bg-[#071120]/65 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setWaModalLoan(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0E1A2E] rounded-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full overflow-hidden shadow-2xl"
            >
              <div className="bg-gradient-to-r from-[#173B65] to-[#0072BC] px-5 py-4 text-white flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-mono font-bold text-[#F9D423]">
                    {activeWaModalLoan.loanNumber} · Pengirim SIMAP: {SIMAP_WHATSAPP_NUMBER_LOCAL}
                  </p>
                  <h4 className="text-sm font-extrabold">
                    Kirim Notifikasi WhatsApp Peminjam Kendaraan
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setWaModalLoan(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">
                    Pemohon: <strong className="text-[#173B65] dark:text-white">{activeWaModalLoan.pemohonNama}</strong>
                  </span>
                  {waMeta && (
                    <span className={cn('px-2.5 py-0.5 rounded-md text-[10px] font-extrabold', waMeta.badgeClass)}>
                      WA: {activeWaModalLoan.whatsappStatus}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#173B65] dark:text-slate-200">
                    Nomor WhatsApp Penerima (+62)
                  </label>
                  <div className="relative">
                    <Phone
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400"
                    />
                    <input
                      type="tel"
                      value={waPhoneInput}
                      onChange={(e) => setWaPhoneInput(e.target.value)}
                      onBlur={() => {
                        if (waPhoneInput.trim()) {
                          setWaPhoneInput(formatWhatsAppPhone(waPhoneInput));
                        }
                      }}
                      placeholder="+6281234567890"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-[#0B172A] border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Pesan dikirim menggunakan nomor resmi WhatsApp SIMAP: <strong>{SIMAP_WHATSAPP_DISPLAY}</strong>
                  </p>
                </div>

                {activeWaModalLoan.whatsappError && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold">
                    Catatan Gateway: {activeWaModalLoan.whatsappError}
                  </p>
                )}

                <pre className="text-[11px] font-sans whitespace-pre-wrap bg-[#F8FBFD] dark:bg-[#0B172A] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 max-h-48 overflow-y-auto">
                  {waMessage}
                </pre>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleCopyLoanWa(loanKey, waMessage)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-[#173B65] dark:text-slate-200 hover:border-[#0072BC]"
                  >
                    {copiedWaId === loanKey ? (
                      <>
                        <Check size={13} className="text-emerald-500" />
                        Disalin
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        Salin Pesan
                      </>
                    )}
                  </button>

                  {effectivePhone && (
                    <a
                      href={toWaMeLink(effectivePhone, waMessage)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700"
                    >
                      <ExternalLink size={13} />
                      Kirim via WhatsApp Web
                    </a>
                  )}

                  <button
                    type="button"
                    disabled={sendingWaId === loanKey || !effectivePhone}
                    onClick={() => handleSendLoanWa(activeWaModalLoan, waPhoneInput)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0072BC] text-white text-[11px] font-bold hover:bg-[#173B65] disabled:opacity-50"
                  >
                    {sendingWaId === loanKey ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <RefreshCw size={13} />
                    )}
                    Kirim WA Otomatis
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Approve / Reject Modal */}
      {decisionLoan && (
        <div className="fixed inset-0 z-50 bg-[#071120]/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E1A2E] rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h4 className="text-sm font-extrabold text-[#173B65] dark:text-white">
              {decisionLoan.approve
                ? `Setujui Pengajuan ${decisionLoan.loan.loanNumber}?`
                : `Tolak Pengajuan ${decisionLoan.loan.loanNumber}?`}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pemohon: <strong>{decisionLoan.loan.pemohonNama}</strong> · Tujuan:{' '}
              <strong>{decisionLoan.loan.tujuan}</strong> ({decisionLoan.loan.tanggalDipergunakan})
            </p>
            {!decisionLoan.approve && (
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Alasan penolakan (opsional)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none"
              />
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={decisionSubmitting}
                onClick={() => setDecisionLoan(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={decisionSubmitting}
                onClick={handleConfirmDecision}
                className={cn(
                  'px-4 py-2 rounded-xl text-white text-xs font-bold',
                  decisionLoan.approve
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                )}
              >
                {decisionSubmitting
                  ? 'Memproses...'
                  : decisionLoan.approve
                  ? 'Ya, Setujui'
                  : 'Ya, Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Master Modal */}
      {vehicleModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#071120]/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E1A2E] rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-[#173B65] dark:text-white">
                {editingVehicle ? 'Edit Data Kendaraan Dinas' : 'Tambah Kendaraan Dinas'}
              </h4>
              <button type="button" onClick={() => setVehicleModalOpen(false)}>
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#173B65] dark:text-slate-200">
                    Nomor Polisi *
                  </label>
                  <input
                    required
                    type="text"
                    value={vNoPol}
                    onChange={(e) => setVNoPol(e.target.value.toUpperCase())}
                    placeholder="KB 1234 XX"
                    className="w-full px-3 py-2 rounded-xl bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#173B65] dark:text-slate-200">
                    Nama / Tipe Kendaraan *
                  </label>
                  <input
                    required
                    type="text"
                    value={vNama}
                    onChange={(e) => setVNama(e.target.value)}
                    placeholder="Toyota Innova Reborn"
                    className="w-full px-3 py-2 rounded-xl bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#173B65] dark:text-slate-200">
                    Jenis
                  </label>
                  <select
                    value={vJenis}
                    onChange={(e) => setVJenis(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  >
                    {VEHICLE_TYPES.map((vt) => (
                      <option key={vt} value={vt}>
                        {vt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#173B65] dark:text-slate-200">
                    Kapasitas
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={vKapasitas}
                    onChange={(e) => setVKapasitas(Math.max(1, Number(e.target.value) || 4))}
                    className="w-full px-3 py-2 rounded-xl bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#173B65] dark:text-slate-200">
                    Status
                  </label>
                  <select
                    value={vStatus}
                    onChange={(e) => setVStatus(e.target.value as VehicleStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  >
                    <option value="Tersedia">Tersedia</option>
                    <option value="Sedang Dipinjam">Sedang Dipinjam</option>
                    <option value="Perawatan">Perawatan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#173B65] dark:text-slate-200">
                    Unit Kerja
                  </label>
                  <input
                    type="text"
                    value={vUnitKerja}
                    onChange={(e) => setVUnitKerja(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#173B65] dark:text-slate-200">
                    Tahun
                  </label>
                  <input
                    type="text"
                    value={vTahun}
                    onChange={(e) => setVTahun(e.target.value)}
                    placeholder="2023"
                    className="w-full px-3 py-2 rounded-xl bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#173B65] dark:text-slate-200">
                    KM Terakhir
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={vKmTerakhir}
                    onChange={(e) => setVKmTerakhir(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVehicleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingMaster}
                  className="px-4 py-2 rounded-xl bg-[#0072BC] text-white text-xs font-bold hover:bg-[#173B65]"
                >
                  {savingMaster ? 'Menyimpan...' : 'Simpan Kendaraan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Driver Master Modal */}
      {driverModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#071120]/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E1A2E] rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-[#173B65] dark:text-white">
                {editingDriver ? 'Edit Data Pengemudi / Driver' : 'Tambah Pengemudi / Driver'}
              </h4>
              <button type="button" onClick={() => setDriverModalOpen(false)}>
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveDriverSubmit} className="space-y-3.5">
              {directoryEmployees.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#173B65] dark:text-slate-200">
                    Ambil dari Data Pegawai (Opsional)
                  </label>
                  <select
                    value={dEmployeeId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setDEmployeeId(id);
                      const found = directoryEmployees.find((emp) => emp.id === id);
                      if (found) {
                        setDNama(found.fullName);
                        if (found.noTelepon) setDNoHp(found.noTelepon);
                        if (found.unitPelaksana) setDUnitKerja(found.unitPelaksana);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  >
                    <option value="">-- Input Manual atau Pilih Pegawai --</option>
                    {directoryEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.nip})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#173B65] dark:text-slate-200">
                    Nama Driver *
                  </label>
                  <input
                    required
                    type="text"
                    value={dNama}
                    onChange={(e) => setDNama(e.target.value)}
                    placeholder="Nama lengkap pengemudi"
                    className="w-full px-3 py-2 rounded-xl bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#173B65] dark:text-slate-200">
                    No HP / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={dNoHp}
                    onChange={(e) => setDNoHp(e.target.value)}
                    placeholder="0812..."
                    className="w-full px-3 py-2 rounded-xl bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#173B65] dark:text-slate-200">
                    Nomor SIM
                  </label>
                  <input
                    type="text"
                    value={dNoSim}
                    onChange={(e) => setDNoSim(e.target.value)}
                    placeholder="SIM A / B1"
                    className="w-full px-3 py-2 rounded-xl bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#173B65] dark:text-slate-200">
                    Unit Kerja
                  </label>
                  <input
                    type="text"
                    value={dUnitKerja}
                    onChange={(e) => setDUnitKerja(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#173B65] dark:text-slate-200">
                    Status
                  </label>
                  <select
                    value={dStatus}
                    onChange={(e) => setDStatus(e.target.value as DriverStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Cuti / Off">Cuti / Off</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDriverModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingMaster}
                  className="px-4 py-2 rounded-xl bg-[#0072BC] text-white text-xs font-bold hover:bg-[#173B65]"
                >
                  {savingMaster ? 'Menyimpan...' : 'Simpan Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete ConfirmDialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Konfirmasi Hapus Data"
        description={
          deleteTarget?.type === 'loan'
            ? `Hapus pengajuan peminjaman kendaraan ${deleteTarget.item.loanNumber}?`
            : deleteTarget?.type === 'vehicle'
            ? `Hapus kendaraan dinas ${deleteTarget.item.noPol} (${deleteTarget.item.namaKendaraan})?`
            : deleteTarget?.type === 'driver'
            ? `Hapus data pengemudi ${deleteTarget.item.namaDriver}?`
            : ''
        }
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default VehicleLoanManagement;
