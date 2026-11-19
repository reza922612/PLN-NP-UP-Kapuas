import React, { useMemo, useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEmployees } from '../../hooks/useEmployees';
import { storage } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Employee } from '../../types';
import {
  User,
  UserPlus,
  Award,
  Plus,
  Loader2,
  CheckCircle2,
  Trash2,
  FileText,
  Camera,
  BookOpen,
  Upload,
  AlertCircle,
  RotateCcw,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { differenceInYears } from 'date-fns';
import imageCompression from 'browser-image-compression';
import { PageHeader, SectionCard } from '../common/DashboardUI';

const MAX_UPLOAD_SIZE_MB = 50;
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const isWithinMaxFileSize = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return true;
  const files = value as ArrayLike<unknown>;
  const firstFile = files[0];
  if (firstFile instanceof File) {
    return firstFile.size <= MAX_UPLOAD_SIZE_BYTES;
  }
  return true;
};

const optionalFile50MbSchema = z
  .any()
  .optional()
  .refine(isWithinMaxFileSize, {
    message: `Ukuran file melebihi batas maksimal ${MAX_UPLOAD_SIZE_MB} MB`,
  });

const trainingSchema = z.object({
  namaPelatihan: z.string().min(1, 'Nama pelatihan wajib diisi'),
  tanggalPelaksanaan: z.string().min(1, 'Tanggal wajib diisi'),
  certificateUrl: optionalFile50MbSchema,
});

const certificationSchema = z.object({
  namaSertifikasi: z.string().min(1, 'Nama sertifikasi wajib diisi'),
  tanggalPelaksanaan: z.string().min(1, 'Tanggal wajib diisi'),
  masaBerlaku: z.string().min(1, 'Masa berlaku wajib diisi'),
  certificateUrl: optionalFile50MbSchema,
});

const employeeSchema = z.object({
  fullName: z.string().min(1, 'Nama lengkap wajib diisi'),
  nip: z.string().min(1, 'NIP wajib diisi'),
  unitPelaksana: z.string().min(1, 'Unit pelaksana wajib diisi'),
  subUnit: z.string().min(1, 'Sub unit wajib diisi'),
  jabatanLengkap: z.string().min(1, 'Jabatan lengkap wajib diisi'),
  personGrade: z.string().min(1, 'Person grade wajib diisi'),
  positionGrade: z.string().min(1, 'Position grade wajib diisi'),
  tanggalMasuk: z.string().min(1, 'Tanggal masuk wajib diisi'),
  tanggalCalonPegawai: z.string().min(1, 'Tanggal calon pegawai wajib diisi'),
  emailKorporat: z.string().email('Format email salah'),
  alamatLengkap: z.string().min(1, 'Alamat wajib diisi'),
  tanggalLahir: z.string().min(1, 'Tanggal lahir wajib diisi'),
  tanggalMulaiJabatan: z.string().min(1, 'Tanggal mulai jabatan wajib diisi'),
  tanggalPengangkatan: z.string().min(1, 'Tanggal pengangkatan wajib diisi'),
  tanggalBerakhirBekerja: z.string().optional(),
  tanggalPensiunNormal: z.string().min(1, 'Tanggal pensiun wajib diisi'),
  jenisKelamin: z.enum(['Laki-laki', 'Perempuan']),
  agama: z.string().min(1, 'Agama wajib diisi'),
  noTelepon: z.string().min(1, 'Nomor telepon wajib diisi'),
  noNPWP: z.string().min(1, 'Nomor NPWP wajib diisi'),
  noKTP: z.string().min(1, 'Nomor KTP wajib diisi'),
  noBPJSKesehatan: z.string().min(1, 'Nomor BPJS Kesehatan wajib diisi'),
  noBPJSKetenagakerjaan: z.string().min(1, 'Nomor BPJS Ketenagakerjaan wajib diisi'),
  pendidikanTerakhir: z.string().min(1, 'Pendidikan terakhir wajib diisi'),
  status: z.enum(['Pegawai Organik', 'Pegawai Tugas Khusus', 'Tenaga Alih Daya']),
  perusahaan: z.enum([
    'PT PLN Nusantara Power',
    'PT PLN (Persero)',
    'PT PLN Paguntaka Cahaya Nusantara',
    'PT Mitra Karya Prima',
  ]),
  photoUrl: optionalFile50MbSchema,
  dossierUrl: optionalFile50MbSchema,
  trainings: z.array(trainingSchema),
  certifications: z.array(certificationSchema),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  initialData?: Employee | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  isProfileEdit?: boolean;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
  isProfileEdit,
}) => {
  const { createEmployee, updateEmployee } = useEmployees();
  const [isSuccess, setIsSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const isEditing = !!initialData?.id;

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    mode: 'onChange',
    defaultValues: initialData
      ? ({
          ...initialData,
          trainings: (initialData.trainings || []).map((t) => ({
            ...t,
            certificateUrl: t.certificateUrl ? [t.certificateUrl] : [],
          })),
          certifications: (initialData.certifications || []).map((c) => ({
            ...c,
            certificateUrl: c.certificateUrl ? [c.certificateUrl] : [],
          })),
          photoUrl: initialData.photoUrl ? [initialData.photoUrl] : [],
          dossierUrl: initialData.dossierUrl ? [initialData.dossierUrl] : [],
        } as any)
      : {
          jenisKelamin: 'Laki-laki',
          status: 'Pegawai Organik',
          perusahaan: 'PT PLN Nusantara Power',
          trainings: [],
          certifications: [],
        },
  });

  const {
    fields: trainingFields,
    append: appendTraining,
    remove: removeTraining,
  } = useFieldArray({ control, name: 'trainings' });

  const {
    fields: certFields,
    append: appendCert,
    remove: removeCert,
  } = useFieldArray({ control, name: 'certifications' });

  const birthDateValue = useWatch({ control, name: 'tanggalLahir' });
  const appointmentDateValue = useWatch({ control, name: 'tanggalPengangkatan' });

  const age = useMemo(() => {
    if (!birthDateValue) return '-';
    try {
      return differenceInYears(new Date(), new Date(birthDateValue));
    } catch {
      return '-';
    }
  }, [birthDateValue]);

  const tenure = useMemo(() => {
    if (!appointmentDateValue) return '-';
    try {
      const years = differenceInYears(new Date(), new Date(appointmentDateValue));
      return `${years} Tahun`;
    } catch {
      return '-';
    }
  }, [appointmentDateValue]);

  const uploadFileWithProgress = async (
    file: File,
    path: string,
    label: string
  ): Promise<string> => {
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new Error(
        `Ukuran ${label} (${formatFileSize(file.size)}) melebihi batas maksimal ${MAX_UPLOAD_SIZE_MB} MB.`
      );
    }

    let fileToUpload = file;
    // Compress moderately sized images to keep uploads snappy while preserving large/high-res uploads up to 50 MB
    if (
      file.type.startsWith('image/') &&
      file.size > 1.5 * 1024 * 1024 &&
      file.size <= 15 * 1024 * 1024
    ) {
      try {
        setUploadProgress(`Mengoptimalkan ${label}...`);
        fileToUpload = await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          initialQuality: 0.85,
        });
      } catch (err) {
        console.error('Compression failed, using original:', err);
      }
    }

    const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(
            `Mengunggah ${label} (${progress}% · ${formatFileSize(fileToUpload.size)})...`
          );
        },
        (error) => reject(error),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });
  };

  const onSubmit = async (data: EmployeeFormValues) => {
    setFormError(null);
    try {
      let photoUrl = '';
      let dossierUrl = '';

      if (data.photoUrl && data.photoUrl[0] instanceof File) {
        photoUrl = await uploadFileWithProgress(data.photoUrl[0], 'photos', 'Foto Pegawai');
      }

      if (data.dossierUrl && data.dossierUrl[0] instanceof File) {
        dossierUrl = await uploadFileWithProgress(data.dossierUrl[0], 'dossiers', 'Berkas Dossier');
      }

      const trainingsWithUrls = [];
      if (data.trainings) {
        for (let i = 0; i < data.trainings.length; i++) {
          const t = data.trainings[i];
          if (t.certificateUrl && t.certificateUrl[0] instanceof File) {
            const url = await uploadFileWithProgress(
              t.certificateUrl[0],
              'certificates/trainings',
              `Sertifikat Pelatihan ${i + 1}`
            );
            trainingsWithUrls.push({ ...t, certificateUrl: url });
          } else {
            trainingsWithUrls.push({ ...t, certificateUrl: '' });
          }
        }
      }

      const certsWithUrls = [];
      if (data.certifications) {
        for (let i = 0; i < data.certifications.length; i++) {
          const c = data.certifications[i];
          if (c.certificateUrl && c.certificateUrl[0] instanceof File) {
            const url = await uploadFileWithProgress(
              c.certificateUrl[0],
              'certificates/certs',
              `Sertifikat ${i + 1}`
            );
            certsWithUrls.push({ ...c, certificateUrl: url });
          } else {
            certsWithUrls.push({ ...c, certificateUrl: '' });
          }
        }
      }

      setUploadProgress('Menyimpan data pegawai...');

      const payload = {
        ...data,
        photoUrl: photoUrl || (typeof data.photoUrl?.[0] === 'string' ? data.photoUrl[0] : null),
        dossierUrl: dossierUrl || (typeof data.dossierUrl?.[0] === 'string' ? data.dossierUrl[0] : null),
        trainings: trainingsWithUrls.map((t, idx) => ({
          ...t,
          certificateUrl:
            t.certificateUrl ||
            (typeof data.trainings?.[idx]?.certificateUrl?.[0] === 'string'
              ? data.trainings[idx].certificateUrl[0]
              : null),
        })),
        certifications: certsWithUrls.map((c, idx) => ({
          ...c,
          certificateUrl:
            c.certificateUrl ||
            (typeof data.certifications?.[idx]?.certificateUrl?.[0] === 'string'
              ? data.certifications[idx].certificateUrl[0]
              : null),
        })),
      };

      if (initialData?.id) {
        await updateEmployee(initialData.id, payload as any);
      } else {
        await createEmployee(payload as any);
      }

      setIsSuccess(true);
      if (!initialData) reset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        setIsSuccess(false);
        if (onSuccess) onSuccess();
      }, 900);
    } catch (err: any) {
      console.error('Submission Error:', err);
      setFormError(
        err?.message && typeof err.message === 'string' && err.message.includes('MB')
          ? err.message
          : 'Gagal menyimpan data. Pastikan koneksi internet stabil, ukuran file maksimal 50 MB, dan seluruh data valid.'
      );
    } finally {
      setUploadProgress(null);
    }
  };

  const onInvalid = () => {
    setFormError('Terdapat kolom wajib yang belum diisi atau formatnya tidak sesuai. Periksa sorotan merah di bawah.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const InputField = ({
    label,
    name,
    type = 'text',
    error,
    options,
    placeholder,
    disabled,
    helper,
  }: any) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-0.5">
        {label}
      </label>
      {options ? (
        <select
          {...register(name)}
          disabled={disabled}
          className={cn(
            'px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] focus:bg-white dark:focus:bg-[#0E1A2E] outline-none transition-all font-semibold disabled:opacity-60',
            error && 'border-red-400 focus:ring-red-400'
          )}
        >
          {options.map((opt: any) => (
            <option key={opt.value} value={opt.value} className="dark:bg-slate-900">
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          {...register(name)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'px-3.5 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-[#173B65] dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-[#0072BC] focus:bg-white dark:focus:bg-[#0E1A2E] outline-none transition-all font-semibold disabled:opacity-60',
            error && 'border-red-400 focus:ring-red-400'
          )}
        />
      )}
      {helper && !error && <span className="text-[10px] text-slate-400 font-medium px-0.5">{helper}</span>}
      {error && (
        <span className="text-[11px] text-red-500 dark:text-red-400 font-semibold px-0.5">
          {error.message}
        </span>
      )}
    </div>
  );

  const FileUploadField = ({ label, name, error, accept, icon: Icon, helper }: any) => {
    const currentValue = watch(name);
    const selectedFile =
      currentValue && typeof currentValue === 'object' && currentValue[0] instanceof File
        ? (currentValue[0] as File)
        : null;

    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-0.5">
          {label}
        </label>
        <div className="relative">
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0072BC] dark:text-[#72C8F1]" />
          <input
            type="file"
            accept={accept}
            {...register(name)}
            className={cn(
              'w-full pl-10 pr-3 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#0072BC] outline-none transition-all font-semibold text-slate-600 dark:text-slate-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-[#EAF6FC] dark:file:bg-[#0072BC]/25 file:text-[#0072BC] dark:file:text-[#72C8F1] cursor-pointer',
              error && 'border-red-400'
            )}
          />
        </div>
        {selectedFile && !error && (
          <span className="text-[10px] text-[#0072BC] dark:text-[#72C8F1] font-semibold px-0.5 truncate">
            Terpilih: {selectedFile.name} ({formatFileSize(selectedFile.size)})
          </span>
        )}
        {helper && !error && (
          <span className="text-[10px] text-slate-400 font-medium px-0.5">{helper}</span>
        )}
        {error && (
          <span className="text-[11px] text-red-500 dark:text-red-400 font-semibold px-0.5">
            {error.message}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      <PageHeader
        title={isEditing ? `Edit Data Pegawai · ${initialData?.fullName}` : 'Input Data Pegawai Baru'}
        subtitle="Formulir terstruktur dengan validasi real-time dan unggahan berkas hingga 50 MB"
        icon={isEditing ? User : UserPlus}
        badge={isEditing ? `NIP ${initialData?.nip}` : 'Registrasi SDM'}
        actions={
          onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-slate-300"
            >
              <X size={14} />
              Batal
            </button>
          )
        }
      />

      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-3 text-xs font-bold"
          >
            <CheckCircle2 size={18} />
            <span>Data pegawai berhasil disimpan ke sistem SIMAP UP Kapuas.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {formError && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 flex items-center gap-3 text-xs font-bold">
          <AlertCircle size={18} className="shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {uploadProgress && (
        <div className="fixed inset-0 bg-[#071120]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="corporate-card p-8 flex flex-col items-center gap-4 max-w-xs w-full text-center">
            <Loader2 size={40} className="text-[#0072BC] dark:text-[#72C8F1] animate-spin" />
            <p className="text-xs font-extrabold text-[#173B65] dark:text-slate-100 uppercase tracking-wider">
              {uploadProgress}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        <SectionCard title="1. Data Personal & Kontak" subtitle="Identitas dasar dan informasi komunikasi pegawai">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <InputField
              label="Nama Lengkap"
              name="fullName"
              error={errors.fullName}
              placeholder="Contoh: Budi Santoso"
              disabled={isProfileEdit}
            />
            <InputField
              label="NIP"
              name="nip"
              error={errors.nip}
              placeholder="Nomor Induk Pegawai"
              disabled={isProfileEdit || isEditing}
              helper={isEditing ? 'NIP bersifat permanen setelah terdaftar' : undefined}
            />
            <InputField
              label="Jenis Kelamin"
              name="jenisKelamin"
              disabled={isProfileEdit}
              options={[
                { label: 'Laki-laki', value: 'Laki-laki' },
                { label: 'Perempuan', value: 'Perempuan' },
              ]}
            />
            <InputField label="Agama" name="agama" error={errors.agama} placeholder="Islam / Kristen / dll" />
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Tanggal Lahir"
                name="tanggalLahir"
                type="date"
                error={errors.tanggalLahir}
                disabled={isProfileEdit}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-0.5">
                  Usia (Otomatis)
                </label>
                <div className="px-3.5 py-2.5 bg-[#EAF6FC] dark:bg-slate-800 border border-[#72C8F1]/30 dark:border-slate-700 rounded-xl text-sm font-extrabold text-[#0072BC] dark:text-[#72C8F1] tabular-nums">
                  {age} Thn
                </div>
              </div>
            </div>
            <InputField
              label="Email Korporat"
              name="emailKorporat"
              type="email"
              error={errors.emailKorporat}
              placeholder="nama@plnnusantarapower.co.id"
              disabled={isProfileEdit}
            />
            <InputField
              label="Nomor Telepon"
              name="noTelepon"
              error={errors.noTelepon}
              placeholder="0812xxxx"
            />
            <InputField
              label="Pendidikan Terakhir"
              name="pendidikanTerakhir"
              error={errors.pendidikanTerakhir}
              placeholder="S1 Teknik Elektro / D3"
            />
            <div className="md:col-span-2 lg:col-span-1">
              <InputField
                label="Alamat Lengkap"
                name="alamatLengkap"
                error={errors.alamatLengkap}
                placeholder="Alamat domisili"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="2. Data Kepegawaian & Jabatan" subtitle="Penempatan unit, grade, dan afiliasi perusahaan">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <InputField label="Jabatan Lengkap" name="jabatanLengkap" error={errors.jabatanLengkap} disabled={isProfileEdit} />
            <InputField label="Unit Pelaksana" name="unitPelaksana" error={errors.unitPelaksana} disabled={isProfileEdit} />
            <InputField label="Sub Unit" name="subUnit" error={errors.subUnit} disabled={isProfileEdit} />
            <InputField label="Person Grade" name="personGrade" error={errors.personGrade} disabled={isProfileEdit} />
            <InputField label="Position Grade" name="positionGrade" error={errors.positionGrade} disabled={isProfileEdit} />
            <InputField
              label="Status Pegawai"
              name="status"
              disabled={isProfileEdit}
              options={[
                { label: 'Pegawai Organik', value: 'Pegawai Organik' },
                { label: 'Pegawai Tugas Khusus', value: 'Pegawai Tugas Khusus' },
                { label: 'Tenaga Alih Daya', value: 'Tenaga Alih Daya' },
              ]}
            />
            <InputField
              label="Perusahaan"
              name="perusahaan"
              disabled={isProfileEdit}
              options={[
                { label: 'PT PLN Nusantara Power', value: 'PT PLN Nusantara Power' },
                { label: 'PT PLN (Persero)', value: 'PT PLN (Persero)' },
                { label: 'PT PLN Paguntaka Cahaya Nusantara', value: 'PT PLN Paguntaka Cahaya Nusantara' },
                { label: 'PT Mitra Karya Prima', value: 'PT Mitra Karya Prima' },
              ]}
            />
            <div className="grid grid-cols-2 gap-3 md:col-span-2 lg:col-span-2">
              <InputField
                label="Tgl Pengangkatan"
                name="tanggalPengangkatan"
                type="date"
                error={errors.tanggalPengangkatan}
                disabled={isProfileEdit}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-0.5">
                  Masa Kerja (Otomatis)
                </label>
                <div className="px-3.5 py-2.5 bg-[#EAF6FC] dark:bg-slate-800 border border-[#72C8F1]/30 dark:border-slate-700 rounded-xl text-sm font-extrabold text-[#0072BC] dark:text-[#72C8F1] tabular-nums">
                  {tenure}
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="3. Administrasi Tanggal & Legalitas" subtitle="Kronologi masa kerja, nomor identitas resmi, dan unggahan berkas">
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <InputField label="Tanggal Masuk" name="tanggalMasuk" type="date" error={errors.tanggalMasuk} disabled={isProfileEdit} />
              <InputField label="Tanggal CP" name="tanggalCalonPegawai" type="date" error={errors.tanggalCalonPegawai} disabled={isProfileEdit} />
              <InputField label="Tgl Mulai Jabatan" name="tanggalMulaiJabatan" type="date" error={errors.tanggalMulaiJabatan} disabled={isProfileEdit} />
              <InputField label="Tgl Pensiun Normal" name="tanggalPensiunNormal" type="date" error={errors.tanggalPensiunNormal} disabled={isProfileEdit} />
              <InputField label="Tgl Akhir Kerja (Opsional)" name="tanggalBerakhirBekerja" type="date" disabled={isProfileEdit} />
            </div>

            <div className="pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <InputField label="Nomor KTP (NIK)" name="noKTP" error={errors.noKTP} />
              <InputField label="Nomor NPWP" name="noNPWP" error={errors.noNPWP} />
              <InputField label="BPJS Kesehatan" name="noBPJSKesehatan" error={errors.noBPJSKesehatan} />
              <InputField label="BPJS Ketenagakerjaan" name="noBPJSKetenagakerjaan" error={errors.noBPJSKetenagakerjaan} />
              <FileUploadField
                label="Foto Pegawai"
                name="photoUrl"
                error={errors.photoUrl}
                accept="image/*"
                icon={Camera}
                helper="Maksimal 50 MB · Format gambar (JPG, PNG, WEBP)"
              />
              <FileUploadField
                label="Berkas Dossier (PDF/DOC)"
                name="dossierUrl"
                error={errors.dossierUrl}
                accept=".pdf,.doc,.docx"
                icon={FileText}
                helper="Maksimal 50 MB · Format PDF, DOC, DOCX"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="4. Riwayat Pelatihan"
          subtitle="Daftar diklat dan pelatihan pengembangan kompetensi"
          icon={BookOpen}
          action={
            <button
              type="button"
              onClick={() => appendTraining({ namaPelatihan: '', tanggalPelaksanaan: '' })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1] rounded-xl text-xs font-bold hover:bg-[#0072BC] hover:text-white transition-colors"
            >
              <Plus size={14} /> Tambah Pelatihan
            </button>
          }
        >
          <div className="space-y-3">
            {trainingFields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-[#F4F8FB] dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800"
              >
                <div className="md:col-span-2">
                  <InputField
                    label="Nama Pelatihan"
                    name={`trainings.${index}.namaPelatihan`}
                    error={errors.trainings?.[index]?.namaPelatihan}
                  />
                </div>
                <InputField
                  label="Tanggal"
                  name={`trainings.${index}.tanggalPelaksanaan`}
                  type="date"
                  error={errors.trainings?.[index]?.tanggalPelaksanaan}
                />
                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <FileUploadField
                      label="Sertifikat"
                      name={`trainings.${index}.certificateUrl`}
                      error={errors.trainings?.[index]?.certificateUrl}
                      accept=".pdf,.jpg,.jpeg,.png"
                      icon={Upload}
                      helper="Maks. 50 MB · PDF, JPG, PNG"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTraining(index)}
                    className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                    title="Hapus Baris"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {trainingFields.length === 0 && (
              <p className="text-center py-6 text-xs font-medium text-slate-400">
                Belum ada entri pelatihan. Klik &ldquo;Tambah Pelatihan&rdquo; bila diperlukan.
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="5. Riwayat Sertifikasi Kompetensi"
          subtitle="Sertifikat keahlian resmi beserta masa berlakunya"
          icon={Award}
          action={
            <button
              type="button"
              onClick={() =>
                appendCert({ namaSertifikasi: '', tanggalPelaksanaan: '', masaBerlaku: '' })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1] rounded-xl text-xs font-bold hover:bg-[#0072BC] hover:text-white transition-colors"
            >
              <Plus size={14} /> Tambah Sertifikasi
            </button>
          }
        >
          <div className="space-y-3">
            {certFields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-[#F4F8FB] dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800"
              >
                <div className="md:col-span-2">
                  <InputField
                    label="Nama Sertifikasi"
                    name={`certifications.${index}.namaSertifikasi`}
                    error={errors.certifications?.[index]?.namaSertifikasi}
                  />
                </div>
                <InputField
                  label="Tgl Terbit"
                  name={`certifications.${index}.tanggalPelaksanaan`}
                  type="date"
                  error={errors.certifications?.[index]?.tanggalPelaksanaan}
                />
                <InputField
                  label="Masa Berlaku"
                  name={`certifications.${index}.masaBerlaku`}
                  type="date"
                  error={errors.certifications?.[index]?.masaBerlaku}
                />
                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <FileUploadField
                      label="Berkas"
                      name={`certifications.${index}.certificateUrl`}
                      error={errors.certifications?.[index]?.certificateUrl}
                      accept=".pdf,.jpg,.jpeg,.png"
                      icon={Upload}
                      helper="Maks. 50 MB · PDF, JPG, PNG"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCert(index)}
                    className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                    title="Hapus Baris"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {certFields.length === 0 && (
              <p className="text-center py-6 text-xs font-medium text-slate-400">
                Belum ada entri sertifikasi. Klik &ldquo;Tambah Sertifikasi&rdquo; bila diperlukan.
              </p>
            )}
          </div>
        </SectionCard>

        {/* Bottom Sticky-Style Action Bar */}
        <div className="corporate-card p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Pastikan seluruh data bertanda wajib telah diverifikasi sebelum menyimpan.
          </p>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
            )}
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs hover:border-[#0072BC] transition-colors"
            >
              <RotateCcw size={14} />
              Reset
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-7 py-2.5 pln-cta-gradient text-white rounded-xl font-extrabold text-xs uppercase tracking-wider shadow-md hover:brightness-105 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  {isEditing ? 'Simpan Perubahan' : 'Simpan Data Pegawai'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;
