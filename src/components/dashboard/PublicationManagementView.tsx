import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Edit,
  Eye,
  FileText,
  Globe,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Megaphone,
  Newspaper,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  PUBLIC_PUBLICATION_CATEGORIES,
  PublicPublication,
  PublicPublicationCategory,
} from '../../types';
import {
  PublicPublicationInput,
  usePublicPublications,
} from '../../hooks/usePublicPublications';
import {
  formatFileSize,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_MB,
  uploadFileSmart,
} from '../../lib/fileStorage';
import { cn, formatDate } from '../../lib/utils';
import { PageHeader, SectionCard } from '../common/DashboardUI';
import { StoredFileLink, StoredImage } from '../common/StoredFileUI';

interface PublicationManagementViewProps {
  canManage: boolean;
  compactHeader?: boolean;
}

const getTodayIso = () => new Date().toISOString().split('T')[0];

const CATEGORY_ICON_MAP: Record<PublicPublicationCategory, React.ComponentType<{ size?: number; className?: string }>> = {
  Berita: Newspaper,
  Pengumuman: Megaphone,
  'Agenda Kegiatan TJSL': Calendar,
};

const PublicationManagementView: React.FC<PublicationManagementViewProps> = ({
  canManage,
  compactHeader = false,
}) => {
  const { publications, loading, savePublication, deletePublication } = usePublicPublications(true);

  const [categoryFilter, setCategoryFilter] = useState<'Semua' | PublicPublicationCategory>('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PublicPublication | null>(null);
  const [previewItem, setPreviewItem] = useState<PublicPublication | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PublicPublication | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form states
  const [kategori, setKategori] = useState<PublicPublicationCategory>('Berita');
  const [judul, setJudul] = useState('');
  const [tanggalKegiatan, setTanggalKegiatan] = useState(getTodayIso());
  const [lokasi, setLokasi] = useState('');
  const [penanggungJawab, setPenanggungJawab] = useState('');
  const [ringkasan, setRingkasan] = useState('');
  const [konten, setKonten] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageFileName, setImageFileName] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [attachmentFileName, setAttachmentFileName] = useState<string>('');
  const [isPublished, setIsPublished] = useState(true);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentUploadProgress, setAttachmentUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const resetForm = (defaultCat?: PublicPublicationCategory) => {
    setEditingItem(null);
    setKategori(
      defaultCat || (categoryFilter !== 'Semua' ? categoryFilter : 'Berita')
    );
    setJudul('');
    setTanggalKegiatan(getTodayIso());
    setLokasi('UP Kapuas, Kalimantan Barat');
    setPenanggungJawab('');
    setRingkasan('');
    setKonten('');
    setImageUrl('');
    setImageFileName('');
    setAttachmentUrl('');
    setAttachmentFileName('');
    setIsPublished(true);
    setFormError('');
  };

  const openCreateModal = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditModal = (item: PublicPublication) => {
    setEditingItem(item);
    setKategori(item.kategori);
    setJudul(item.judul);
    setTanggalKegiatan(item.tanggalKegiatan || getTodayIso());
    setLokasi(item.lokasi || '');
    setPenanggungJawab(item.penanggungJawab || '');
    setRingkasan(item.ringkasan || '');
    setKonten(item.konten || '');
    setImageUrl(item.imageUrl || '');
    setImageFileName(item.imageFileName || '');
    setAttachmentUrl(item.attachmentUrl || '');
    setAttachmentFileName(item.attachmentFileName || '');
    setIsPublished(item.isPublished !== false);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Berkas foto/banner harus berupa gambar (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setFormError(
        `Ukuran foto (${formatFileSize(file.size)}) melebihi batas maksimal ${MAX_UPLOAD_SIZE_MB} MB.`
      );
      return;
    }

    setFormError('');
    setUploadingImage(true);
    setImageUploadProgress(0);

    try {
      const url = await uploadFileSmart({
        file,
        fileName: file.name,
        storagePath: 'publications/images',
        category: 'publication_media',
        label: 'Foto Publikasi',
        onProgress: (pct) => setImageUploadProgress(pct),
      });
      setImageUrl(url);
      setImageFileName(file.name);
    } catch (err: any) {
      setFormError(err?.message || 'Gagal mengunggah foto kegiatan.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setFormError(
        `Ukuran lampiran (${formatFileSize(file.size)}) melebihi batas maksimal ${MAX_UPLOAD_SIZE_MB} MB.`
      );
      return;
    }

    setFormError('');
    setUploadingAttachment(true);
    setAttachmentUploadProgress(0);

    try {
      const url = await uploadFileSmart({
        file,
        fileName: file.name,
        storagePath: 'publications/attachments',
        category: 'publication_media',
        label: 'Lampiran Publikasi',
        onProgress: (pct) => setAttachmentUploadProgress(pct),
      });
      setAttachmentUrl(url);
      setAttachmentFileName(file.name);
    } catch (err: any) {
      setFormError(err?.message || 'Gagal mengunggah lampiran dokumen.');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadingImage || uploadingAttachment) return;

    if (!judul.trim() || !tanggalKegiatan.trim() || !lokasi.trim() || !ringkasan.trim() || !konten.trim()) {
      setFormError('Judul, Tanggal, Lokasi, Ringkasan, dan Isi Konten wajib diisi.');
      return;
    }

    setSaving(true);
    setFormError('');

    const payload: PublicPublicationInput = {
      kategori,
      judul: judul.trim(),
      tanggalKegiatan: tanggalKegiatan.trim(),
      lokasi: lokasi.trim(),
      ringkasan: ringkasan.trim(),
      konten: konten.trim(),
      penanggungJawab: penanggungJawab.trim() || null,
      imageUrl: imageUrl || null,
      imageFileName: imageFileName || null,
      attachmentUrl: attachmentUrl || null,
      attachmentFileName: attachmentFileName || null,
      isPublished,
    };

    try {
      await savePublication(payload, editingItem?.id);
      setIsFormOpen(false);
      showToast(
        editingItem
          ? `${kategori} berhasil diperbarui.`
          : `${kategori} baru berhasil disimpan${isPublished ? ' dan ditayangkan ke Landing Page' : ''}.`
      );
    } catch (err: any) {
      setFormError(err?.message || 'Gagal menyimpan publikasi.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePublication(deleteTarget);
      showToast(`${deleteTarget.kategori} "${deleteTarget.judul}" berhasil dihapus.`);
      setDeleteTarget(null);
    } catch (err: any) {
      showToast(err?.message || 'Gagal menghapus data publikasi.');
    } finally {
      setDeleting(false);
    }
  };

  const counts = useMemo(() => {
    return {
      all: publications.length,
      berita: publications.filter((p) => p.kategori === 'Berita').length,
      pengumuman: publications.filter((p) => p.kategori === 'Pengumuman').length,
      tjsl: publications.filter((p) => p.kategori === 'Agenda Kegiatan TJSL').length,
    };
  }, [publications]);

  const filteredPublications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return publications.filter((item) => {
      if (categoryFilter !== 'Semua' && item.kategori !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.judul.toLowerCase().includes(q) ||
        item.lokasi.toLowerCase().includes(q) ||
        item.ringkasan.toLowerCase().includes(q) ||
        (item.penanggungJawab || '').toLowerCase().includes(q) ||
        item.kategori.toLowerCase().includes(q)
      );
    });
  }, [publications, categoryFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {!compactHeader && (
        <PageHeader
          eyebrow="Publikasi & Informasi Publik"
          title="Berita, Pengumuman & Agenda Kegiatan TJSL"
          subtitle="Kelola konten Berita, Pengumuman, dan Agenda Kegiatan Tanggung Jawab Sosial & Lingkungan (TJSL) yang ditayangkan pada halaman Landing Page SIMAP."
          actions={
            canManage ? (
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2.5 bg-[#0072BC] hover:bg-[#005A96] text-white rounded-xl text-xs font-bold shadow-sm transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <Plus size={16} />
                Tambah Publikasi
              </button>
            ) : undefined
          }
        />
      )}

      {toastMessage && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-3">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage('')}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="corporate-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Publikasi
          </p>
          <p className="text-2xl font-extrabold text-[#173B65] dark:text-white font-mono tabular-nums mt-1">
            {counts.all}
          </p>
        </div>
        <div className="corporate-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Berita
          </p>
          <p className="text-2xl font-extrabold text-[#0072BC] dark:text-[#72C8F1] font-mono tabular-nums mt-1">
            {counts.berita}
          </p>
        </div>
        <div className="corporate-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Pengumuman
          </p>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-1">
            {counts.pengumuman}
          </p>
        </div>
        <div className="corporate-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Agenda Kegiatan TJSL
          </p>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1">
            {counts.tjsl}
          </p>
        </div>
      </div>

      {/* Filters & List */}
      <SectionCard
        title="Daftar Berita, Pengumuman & Agenda Kegiatan TJSL"
        subtitle="Publikasi dengan status Tayang otomatis tampil di Landing Page."
      >
        <div className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-fit overflow-x-auto max-w-full">
              {(['Semua', ...PUBLIC_PUBLICATION_CATEGORIES] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    'px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0',
                    categoryFilter === cat
                      ? 'bg-white dark:bg-[#0E1A2E] text-[#0072BC] dark:text-[#72C8F1] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-80">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul, lokasi, atau penanggung jawab..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-[#0072BC]"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center gap-3 text-xs font-semibold text-slate-400">
              <Loader2 size={18} className="animate-spin text-[#0072BC]" />
              <span>Memuat data publikasi...</span>
            </div>
          ) : filteredPublications.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Belum ada data {categoryFilter === 'Semua' ? 'publikasi' : categoryFilter}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Tambahkan Berita, Pengumuman, atau Agenda Kegiatan TJSL agar tampil secara langsung di bagian Informasi &amp; TJSL pada Landing Page.
              </p>
              {canManage && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="px-4 py-2 bg-[#0072BC] text-white rounded-xl text-xs font-bold hover:bg-[#005A96] inline-flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  Tambah Publikasi Pertama
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
              {filteredPublications.map((item) => {
                const IconComp = CATEGORY_ICON_MAP[item.kategori] || Newspaper;
                return (
                  <div
                    key={item.id}
                    className="py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      {item.imageUrl ? (
                        <div className="w-20 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0">
                          <StoredImage
                            src={item.imageUrl}
                            alt={item.judul}
                            className="w-full h-full object-cover"
                            fallback={
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <IconComp size={20} />
                              </div>
                            }
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center shrink-0">
                          <IconComp size={20} />
                        </div>
                      )}

                      <div className="min-w-0 space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-bold text-[#0072BC] dark:text-[#72C8F1]">
                            {item.kategori}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{formatDate(item.tanggalKegiatan)}</span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 truncate">
                            <MapPin size={12} />
                            {item.lokasi}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={cn(
                              'font-semibold',
                              item.isPublished
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            )}
                          >
                            {item.isPublished ? 'Tayang di Landing Page' : 'Draft Internal'}
                          </span>
                        </div>

                        <h4 className="text-sm font-extrabold text-[#173B65] dark:text-slate-100 leading-snug">
                          {item.judul}
                        </h4>

                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {item.ringkasan}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {item.penanggungJawab && (
                            <span>PIC / Bidang: {item.penanggungJawab}</span>
                          )}
                          {item.attachmentUrl && (
                            <StoredFileLink
                              url={item.attachmentUrl}
                              fileName={item.attachmentFileName || 'Lampiran'}
                              className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              <FileText size={12} />
                              {item.attachmentFileName || 'Buka Lampiran'}
                            </StoredFileLink>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                      <button
                        type="button"
                        onClick={() => setPreviewItem(item)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#0072BC] hover:text-[#0072BC] dark:hover:text-[#72C8F1] inline-flex items-center gap-1.5"
                      >
                        <Eye size={14} />
                        Detail
                      </button>

                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="px-3 py-2 rounded-xl bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-xs font-bold text-[#0072BC] dark:text-[#72C8F1] hover:bg-[#72C8F1]/25 inline-flex items-center gap-1.5"
                          >
                            <Edit size={14} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 inline-flex items-center gap-1.5"
                          >
                            <Trash2 size={14} />
                            Hapus
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SectionCard>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div
            className="fixed inset-0 z-50 bg-[#071120]/65 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => !saving && setIsFormOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white dark:bg-[#0E1A2E] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[#173B65] dark:text-white">
                    {editingItem ? `Edit ${editingItem.kategori}` : 'Tambah Berita / Pengumuman / Agenda TJSL'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Data publikasi aktif otomatis ditayangkan di Landing Page SIMAP.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                {formError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs font-bold text-red-600 dark:text-red-300">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Kategori Publikasi <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={kategori}
                      onChange={(e) => setKategori(e.target.value as PublicPublicationCategory)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-[#0072BC]"
                    >
                      {PUBLIC_PUBLICATION_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Tanggal Pelaksanaan / Rilis <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={tanggalKegiatan}
                      onChange={(e) => setTanggalKegiatan(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-[#0072BC]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Judul {kategori} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={300}
                    value={judul}
                    onChange={(e) => setJudul(e.target.value)}
                    placeholder={
                      kategori === 'Agenda Kegiatan TJSL'
                        ? 'Contoh: Program Penghijauan & Pemberdayaan Masyarakat Sekitar UP Kapuas'
                        : kategori === 'Pengumuman'
                        ? 'Contoh: Pemutakhiran Jadwal Sertifikasi Kompetensi Q4'
                        : 'Contoh: Sinergi Keandalan Pembangkit UP Kapuas Menjaga Pasokan Khatulistiwa'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-[#0072BC]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Lokasi / Unit Terkait <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={256}
                      value={lokasi}
                      onChange={(e) => setLokasi(e.target.value)}
                      placeholder="Contoh: UP Kapuas / Desa Sungai Raya"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-[#0072BC]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Penanggung Jawab / Bidang (Opsional)
                    </label>
                    <input
                      type="text"
                      maxLength={256}
                      value={penanggungJawab}
                      onChange={(e) => setPenanggungJawab(e.target.value)}
                      placeholder="Contoh: Bidang Business Support - SDM, Umum & CSR"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-[#0072BC]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Ringkasan Singkat <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    maxLength={600}
                    value={ringkasan}
                    onChange={(e) => setRingkasan(e.target.value)}
                    placeholder="Ringkasan singkat yang ditampilkan di daftar kartu Landing Page..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-[#0072BC]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Isi Lengkap {kategori} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    maxLength={5000}
                    value={konten}
                    onChange={(e) => setKonten(e.target.value)}
                    placeholder="Tuliskan isi berita, detail pengumuman, atau rincian agenda kegiatan TJSL..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-[#0072BC]"
                  />
                </div>

                {/* Upload Foto / Banner + Upload Lampiran */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <ImageIcon size={14} className="text-[#0072BC]" />
                        Foto / Banner (Opsional)
                      </span>
                      {imageUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setImageUrl('');
                            setImageFileName('');
                          }}
                          className="text-[11px] font-bold text-red-500 hover:underline"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                    <label className="block cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                      <div className="px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-center text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:border-[#0072BC] transition-colors">
                        {uploadingImage
                          ? `Mengunggah foto ${imageUploadProgress}%...`
                          : imageFileName
                          ? `Terunggah: ${imageFileName}`
                          : `Pilih Foto (maks ${MAX_UPLOAD_SIZE_MB} MB)`}
                      </div>
                    </label>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Upload size={14} className="text-[#0072BC]" />
                        Lampiran Dokumen (Opsional)
                      </span>
                      {attachmentUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setAttachmentUrl('');
                            setAttachmentFileName('');
                          }}
                          className="text-[11px] font-bold text-red-500 hover:underline"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                    <label className="block cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleAttachmentUpload}
                        disabled={uploadingAttachment}
                      />
                      <div className="px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-center text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:border-[#0072BC] transition-colors">
                        {uploadingAttachment
                          ? `Mengunggah berkas ${attachmentUploadProgress}%...`
                          : attachmentFileName
                          ? `Terunggah: ${attachmentFileName}`
                          : `Pilih Dokumen/PDF (maks ${MAX_UPLOAD_SIZE_MB} MB)`}
                      </div>
                    </label>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#0072BC]"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5">
                    <Globe size={14} className="text-[#0072BC]" />
                    Tampilkan secara publik di halaman Landing Page
                  </span>
                </label>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploadingImage || uploadingAttachment}
                    className="px-5 py-2.5 bg-[#0072BC] hover:bg-[#005A96] disabled:opacity-60 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2"
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    {editingItem ? 'Simpan Perubahan' : 'Simpan & Terbitkan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Detail Modal */}
      <AnimatePresence>
        {previewItem && (
          <div
            className="fixed inset-0 z-50 bg-[#071120]/65 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setPreviewItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white dark:bg-[#0E1A2E] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-[#0072BC] dark:text-[#72C8F1]">
                      {previewItem.kategori}
                    </span>{' '}
                    · {formatDate(previewItem.tanggalKegiatan)} · {previewItem.lokasi}
                  </p>
                  <h3 className="text-xl font-extrabold text-[#173B65] dark:text-white leading-snug">
                    {previewItem.judul}
                  </h3>
                  {previewItem.penanggungJawab && (
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Penanggung Jawab: {previewItem.penanggungJawab}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>

              {previewItem.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-72 bg-slate-100 dark:bg-slate-900">
                  <StoredImage
                    src={previewItem.imageUrl}
                    alt={previewItem.judul}
                    className="w-full h-full max-h-72 object-cover"
                    fallback={
                      <div className="py-10 flex items-center justify-center text-slate-400">
                        <Sparkles size={24} />
                      </div>
                    }
                  />
                </div>
              )}

              <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {previewItem.konten}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                {previewItem.attachmentUrl ? (
                  <StoredFileLink
                    url={previewItem.attachmentUrl}
                    fileName={previewItem.attachmentFileName || 'Lampiran Publikasi'}
                    className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold hover:underline inline-flex items-center gap-1.5"
                  >
                    <FileText size={14} />
                    {previewItem.attachmentFileName || 'Unduh / Lihat Lampiran'}
                  </StoredFileLink>
                ) : (
                  <span className="text-xs text-slate-400">Tidak ada lampiran dokumen</span>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div
            className="fixed inset-0 z-50 bg-[#071120]/65 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => !deleting && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-[#0E1A2E] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
            >
              <h3 className="text-base font-extrabold text-[#173B65] dark:text-white">
                Hapus {deleteTarget.kategori}?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Anda akan menghapus <strong className="text-slate-900 dark:text-white">{deleteTarget.judul}</strong>. Item ini akan langsung dihapus dari daftar dan Landing Page.
              </p>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                >
                  {deleting && <Loader2 size={14} className="animate-spin" />}
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicationManagementView;
