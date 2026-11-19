import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Edit,
  Eye,
  FileText,
  Globe,
  Landmark,
  Lightbulb,
  Loader2,
  Lock,
  MapPin,
  Monitor,
  Plus,
  Scale,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BoardRegulationDocument,
  CommunityOfPractice,
  Employee,
  INNOVATION_CATEGORIES,
  InnovationCategory,
  InnovationRecord,
  KnowledgeSectionType,
  KnowledgeSharingForum,
  KsfExecutionMethod,
  RegulationDocument,
  SopDocument,
} from '../../types';
import { useKnowledgeGovernance } from '../../hooks/useKnowledgeGovernance';
import {
  FileCategory,
  formatFileSize,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_MB,
  uploadFileSmart,
} from '../../lib/fileStorage';
import { cn, formatDate } from '../../lib/utils';
import { PageHeader, SectionCard } from '../common/DashboardUI';
import { StoredFileLink } from '../common/StoredFileUI';

interface KnowledgeGovernanceViewProps {
  section: KnowledgeSectionType;
  employees: Employee[];
  canManage: boolean;
  onChangeSection?: (section: KnowledgeSectionType) => void;
  showSectionSwitcher?: boolean;
  compactHeader?: boolean;
}

const SECTION_META: Record<
  KnowledgeSectionType,
  {
    title: string;
    subtitle: string;
    badge: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    publicOnLanding: boolean;
    fileCategory: FileCategory;
    storagePath: string;
  }
> = {
  'knowledge-sharing': {
    title: 'Knowledge Sharing Forum',
    subtitle: 'Jadwal dan dokumentasi forum berbagi pengetahuan pegawai (tampil di Landing Page)',
    badge: 'Publik · Landing Page',
    icon: BookOpen,
    publicOnLanding: true,
    fileCategory: 'ksf_evidence',
    storagePath: 'knowledge/ksf',
  },
  cop: {
    title: 'Community Of Practice',
    subtitle: 'Rekaman diskusi komunitas praktisi dan kelompok keahlian unit (khusus pegawai login)',
    badge: 'Internal · Pegawai Terdaftar',
    icon: Users,
    publicOnLanding: false,
    fileCategory: 'cop_evidence',
    storagePath: 'knowledge/cop',
  },
  inovasi: {
    title: 'Inovasi Pegawai & Unit',
    subtitle: 'Katalog karya inovasi tim 3 inovator lintas bidang (tampil di Landing Page)',
    badge: 'Publik · Landing Page',
    icon: Lightbulb,
    publicOnLanding: true,
    fileCategory: 'inovasi_doc',
    storagePath: 'knowledge/innovations',
  },
  sop: {
    title: 'Data SOP',
    subtitle: 'Repositori Standard Operating Procedure operasional dan SDM (khusus pegawai login)',
    badge: 'Internal · Pegawai Terdaftar',
    icon: ClipboardList,
    publicOnLanding: false,
    fileCategory: 'sop_doc',
    storagePath: 'knowledge/sop',
  },
  regulasi: {
    title: 'Data Regulasi',
    subtitle: 'Dokumen regulasi ketenagalistrikan, K3, dan tata kelola (khusus pegawai login)',
    badge: 'Internal · Pegawai Terdaftar',
    icon: Scale,
    publicOnLanding: false,
    fileCategory: 'regulasi_doc',
    storagePath: 'knowledge/regulations',
  },
  'peraturan-direksi': {
    title: 'Peraturan Direksi',
    subtitle: 'Himpunan Peraturan Direksi PLN Nusantara Power (khusus pegawai login)',
    badge: 'Internal · Pegawai Terdaftar',
    icon: Landmark,
    publicOnLanding: false,
    fileCategory: 'perdir_doc',
    storagePath: 'knowledge/board-regulations',
  },
};

const COP_BIDANG_OPTIONS = [
  'Operasi Pembangkit',
  'Pemeliharaan Mesin & Listrik',
  'Engineering & Reliability',
  'Energi Baru Terbarukan (EBT)',
  'K3, Lingkungan & Keamanan',
  'SDM, Umum & Business Support',
  'Digitalisasi & Aplikasi',
];

const KnowledgeGovernanceView: React.FC<KnowledgeGovernanceViewProps> = ({
  section,
  employees,
  canManage,
  onChangeSection,
  showSectionSwitcher = false,
  compactHeader = false,
}) => {
  const {
    ksfList,
    copList,
    innovationList,
    sopList,
    regulationList,
    boardRegulationList,
    loading,
    saveKsf,
    deleteKsf,
    saveCop,
    deleteCop,
    saveInnovation,
    deleteInnovation,
    saveSop,
    deleteSop,
    saveRegulation,
    deleteRegulation,
    saveBoardRegulation,
    deleteBoardRegulation,
  } = useKnowledgeGovernance(true);

  const meta = SECTION_META[section];

  const [searchQuery, setSearchQuery] = useState('');
  const [ksfMethodFilter, setKsfMethodFilter] = useState<'Semua' | KsfExecutionMethod>('Semua');
  const [innovationCatFilter, setInnovationCatFilter] = useState<'Semua' | InnovationCategory>('Semua');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [detailItem, setDetailItem] = useState<any | null>(null);

  // Form States
  const [ksfForm, setKsfForm] = useState({
    pemateriEmployeeId: '',
    namaPemateri: '',
    pemateriNip: '',
    pemateriUnit: '',
    manualPemateri: false,
    judulMateri: '',
    tanggalPelaksanaan: '',
    lokasiPelaksanaan: '',
    metodePelaksanaan: 'Offline' as KsfExecutionMethod,
    evidenceUrl: '',
    evidenceFileName: '',
  });

  const [copForm, setCopForm] = useState({
    judulTopik: '',
    leaderEmployeeId: '',
    namaLeader: '',
    bidang: COP_BIDANG_OPTIONS[0],
    tanggalPelaksanaan: '',
    lokasi: '',
    ringkasan: '',
    evidenceUrl: '',
    evidenceFileName: '',
  });

  const [innovationForm, setInnovationForm] = useState({
    inovator1: '',
    inovator1EmpId: '',
    inovator2: '',
    inovator2EmpId: '',
    inovator3: '',
    inovator3EmpId: '',
    judulInovasi: '',
    kategoriInovasi: INNOVATION_CATEGORIES[0] as InnovationCategory,
    tanggalPelaksanaan: '',
    ringkasan: '',
    evidenceUrl: '',
    evidenceFileName: '',
  });

  const [docForm, setDocForm] = useState({
    nomorDokumen: '',
    judul: '',
    bidangOrPenerbit: '',
    tanggalBerlaku: '',
    ringkasan: '',
    fileUrl: '',
    fileName: '',
  });

  const sortedEmployees = useMemo(
    () => [...employees].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [employees]
  );

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((emp) => {
      if (emp.id) map.set(emp.id, emp);
    });
    return map;
  }, [employees]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const resetForms = () => {
    setEditingId(null);
    setFormError(null);
    setUploadingFile(false);
    setUploadProgress(0);
    const today = new Date().toISOString().split('T')[0];

    setKsfForm({
      pemateriEmployeeId: '',
      namaPemateri: '',
      pemateriNip: '',
      pemateriUnit: '',
      manualPemateri: sortedEmployees.length === 0,
      judulMateri: '',
      tanggalPelaksanaan: today,
      lokasiPelaksanaan: '',
      metodePelaksanaan: 'Offline',
      evidenceUrl: '',
      evidenceFileName: '',
    });

    setCopForm({
      judulTopik: '',
      leaderEmployeeId: '',
      namaLeader: '',
      bidang: COP_BIDANG_OPTIONS[0],
      tanggalPelaksanaan: today,
      lokasi: '',
      ringkasan: '',
      evidenceUrl: '',
      evidenceFileName: '',
    });

    setInnovationForm({
      inovator1: '',
      inovator1EmpId: '',
      inovator2: '',
      inovator2EmpId: '',
      inovator3: '',
      inovator3EmpId: '',
      judulInovasi: '',
      kategoriInovasi: INNOVATION_CATEGORIES[0],
      tanggalPelaksanaan: today,
      ringkasan: '',
      evidenceUrl: '',
      evidenceFileName: '',
    });

    setDocForm({
      nomorDokumen: '',
      judul: '',
      bidangOrPenerbit: '',
      tanggalBerlaku: today,
      ringkasan: '',
      fileUrl: '',
      fileName: '',
    });
  };

  const openCreateModal = () => {
    resetForms();
    setIsFormOpen(true);
  };

  const openEditModal = (item: any) => {
    resetForms();
    setEditingId(item.id || null);

    if (section === 'knowledge-sharing') {
      const ksf = item as KnowledgeSharingForum;
      const syncedEmp = ksf.pemateriEmployeeId ? employeeMap.get(ksf.pemateriEmployeeId) : undefined;
      setKsfForm({
        pemateriEmployeeId: ksf.pemateriEmployeeId || '',
        namaPemateri: syncedEmp?.fullName || ksf.namaPemateri || '',
        pemateriNip: syncedEmp?.nip || ksf.pemateriNip || '',
        pemateriUnit: syncedEmp?.unitPelaksana || ksf.pemateriUnit || '',
        manualPemateri: !ksf.pemateriEmployeeId && sortedEmployees.length > 0 ? true : sortedEmployees.length === 0,
        judulMateri: ksf.judulMateri || '',
        tanggalPelaksanaan: ksf.tanggalPelaksanaan || '',
        lokasiPelaksanaan: ksf.lokasiPelaksanaan || '',
        metodePelaksanaan: ksf.metodePelaksanaan || 'Offline',
        evidenceUrl: ksf.evidenceUrl || '',
        evidenceFileName: ksf.evidenceFileName || '',
      });
    } else if (section === 'cop') {
      const cop = item as CommunityOfPractice;
      const syncedLeader = cop.leaderEmployeeId ? employeeMap.get(cop.leaderEmployeeId) : undefined;
      setCopForm({
        judulTopik: cop.judulTopik || '',
        leaderEmployeeId: cop.leaderEmployeeId || '',
        namaLeader: syncedLeader?.fullName || cop.namaLeader || '',
        bidang: cop.bidang || COP_BIDANG_OPTIONS[0],
        tanggalPelaksanaan: cop.tanggalPelaksanaan || '',
        lokasi: cop.lokasi || '',
        ringkasan: cop.ringkasan || '',
        evidenceUrl: cop.evidenceUrl || '',
        evidenceFileName: cop.evidenceFileName || '',
      });
    } else if (section === 'inovasi') {
      const ino = item as InnovationRecord;
      const empIds = ino.inovatorEmployeeIds || [];
      setInnovationForm({
        inovator1: ino.inovator1 || '',
        inovator1EmpId: empIds[0] || '',
        inovator2: ino.inovator2 || '',
        inovator2EmpId: empIds[1] || '',
        inovator3: ino.inovator3 || '',
        inovator3EmpId: empIds[2] || '',
        judulInovasi: ino.judulInovasi || '',
        kategoriInovasi: ino.kategoriInovasi || INNOVATION_CATEGORIES[0],
        tanggalPelaksanaan: ino.tanggalPelaksanaan || '',
        ringkasan: ino.ringkasan || '',
        evidenceUrl: ino.evidenceUrl || '',
        evidenceFileName: ino.evidenceFileName || '',
      });
    } else if (section === 'sop') {
      const sop = item as SopDocument;
      setDocForm({
        nomorDokumen: sop.nomorDokumen || '',
        judul: sop.judul || '',
        bidangOrPenerbit: sop.bidang || '',
        tanggalBerlaku: sop.tanggalBerlaku || '',
        ringkasan: sop.ringkasan || '',
        fileUrl: sop.fileUrl || '',
        fileName: sop.fileName || '',
      });
    } else if (section === 'regulasi') {
      const reg = item as RegulationDocument;
      setDocForm({
        nomorDokumen: reg.nomorDokumen || '',
        judul: reg.judul || '',
        bidangOrPenerbit: reg.penerbit || '',
        tanggalBerlaku: reg.tanggalBerlaku || '',
        ringkasan: reg.ringkasan || '',
        fileUrl: reg.fileUrl || '',
        fileName: reg.fileName || '',
      });
    } else {
      const perdir = item as BoardRegulationDocument;
      setDocForm({
        nomorDokumen: perdir.nomorDokumen || '',
        judul: perdir.judul || '',
        bidangOrPenerbit: '',
        tanggalBerlaku: perdir.tanggalBerlaku || '',
        ringkasan: perdir.ringkasan || '',
        fileUrl: perdir.fileUrl || '',
        fileName: perdir.fileName || '',
      });
    }

    setIsFormOpen(true);
  };

  const handleUploadAttachment = async (file: File) => {
    setFormError(null);
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setFormError(
        `Ukuran berkas (${formatFileSize(file.size)}) melebihi batas maksimal ${MAX_UPLOAD_SIZE_MB} MB.`
      );
      return;
    }

    setUploadingFile(true);
    setUploadProgress(5);
    try {
      const uploadedUrl = await uploadFileSmart({
        file,
        fileName: file.name,
        storagePath: meta.storagePath,
        category: meta.fileCategory,
        label: meta.title,
        onProgress: (pct) => setUploadProgress(pct),
      });

      if (section === 'knowledge-sharing') {
        setKsfForm((prev) => ({
          ...prev,
          evidenceUrl: uploadedUrl,
          evidenceFileName: file.name,
        }));
      } else if (section === 'cop') {
        setCopForm((prev) => ({
          ...prev,
          evidenceUrl: uploadedUrl,
          evidenceFileName: file.name,
        }));
      } else if (section === 'inovasi') {
        setInnovationForm((prev) => ({
          ...prev,
          evidenceUrl: uploadedUrl,
          evidenceFileName: file.name,
        }));
      } else {
        setDocForm((prev) => ({
          ...prev,
          fileUrl: uploadedUrl,
          fileName: file.name,
        }));
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal mengunggah berkas.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadingFile) return;
    setFormError(null);
    setSaving(true);

    try {
      if (section === 'knowledge-sharing') {
        if (!ksfForm.namaPemateri.trim()) {
          throw new Error('Pilih atau isi Nama Pemateri terlebih dahulu.');
        }
        await saveKsf(
          {
            pemateriEmployeeId: ksfForm.pemateriEmployeeId || null,
            namaPemateri: ksfForm.namaPemateri,
            pemateriNip: ksfForm.pemateriNip || null,
            pemateriUnit: ksfForm.pemateriUnit || null,
            judulMateri: ksfForm.judulMateri,
            tanggalPelaksanaan: ksfForm.tanggalPelaksanaan,
            lokasiPelaksanaan: ksfForm.lokasiPelaksanaan,
            metodePelaksanaan: ksfForm.metodePelaksanaan,
            evidenceUrl: ksfForm.evidenceUrl || null,
            evidenceFileName: ksfForm.evidenceFileName || null,
          },
          editingId || undefined
        );
      } else if (section === 'cop') {
        await saveCop(
          {
            judulTopik: copForm.judulTopik,
            leaderEmployeeId: copForm.leaderEmployeeId || null,
            namaLeader: copForm.namaLeader,
            bidang: copForm.bidang,
            tanggalPelaksanaan: copForm.tanggalPelaksanaan,
            lokasi: copForm.lokasi || null,
            ringkasan: copForm.ringkasan || null,
            evidenceUrl: copForm.evidenceUrl || null,
            evidenceFileName: copForm.evidenceFileName || null,
          },
          editingId || undefined
        );
      } else if (section === 'inovasi') {
        if (!innovationForm.inovator1.trim()) {
          throw new Error('Nama Inovator 1 wajib diisi.');
        }
        const empIds = [
          innovationForm.inovator1EmpId,
          innovationForm.inovator2EmpId,
          innovationForm.inovator3EmpId,
        ].filter(Boolean);
        await saveInnovation(
          {
            inovator1: innovationForm.inovator1,
            inovator2: innovationForm.inovator2,
            inovator3: innovationForm.inovator3,
            inovatorEmployeeIds: empIds,
            judulInovasi: innovationForm.judulInovasi,
            kategoriInovasi: innovationForm.kategoriInovasi,
            tanggalPelaksanaan: innovationForm.tanggalPelaksanaan || null,
            ringkasan: innovationForm.ringkasan || null,
            evidenceUrl: innovationForm.evidenceUrl || null,
            evidenceFileName: innovationForm.evidenceFileName || null,
          },
          editingId || undefined
        );
      } else if (section === 'sop') {
        await saveSop(
          {
            nomorDokumen: docForm.nomorDokumen,
            judul: docForm.judul,
            bidang: docForm.bidangOrPenerbit,
            tanggalBerlaku: docForm.tanggalBerlaku,
            ringkasan: docForm.ringkasan || null,
            fileUrl: docForm.fileUrl || null,
            fileName: docForm.fileName || null,
          },
          editingId || undefined
        );
      } else if (section === 'regulasi') {
        await saveRegulation(
          {
            nomorDokumen: docForm.nomorDokumen,
            judul: docForm.judul,
            penerbit: docForm.bidangOrPenerbit,
            tanggalBerlaku: docForm.tanggalBerlaku,
            ringkasan: docForm.ringkasan || null,
            fileUrl: docForm.fileUrl || null,
            fileName: docForm.fileName || null,
          },
          editingId || undefined
        );
      } else {
        await saveBoardRegulation(
          {
            nomorDokumen: docForm.nomorDokumen,
            judul: docForm.judul,
            tanggalBerlaku: docForm.tanggalBerlaku,
            ringkasan: docForm.ringkasan || null,
            fileUrl: docForm.fileUrl || null,
            fileName: docForm.fileName || null,
          },
          editingId || undefined
        );
      }

      setIsFormOpen(false);
      showToast(
        editingId
          ? `Data ${meta.title} berhasil diperbarui.`
          : `Data baru ${meta.title} berhasil disimpan.`
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan data.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (section === 'knowledge-sharing') {
        await deleteKsf(deleteTarget.id, deleteTarget.title);
      } else if (section === 'cop') {
        await deleteCop(deleteTarget.id, deleteTarget.title);
      } else if (section === 'inovasi') {
        await deleteInnovation(deleteTarget.id, deleteTarget.title);
      } else if (section === 'sop') {
        await deleteSop(deleteTarget.id, deleteTarget.title);
      } else if (section === 'regulasi') {
        await deleteRegulation(deleteTarget.id, deleteTarget.title);
      } else {
        await deleteBoardRegulation(deleteTarget.id, deleteTarget.title);
      }
      setDeleteTarget(null);
      showToast(`Data ${meta.title} berhasil dihapus.`);
    } finally {
      setDeleting(false);
    }
  };

  // Filtered lists
  const q = searchQuery.trim().toLowerCase();

  const filteredKsf = useMemo(() => {
    return ksfList.filter((item) => {
      if (ksfMethodFilter !== 'Semua' && item.metodePelaksanaan !== ksfMethodFilter) return false;
      if (!q) return true;
      const syncedName =
        (item.pemateriEmployeeId && employeeMap.get(item.pemateriEmployeeId)?.fullName) ||
        item.namaPemateri;
      return (
        item.judulMateri.toLowerCase().includes(q) ||
        syncedName.toLowerCase().includes(q) ||
        item.lokasiPelaksanaan.toLowerCase().includes(q)
      );
    });
  }, [ksfList, ksfMethodFilter, q, employeeMap]);

  const filteredCop = useMemo(() => {
    return copList.filter((item) => {
      if (!q) return true;
      return (
        item.judulTopik.toLowerCase().includes(q) ||
        item.namaLeader.toLowerCase().includes(q) ||
        item.bidang.toLowerCase().includes(q)
      );
    });
  }, [copList, q]);

  const filteredInnovations = useMemo(() => {
    return innovationList.filter((item) => {
      if (innovationCatFilter !== 'Semua' && item.kategoriInovasi !== innovationCatFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.judulInovasi.toLowerCase().includes(q) ||
        item.inovator1.toLowerCase().includes(q) ||
        item.inovator2.toLowerCase().includes(q) ||
        item.inovator3.toLowerCase().includes(q) ||
        item.kategoriInovasi.toLowerCase().includes(q)
      );
    });
  }, [innovationList, innovationCatFilter, q]);

  const filteredSop = useMemo(() => {
    return sopList.filter((item) => {
      if (!q) return true;
      return (
        item.judul.toLowerCase().includes(q) ||
        item.nomorDokumen.toLowerCase().includes(q) ||
        item.bidang.toLowerCase().includes(q)
      );
    });
  }, [sopList, q]);

  const filteredRegulations = useMemo(() => {
    return regulationList.filter((item) => {
      if (!q) return true;
      return (
        item.judul.toLowerCase().includes(q) ||
        item.nomorDokumen.toLowerCase().includes(q) ||
        item.penerbit.toLowerCase().includes(q)
      );
    });
  }, [regulationList, q]);

  const filteredBoardRegulations = useMemo(() => {
    return boardRegulationList.filter((item) => {
      if (!q) return true;
      return (
        item.judul.toLowerCase().includes(q) ||
        item.nomorDokumen.toLowerCase().includes(q)
      );
    });
  }, [boardRegulationList, q]);

  const activeItems =
    section === 'knowledge-sharing'
      ? filteredKsf
      : section === 'cop'
      ? filteredCop
      : section === 'inovasi'
      ? filteredInnovations
      : section === 'sop'
      ? filteredSop
      : section === 'regulasi'
      ? filteredRegulations
      : filteredBoardRegulations;

  const activeAttachmentUrl =
    section === 'knowledge-sharing'
      ? ksfForm.evidenceUrl
      : section === 'cop'
      ? copForm.evidenceUrl
      : section === 'inovasi'
      ? innovationForm.evidenceUrl
      : docForm.fileUrl;

  const activeAttachmentName =
    section === 'knowledge-sharing'
      ? ksfForm.evidenceFileName
      : section === 'cop'
      ? copForm.evidenceFileName
      : section === 'inovasi'
      ? innovationForm.evidenceFileName
      : docForm.fileName;

  const clearAttachment = () => {
    if (section === 'knowledge-sharing') {
      setKsfForm((p) => ({ ...p, evidenceUrl: '', evidenceFileName: '' }));
    } else if (section === 'cop') {
      setCopForm((p) => ({ ...p, evidenceUrl: '', evidenceFileName: '' }));
    } else if (section === 'inovasi') {
      setInnovationForm((p) => ({ ...p, evidenceUrl: '', evidenceFileName: '' }));
    } else {
      setDocForm((p) => ({ ...p, fileUrl: '', fileName: '' }));
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {!compactHeader ? (
        <PageHeader
          title={meta.title}
          subtitle={meta.subtitle}
          icon={meta.icon}
          badge={meta.badge}
          actions={
            canManage && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 pln-cta-gradient text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-sm hover:brightness-105 transition-all whitespace-nowrap shrink-0"
              >
                <Plus size={15} />
                Tambah Data
              </button>
            )
          }
        />
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-[#173B65] dark:text-slate-100 tracking-tight">
              {meta.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{meta.subtitle}</p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 pln-cta-gradient text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-sm hover:brightness-105 transition-all whitespace-nowrap shrink-0"
            >
              <Plus size={15} />
              Tambah Data
            </button>
          )}
        </div>
      )}

      {showSectionSwitcher && onChangeSection && (
        <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto">
          {(Object.keys(SECTION_META) as KnowledgeSectionType[]).map((key) => {
            const tabMeta = SECTION_META[key];
            const TabIcon = tabMeta.icon;
            const active = key === section;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onChangeSection(key);
                  setSearchQuery('');
                }}
                className={cn(
                  'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors',
                  active
                    ? 'bg-[#0072BC] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-[#F4F8FB] dark:hover:bg-slate-800'
                )}
              >
                <TabIcon size={14} />
                {tabMeta.title}
              </button>
            );
          })}
        </div>
      )}

      {toastMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-3 text-xs font-bold">
          <CheckCircle2 size={17} className="shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="corporate-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Cari ${meta.title.toLowerCase()}...`}
            className="w-full pl-10 pr-4 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#173B65] dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#0072BC]"
          />
        </div>

        {section === 'knowledge-sharing' && (
          <div className="flex items-center gap-1 p-1 bg-[#F4F8FB] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl w-fit">
            {(['Semua', 'Online', 'Offline'] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setKsfMethodFilter(method)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0',
                  ksfMethodFilter === method
                    ? 'bg-[#0072BC] text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                )}
              >
                {method}
              </button>
            ))}
          </div>
        )}

        {section === 'inovasi' && (
          <div className="flex items-center gap-1 p-1 bg-[#F4F8FB] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto max-w-full">
            {(['Semua', ...INNOVATION_CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setInnovationCatFilter(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0',
                  innovationCatFilter === cat
                    ? 'bg-[#0072BC] text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
          {meta.publicOnLanding ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Globe size={14} />
              Tampil di Landing Page
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Lock size={14} />
              Khusus Pegawai Login
            </span>
          )}
          <span aria-hidden="true">·</span>
          <span>{activeItems.length} Data</span>
        </div>
      </div>

      {/* Content List */}
      <SectionCard
        title={`Daftar ${meta.title}`}
        subtitle={
          canManage
            ? 'Kelola penambahan, pembaruan, dan penghapusan data secara langsung.'
            : 'Daftar dokumen dan catatan terbaru yang dapat dibaca dan diunduh.'
        }
        icon={meta.icon}
      >
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 size={28} className="animate-spin text-[#0072BC] dark:text-[#72C8F1]" />
            <p className="text-xs font-semibold">Memuat data {meta.title}...</p>
          </div>
        ) : activeItems.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              Belum ada data {meta.title} yang sesuai.
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {canManage
                ? 'Klik tombol "Tambah Data" untuk menginput entri pertama.'
                : 'Data akan muncul di sini setelah ditambahkan oleh Administrator.'}
            </p>
            {canManage && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0072BC] text-white rounded-xl text-xs font-bold hover:bg-[#173B65] transition-colors"
              >
                <Plus size={14} />
                Input Data Pertama
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {section === 'knowledge-sharing' &&
              filteredKsf.map((item) => {
                const syncedEmp = item.pemateriEmployeeId
                  ? employeeMap.get(item.pemateriEmployeeId)
                  : undefined;
                const speakerName = syncedEmp?.fullName || item.namaPemateri;
                const speakerMeta = syncedEmp
                  ? `NIP ${syncedEmp.nip} · ${syncedEmp.unitPelaksana}`
                  : item.pemateriNip
                  ? `NIP ${item.pemateriNip}${item.pemateriUnit ? ` · ${item.pemateriUnit}` : ''}`
                  : null;

                return (
                  <div
                    key={item.id}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-bold text-[#0072BC] dark:text-[#72C8F1] inline-flex items-center gap-1">
                          {item.metodePelaksanaan === 'Online' ? (
                            <Monitor size={12} />
                          ) : (
                            <MapPin size={12} />
                          )}
                          {item.metodePelaksanaan}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatDate(item.tanggalPelaksanaan)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{item.lokasiPelaksanaan}</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-[#173B65] dark:text-slate-100 leading-snug">
                        {item.judulMateri}
                      </h4>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Pemateri: {speakerName}
                        {speakerMeta && (
                          <span className="text-slate-400 font-normal"> ({speakerMeta})</span>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {item.evidenceUrl && (
                        <StoredFileLink
                          url={item.evidenceUrl}
                          fileName={item.evidenceFileName || item.judulMateri}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] rounded-xl text-xs font-bold hover:bg-[#0072BC] hover:text-white transition-colors"
                        >
                          <FileText size={13} />
                          Evidence
                        </StoredFileLink>
                      )}
                      <button
                        type="button"
                        onClick={() => setDetailItem(item)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#0072BC] hover:text-[#0072BC] transition-colors"
                        title="Detail"
                      >
                        <Eye size={14} />
                      </button>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                            title="Edit Data"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({ id: item.id!, title: item.judulMateri })
                            }
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="Hapus Data"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

            {section === 'cop' &&
              filteredCop.map((item) => {
                const syncedLeader = item.leaderEmployeeId
                  ? employeeMap.get(item.leaderEmployeeId)
                  : undefined;
                const leaderName = syncedLeader?.fullName || item.namaLeader;
                return (
                  <div
                    key={item.id}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-bold text-[#0072BC] dark:text-[#72C8F1]">
                          {item.bidang}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatDate(item.tanggalPelaksanaan)}</span>
                        {item.lokasi && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{item.lokasi}</span>
                          </>
                        )}
                      </div>
                      <h4 className="text-sm font-extrabold text-[#173B65] dark:text-slate-100 leading-snug">
                        {item.judulTopik}
                      </h4>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Fasilitator / Leader: {leaderName}
                      </p>
                      {item.ringkasan && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {item.ringkasan}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {item.evidenceUrl && (
                        <StoredFileLink
                          url={item.evidenceUrl}
                          fileName={item.evidenceFileName || item.judulTopik}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] rounded-xl text-xs font-bold hover:bg-[#0072BC] hover:text-white transition-colors"
                        >
                          <FileText size={13} />
                          Dokumen
                        </StoredFileLink>
                      )}
                      <button
                        type="button"
                        onClick={() => setDetailItem(item)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#0072BC] transition-colors"
                        title="Detail"
                      >
                        <Eye size={14} />
                      </button>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                            title="Edit Data"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({ id: item.id!, title: item.judulTopik })
                            }
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="Hapus Data"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

            {section === 'inovasi' &&
              filteredInnovations.map((item) => {
                const innovators = [item.inovator1, item.inovator2, item.inovator3]
                  .map((n) => n?.trim())
                  .filter(Boolean);
                return (
                  <div
                    key={item.id}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-bold text-[#0072BC] dark:text-[#72C8F1]">
                          {item.kategoriInovasi}
                        </span>
                        {item.tanggalPelaksanaan && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">
                              {formatDate(item.tanggalPelaksanaan)}
                            </span>
                          </>
                        )}
                      </div>
                      <h4 className="text-sm font-extrabold text-[#173B65] dark:text-slate-100 leading-snug">
                        {item.judulInovasi}
                      </h4>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Tim Inovator: {innovators.join(' · ')}
                      </p>
                      {item.ringkasan && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {item.ringkasan}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {item.evidenceUrl && (
                        <StoredFileLink
                          url={item.evidenceUrl}
                          fileName={item.evidenceFileName || item.judulInovasi}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] rounded-xl text-xs font-bold hover:bg-[#0072BC] hover:text-white transition-colors"
                        >
                          <FileText size={13} />
                          Berkas
                        </StoredFileLink>
                      )}
                      <button
                        type="button"
                        onClick={() => setDetailItem(item)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#0072BC] transition-colors"
                        title="Detail"
                      >
                        <Eye size={14} />
                      </button>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                            title="Edit Data"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({ id: item.id!, title: item.judulInovasi })
                            }
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="Hapus Data"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

            {(section === 'sop' || section === 'regulasi' || section === 'peraturan-direksi') &&
              (section === 'sop'
                ? filteredSop
                : section === 'regulasi'
                ? filteredRegulations
                : filteredBoardRegulations
              ).map((item: any) => (
                <div
                  key={item.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-bold text-[#0072BC] dark:text-[#72C8F1]">
                        {item.nomorDokumen}
                      </span>
                      {(item.bidang || item.penerbit) && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{item.bidang || item.penerbit}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">Berlaku {formatDate(item.tanggalBerlaku)}</span>
                    </div>
                    <h4 className="text-sm font-extrabold text-[#173B65] dark:text-slate-100 leading-snug">
                      {item.judul}
                    </h4>
                    {item.ringkasan && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {item.ringkasan}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {item.fileUrl && (
                      <StoredFileLink
                        url={item.fileUrl}
                        fileName={item.fileName || item.judul}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] rounded-xl text-xs font-bold hover:bg-[#0072BC] hover:text-white transition-colors"
                      >
                        <FileText size={13} />
                        Buka Dokumen
                      </StoredFileLink>
                    )}
                    <button
                      type="button"
                      onClick={() => setDetailItem(item)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#0072BC] transition-colors"
                      title="Detail"
                    >
                      <Eye size={14} />
                    </button>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                          title="Edit Data"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: item.id!, title: item.judul })}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="Hapus Data"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </SectionCard>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 bg-[#071120]/65 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              className="w-full max-w-2xl bg-white dark:bg-[#0E1A2E] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-[#F8FBFD] dark:bg-[#11223B]">
                <div className="flex items-center gap-2.5">
                  <meta.icon size={18} className="text-[#0072BC] dark:text-[#72C8F1]" />
                  <div>
                    <h3 className="text-sm font-extrabold text-[#173B65] dark:text-slate-100">
                      {editingId ? `Edit ${meta.title}` : `Tambah ${meta.title}`}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Lengkapi seluruh rincian data sebelum menyimpan ke sistem.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={17} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                {formError && (
                  <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-xs font-bold text-red-600 dark:text-red-400">
                    {formError}
                  </div>
                )}

                {section === 'knowledge-sharing' && (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Nama Pemateri (Sinkron Data Pegawai)
                        </label>
                        {sortedEmployees.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setKsfForm((p) => ({
                                ...p,
                                manualPemateri: !p.manualPemateri,
                                pemateriEmployeeId: !p.manualPemateri ? '' : p.pemateriEmployeeId,
                              }))
                            }
                            className="text-[11px] font-bold text-[#0072BC] dark:text-[#72C8F1] hover:underline"
                          >
                            {ksfForm.manualPemateri
                              ? 'Pilih dari Data Pegawai'
                              : 'Input Manual (Non-Pegawai)'}
                          </button>
                        )}
                      </div>

                      {!ksfForm.manualPemateri && sortedEmployees.length > 0 ? (
                        <select
                          required
                          value={ksfForm.pemateriEmployeeId}
                          onChange={(e) => {
                            const emp = employeeMap.get(e.target.value);
                            setKsfForm((prev) => ({
                              ...prev,
                              pemateriEmployeeId: e.target.value,
                              namaPemateri: emp?.fullName || '',
                              pemateriNip: emp?.nip || '',
                              pemateriUnit: emp?.unitPelaksana || '',
                            }));
                          }}
                          className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                        >
                          <option value="">-- Pilih Pemateri dari Data Pegawai --</option>
                          {sortedEmployees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.fullName} — NIP {emp.nip} ({emp.unitPelaksana})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          required
                          value={ksfForm.namaPemateri}
                          onChange={(e) =>
                            setKsfForm((p) => ({
                              ...p,
                              namaPemateri: e.target.value,
                              pemateriEmployeeId: '',
                              pemateriNip: '',
                              pemateriUnit: '',
                            }))
                          }
                          placeholder="Masukkan nama lengkap pemateri"
                          className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                        />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Judul Materi
                      </label>
                      <input
                        type="text"
                        required
                        value={ksfForm.judulMateri}
                        onChange={(e) =>
                          setKsfForm((p) => ({ ...p, judulMateri: e.target.value }))
                        }
                        placeholder="Contoh: Optimalisasi Pemeliharaan Mesin PLTD Berbasis CBM"
                        className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Tanggal Pelaksanaan
                        </label>
                        <input
                          type="date"
                          required
                          value={ksfForm.tanggalPelaksanaan}
                          onChange={(e) =>
                            setKsfForm((p) => ({ ...p, tanggalPelaksanaan: e.target.value }))
                          }
                          className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Metode Pelaksanaan
                        </label>
                        <select
                          value={ksfForm.metodePelaksanaan}
                          onChange={(e) =>
                            setKsfForm((p) => ({
                              ...p,
                              metodePelaksanaan: e.target.value as KsfExecutionMethod,
                            }))
                          }
                          className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                        >
                          <option value="Offline">Offline</option>
                          <option value="Online">Online</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Lokasi Pelaksanaan
                      </label>
                      <input
                        type="text"
                        required
                        value={ksfForm.lokasiPelaksanaan}
                        onChange={(e) =>
                          setKsfForm((p) => ({ ...p, lokasiPelaksanaan: e.target.value }))
                        }
                        placeholder="Contoh: Ruang Rapat UP Kapuas / Zoom Meeting"
                        className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                      />
                    </div>
                  </>
                )}

                {section === 'cop' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Topik / Nama Community Of Practice
                      </label>
                      <input
                        type="text"
                        required
                        value={copForm.judulTopik}
                        onChange={(e) => setCopForm((p) => ({ ...p, judulTopik: e.target.value }))}
                        placeholder="Contoh: CoP Reliability Engine System Khatulistiwa"
                        className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Nama Leader / Fasilitator
                        </label>
                        {sortedEmployees.length > 0 && (
                          <select
                            value={copForm.leaderEmployeeId}
                            onChange={(e) => {
                              const emp = employeeMap.get(e.target.value);
                              if (emp) {
                                setCopForm((p) => ({
                                  ...p,
                                  leaderEmployeeId: e.target.value,
                                  namaLeader: emp.fullName,
                                }));
                              } else {
                                setCopForm((p) => ({ ...p, leaderEmployeeId: '' }));
                              }
                            }}
                            className="w-full px-3 py-2 mb-1.5 bg-[#EAF6FC]/60 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#173B65] dark:text-slate-200 outline-none"
                          >
                            <option value="">-- Pilih dari Data Pegawai (Opsional) --</option>
                            {sortedEmployees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.fullName} ({emp.nip})
                              </option>
                            ))}
                          </select>
                        )}
                        <input
                          type="text"
                          required
                          value={copForm.namaLeader}
                          onChange={(e) =>
                            setCopForm((p) => ({
                              ...p,
                              namaLeader: e.target.value,
                              leaderEmployeeId: '',
                            }))
                          }
                          placeholder="Nama leader / narasumber CoP"
                          className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Bidang Komunitas
                        </label>
                        <select
                          value={copForm.bidang}
                          onChange={(e) => setCopForm((p) => ({ ...p, bidang: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                        >
                          {COP_BIDANG_OPTIONS.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Tanggal Pelaksanaan
                        </label>
                        <input
                          type="date"
                          required
                          value={copForm.tanggalPelaksanaan}
                          onChange={(e) =>
                            setCopForm((p) => ({ ...p, tanggalPelaksanaan: e.target.value }))
                          }
                          className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Lokasi / Media (Opsional)
                        </label>
                        <input
                          type="text"
                          value={copForm.lokasi}
                          onChange={(e) => setCopForm((p) => ({ ...p, lokasi: e.target.value }))}
                          placeholder="ULPLTD Sei Raya / MS Teams"
                          className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Ringkasan Pembahasan / Output
                      </label>
                      <textarea
                        rows={3}
                        value={copForm.ringkasan}
                        onChange={(e) => setCopForm((p) => ({ ...p, ringkasan: e.target.value }))}
                        placeholder="Ringkasan poin diskusi, solusi teknis, atau tindak lanjut CoP..."
                        className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                      />
                    </div>
                  </>
                )}

                {section === 'inovasi' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Judul Inovasi
                      </label>
                      <input
                        type="text"
                        required
                        value={innovationForm.judulInovasi}
                        onChange={(e) =>
                          setInnovationForm((p) => ({ ...p, judulInovasi: e.target.value }))
                        }
                        placeholder="Contoh: Sistem Monitoring Early Warning Bearing Mesin PLTD"
                        className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Kategori Inovasi
                        </label>
                        <select
                          required
                          value={innovationForm.kategoriInovasi}
                          onChange={(e) =>
                            setInnovationForm((p) => ({
                              ...p,
                              kategoriInovasi: e.target.value as InnovationCategory,
                            }))
                          }
                          className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                        >
                          {INNOVATION_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Tanggal Implementasi / Pengajuan
                        </label>
                        <input
                          type="date"
                          value={innovationForm.tanggalPelaksanaan}
                          onChange={(e) =>
                            setInnovationForm((p) => ({
                              ...p,
                              tanggalPelaksanaan: e.target.value,
                            }))
                          }
                          className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-1">
                      <p className="text-[11px] font-bold text-[#0072BC] dark:text-[#72C8F1] uppercase tracking-wider">
                        Tim Inovator (3 Nama Inovator)
                      </p>
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          {
                            idx: 1,
                            label: 'Nama Inovator 1 (Ketua Tim)',
                            required: true,
                            val: innovationForm.inovator1,
                            empId: innovationForm.inovator1EmpId,
                            nameKey: 'inovator1' as const,
                            empKey: 'inovator1EmpId' as const,
                          },
                          {
                            idx: 2,
                            label: 'Nama Inovator 2 (Anggota)',
                            required: false,
                            val: innovationForm.inovator2,
                            empId: innovationForm.inovator2EmpId,
                            nameKey: 'inovator2' as const,
                            empKey: 'inovator2EmpId' as const,
                          },
                          {
                            idx: 3,
                            label: 'Nama Inovator 3 (Anggota)',
                            required: false,
                            val: innovationForm.inovator3,
                            empId: innovationForm.inovator3EmpId,
                            nameKey: 'inovator3' as const,
                            empKey: 'inovator3EmpId' as const,
                          },
                        ].map((slot) => (
                          <div
                            key={slot.idx}
                            className="p-3 bg-[#F4F8FB] dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2"
                          >
                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                              {slot.label}
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {sortedEmployees.length > 0 && (
                                <select
                                  value={slot.empId}
                                  onChange={(e) => {
                                    const emp = employeeMap.get(e.target.value);
                                    setInnovationForm((p) => ({
                                      ...p,
                                      [slot.empKey]: e.target.value,
                                      ...(emp ? { [slot.nameKey]: emp.fullName } : {}),
                                    }));
                                  }}
                                  className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-[#173B65] dark:text-slate-200 outline-none"
                                >
                                  <option value="">-- Pilih Pegawai --</option>
                                  {sortedEmployees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>
                                      {emp.fullName} ({emp.nip})
                                    </option>
                                  ))}
                                </select>
                              )}
                              <input
                                type="text"
                                required={slot.required}
                                value={slot.val}
                                onChange={(e) =>
                                  setInnovationForm((p) => ({
                                    ...p,
                                    [slot.nameKey]: e.target.value,
                                    [slot.empKey]: '',
                                  }))
                                }
                                placeholder={`Masukkan nama inovator ${slot.idx}`}
                                className={cn(
                                  'px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]',
                                  sortedEmployees.length === 0 && 'sm:col-span-2'
                                )}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Ringkasan Inovasi (Opsional)
                      </label>
                      <textarea
                        rows={3}
                        value={innovationForm.ringkasan}
                        onChange={(e) =>
                          setInnovationForm((p) => ({ ...p, ringkasan: e.target.value }))
                        }
                        placeholder="Deskripsi singkat manfaat, efisiensi biaya/energi, atau dampak operasional..."
                        className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                      />
                    </div>
                  </>
                )}

                {(section === 'sop' ||
                  section === 'regulasi' ||
                  section === 'peraturan-direksi') && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {section === 'sop'
                            ? 'Nomor SOP'
                            : section === 'regulasi'
                            ? 'Nomor Regulasi'
                            : 'Nomor Peraturan Direksi'}
                        </label>
                        <input
                          type="text"
                          required
                          value={docForm.nomorDokumen}
                          onChange={(e) =>
                            setDocForm((p) => ({ ...p, nomorDokumen: e.target.value }))
                          }
                          placeholder={
                            section === 'sop'
                              ? 'SOP-KAPUAS-001/2026'
                              : section === 'regulasi'
                              ? 'PERMEN-ESDM-12/2025'
                              : 'PERDIR-014/DIR/2026'
                          }
                          className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Tanggal Berlaku / Terbit
                        </label>
                        <input
                          type="date"
                          required
                          value={docForm.tanggalBerlaku}
                          onChange={(e) =>
                            setDocForm((p) => ({ ...p, tanggalBerlaku: e.target.value }))
                          }
                          className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Judul / Perihal
                      </label>
                      <input
                        type="text"
                        required
                        value={docForm.judul}
                        onChange={(e) => setDocForm((p) => ({ ...p, judul: e.target.value }))}
                        placeholder="Masukkan judul lengkap dokumen"
                        className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                      />
                    </div>

                    {(section === 'sop' || section === 'regulasi') && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {section === 'sop' ? 'Bidang / Unit Terkait' : 'Instansi / Penerbit'}
                        </label>
                        <input
                          type="text"
                          required
                          value={docForm.bidangOrPenerbit}
                          onChange={(e) =>
                            setDocForm((p) => ({ ...p, bidangOrPenerbit: e.target.value }))
                          }
                          placeholder={
                            section === 'sop'
                              ? 'Contoh: Bidang Operasi / K3 & Keamanan'
                              : 'Contoh: Kementerian ESDM / PLN Holding'
                          }
                          className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Ringkasan / Ruang Lingkup (Opsional)
                      </label>
                      <textarea
                        rows={3}
                        value={docForm.ringkasan}
                        onChange={(e) => setDocForm((p) => ({ ...p, ringkasan: e.target.value }))}
                        placeholder="Pokok ketentuan atau ringkasan isi dokumen..."
                        className="w-full px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-[#173B65] dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0072BC]"
                      />
                    </div>
                  </>
                )}

                {/* Common Evidence / Document Upload Field */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {section === 'knowledge-sharing' || section === 'cop'
                      ? 'Upload Evidence (PDF, Foto, DOC, PPT · Maks. 50 MB)'
                      : 'Upload Dokumen Lampiran (Opsional · Maks. 50 MB)'}
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] rounded-xl text-xs font-bold cursor-pointer hover:bg-[#0072BC] hover:text-white transition-colors shrink-0">
                      <Upload size={14} />
                      <span>{uploadingFile ? `Mengunggah ${uploadProgress}%` : 'Pilih Berkas'}</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                        disabled={uploadingFile}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadAttachment(f);
                        }}
                      />
                    </label>

                    {activeAttachmentUrl && (
                      <div className="flex items-center gap-2 min-w-0 flex-1 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 truncate flex-1">
                          {activeAttachmentName || 'Berkas terunggah'}
                        </span>
                        <button
                          type="button"
                          onClick={clearAttachment}
                          className="text-xs font-bold text-red-500 hover:underline shrink-0"
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploadingFile}
                    className="inline-flex items-center gap-2 px-5 py-2.5 pln-cta-gradient text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-sm hover:brightness-105 disabled:opacity-50"
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    {editingId ? 'Simpan Perubahan' : 'Simpan Data'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 bg-[#071120]/65 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md bg-white dark:bg-[#0E1A2E] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5"
            >
              <div className="space-y-1.5">
                <h3 className="text-base font-extrabold text-[#173B65] dark:text-slate-100">
                  Konfirmasi Hapus Data
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Apakah Anda yakin ingin menghapus{' '}
                  <span className="font-bold text-[#173B65] dark:text-slate-200">
                    &ldquo;{deleteTarget.title}&rdquo;
                  </span>{' '}
                  dari {meta.title}? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={confirmDelete}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting && <Loader2 size={13} className="animate-spin" />}
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailItem && (
          <div className="fixed inset-0 z-50 bg-[#071120]/65 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="w-full max-w-xl bg-white dark:bg-[#0E1A2E] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-[#0072BC] dark:text-[#72C8F1]">
                    {meta.title}
                  </p>
                  <h3 className="text-lg font-extrabold text-[#173B65] dark:text-slate-100 leading-snug">
                    {detailItem.judulMateri ||
                      detailItem.judulTopik ||
                      detailItem.judulInovasi ||
                      detailItem.judul}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailItem(null)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-y border-slate-100 dark:border-slate-800 text-xs">
                {section === 'knowledge-sharing' && (
                  <>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Nama Pemateri</p>
                      <p className="font-bold text-[#173B65] dark:text-slate-100 mt-0.5">
                        {(detailItem.pemateriEmployeeId &&
                          employeeMap.get(detailItem.pemateriEmployeeId)?.fullName) ||
                          detailItem.namaPemateri}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Tanggal Pelaksanaan
                      </p>
                      <p className="font-bold text-[#173B65] dark:text-slate-100 mt-0.5">
                        {formatDate(detailItem.tanggalPelaksanaan)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Metode Pelaksanaan
                      </p>
                      <p className="font-bold text-[#173B65] dark:text-slate-100 mt-0.5">
                        {detailItem.metodePelaksanaan}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Lokasi Pelaksanaan
                      </p>
                      <p className="font-bold text-[#173B65] dark:text-slate-100 mt-0.5">
                        {detailItem.lokasiPelaksanaan}
                      </p>
                    </div>
                  </>
                )}

                {section === 'cop' && (
                  <>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Leader / Fasilitator
                      </p>
                      <p className="font-bold text-[#173B65] dark:text-slate-100 mt-0.5">
                        {detailItem.namaLeader}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Bidang</p>
                      <p className="font-bold text-[#173B65] dark:text-slate-100 mt-0.5">
                        {detailItem.bidang}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Tanggal</p>
                      <p className="font-bold text-[#173B65] dark:text-slate-100 mt-0.5">
                        {formatDate(detailItem.tanggalPelaksanaan)}
                      </p>
                    </div>
                    {detailItem.lokasi && (
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">Lokasi</p>
                        <p className="font-bold text-[#173B65] dark:text-slate-100 mt-0.5">
                          {detailItem.lokasi}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {section === 'inovasi' && (
                  <>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Kategori Inovasi
                      </p>
                      <p className="font-bold text-[#173B65] dark:text-slate-100 mt-0.5">
                        {detailItem.kategoriInovasi}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Tanggal</p>
                      <p className="font-bold text-[#173B65] dark:text-slate-100 mt-0.5">
                        {detailItem.tanggalPelaksanaan
                          ? formatDate(detailItem.tanggalPelaksanaan)
                          : '-'}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Nama Inovator
                      </p>
                      <ul className="space-y-1 text-xs font-bold text-[#173B65] dark:text-slate-100">
                        <li>1. {detailItem.inovator1 || '-'}</li>
                        {detailItem.inovator2 && <li>2. {detailItem.inovator2}</li>}
                        {detailItem.inovator3 && <li>3. {detailItem.inovator3}</li>}
                      </ul>
                    </div>
                  </>
                )}

                {(section === 'sop' ||
                  section === 'regulasi' ||
                  section === 'peraturan-direksi') && (
                  <>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Nomor Dokumen
                      </p>
                      <p className="font-mono font-bold text-[#173B65] dark:text-slate-100 mt-0.5">
                        {detailItem.nomorDokumen}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Tanggal Berlaku
                      </p>
                      <p className="font-bold text-[#173B65] dark:text-slate-100 mt-0.5">
                        {formatDate(detailItem.tanggalBerlaku)}
                      </p>
                    </div>
                    {(detailItem.bidang || detailItem.penerbit) && (
                      <div className="sm:col-span-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          {section === 'sop' ? 'Bidang / Unit' : 'Instansi / Penerbit'}
                        </p>
                        <p className="font-bold text-[#173B65] dark:text-slate-100 mt-0.5">
                          {detailItem.bidang || detailItem.penerbit}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {detailItem.ringkasan && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Ringkasan</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {detailItem.ringkasan}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                {(detailItem.evidenceUrl || detailItem.fileUrl) ? (
                  <StoredFileLink
                    url={detailItem.evidenceUrl || detailItem.fileUrl}
                    fileName={
                      detailItem.evidenceFileName ||
                      detailItem.fileName ||
                      detailItem.judulMateri ||
                      detailItem.judulInovasi ||
                      detailItem.judul
                    }
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0072BC] text-white rounded-xl text-xs font-bold hover:bg-[#173B65] transition-colors"
                  >
                    <FileText size={14} />
                    Buka / Unduh Berkas Lampiran
                  </StoredFileLink>
                ) : (
                  <span className="text-xs text-slate-400">Tidak ada lampiran berkas</span>
                )}

                <button
                  type="button"
                  onClick={() => setDetailItem(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KnowledgeGovernanceView;
