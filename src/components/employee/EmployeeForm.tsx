import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEmployees } from '../../hooks/useEmployees';
import { FileCategory, uploadFileSmart } from '../../lib/fileStorage';
import { Employee } from '../../types';
import {
  User,
  UserPlus,
  Users,
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

const familyMemberSchema = z.object({
  nama: z.string().min(1, 'Nama anggota keluarga wajib diisi'),
  hubunganKeluarga: z.enum(['Istri/Suami', 'Anak Kandung']),
  tanggalLahir: z.string().min(1, 'Tanggal lahir wajib diisi'),
  jenisKelamin: z.enum(['Laki-laki', 'Perempuan']),
  jaminanKesehatan: z.enum(['Dijamin', 'Tidak Dijamin']),
  noKPS: z.string().optional(),
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
  familyMembers: z.array(familyMemberSchema),
  trainings: z.array(trainingSchema),
  certifications: z.array(certificationSchema),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

type FileUploadStatus = {
  status: 'optimizing' | 'uploading' | 'done' | 'error' | 'cancelled';
  progress: number;
  url?: string;
  error?: string;
};

type UploadCacheEntry = {
  promise: Promise<string>;
  controller: AbortController;
  cancelled: boolean;
  status: FileUploadStatus['status'];
  progress: number;
  url?: string;
};

interface InputFieldProps {
  label: string;
  name: any;
  register: any;
  type?: string;
  error?: any;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  disabled?: boolean;
  helper?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  name,
  register,
  type = 'text',
  error,
  options,
  placeholder,
  disabled,
  helper,
}) => (
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
        {options.map((opt) => (
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

interface FileUploadFieldProps {
  label: string;
  name: any;
  register: any;
  watch: any;
  uploadPath: string;
  uploadLabel: string;
  fileUploads: Map<File, FileUploadStatus>;
  onFileSelected: (file: File, path: string, label: string) => void;
  error?: any;
  accept: string;
  icon: React.ComponentType<{ className?: string }>;
  helper?: string;
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({
  label,
  name,
  register,
  watch,
  uploadPath,
  uploadLabel,
  fileUploads,
  onFileSelected,
  error,
  accept,
  icon: Icon,
  helper,
}) => {
  const currentValue = watch(name);
  const selectedFile =
    currentValue && typeof currentValue === 'object' && currentValue[0] instanceof File
      ? (currentValue[0] as File)
      : null;

  const uploadStatus = selectedFile ? fileUploads.get(selectedFile) : undefined;
  const registered = register(name);

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
          {...registered}
          onChange={(e) => {
            registered.onChange(e);
            const file = e.target.files?.[0];
            if (file && file.size <= MAX_UPLOAD_SIZE_BYTES) {
              onFileSelected(file, uploadPath, uploadLabel);
            }
          }}
          className={cn(
            'w-full pl-10 pr-3 py-2.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#0072BC] outline-none transition-all font-semibold text-slate-600 dark:text-slate-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-[#EAF6FC] dark:file:bg-[#0072BC]/25 file:text-[#0072BC] dark:file:text-[#72C8F1] cursor-pointer',
            error && 'border-red-400'
          )}
        />
      </div>
      {selectedFile && !error && (
        <div className="space-y-1 px-0.5">
          <div className="flex items-center justify-between gap-2 text-[10px]">
            <span className="text-[#0072BC] dark:text-[#72C8F1] font-semibold truncate">
              {selectedFile.name} ({formatFileSize(selectedFile.size)})
            </span>
            {uploadStatus?.status === 'done' && (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                <CheckCircle2 size={11} />
                Siap disimpan
              </span>
            )}
            {(uploadStatus?.status === 'optimizing' || uploadStatus?.status === 'uploading') && (
              <span className="inline-flex items-center gap-1 text-[#0072BC] dark:text-[#72C8F1] font-bold shrink-0">
                <Loader2 size={11} className="animate-spin" />
                {uploadStatus.status === 'optimizing'
                  ? 'Mengoptimalkan...'
                  : `${uploadStatus.progress}%`}
              </span>
            )}
            {(uploadStatus?.status === 'error' || uploadStatus?.status === 'cancelled') && (
              <button
                type="button"
                onClick={() => onFileSelected(selectedFile, uploadPath, uploadLabel)}
                className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold hover:underline shrink-0"
              >
                <RotateCcw size={10} />
                Coba Lagi
              </button>
            )}
          </div>
          {(uploadStatus?.status === 'optimizing' || uploadStatus?.status === 'uploading') && (
            <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0072BC] dark:bg-[#72C8F1] transition-all duration-200"
                style={{ width: `${Math.max(uploadStatus.progress, 6)}%` }}
              />
            </div>
          )}
          {uploadStatus?.status === 'error' && uploadStatus.error && (
            <span className="block text-[10px] text-red-500 dark:text-red-400 font-semibold">
              {uploadStatus.error}
            </span>
          )}
        </div>
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
  const { createEmployee, updateEmployee } = useEmployees(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isUploadingStep, setIsUploadingStep] = useState(false);
  const [fileUploads, setFileUploads] = useState<Map<File, FileUploadStatus>>(() => new Map());

  const uploadCacheRef = useRef<Map<File, UploadCacheEntry>>(new Map());
  const isMountedRef = useRef(true);

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
          familyMembers: (initialData.familyMembers || []).map((f) => ({
            nama: f.nama || '',
            hubunganKeluarga: f.hubunganKeluarga || 'Istri/Suami',
            tanggalLahir: f.tanggalLahir || '',
            jenisKelamin: f.jenisKelamin || 'Perempuan',
            jaminanKesehatan: f.jaminanKesehatan || 'Dijamin',
            noKPS: f.noKPS || '',
          })),
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
          familyMembers: [],
          trainings: [],
          certifications: [],
        },
  });

  const {
    fields: familyFields,
    append: appendFamily,
    remove: removeFamily,
  } = useFieldArray({ control, name: 'familyMembers' });

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

  const updateFileUploadUI = useCallback((file: File, next: FileUploadStatus) => {
    if (!isMountedRef.current) return;
    setFileUploads((prev) => {
      const copy = new Map(prev);
      copy.set(file, next);
      return copy;
    });
  }, []);

  const cancelAllActiveUploads = useCallback(() => {
    uploadCacheRef.current.forEach((entry, file) => {
      if (entry.status === 'optimizing' || entry.status === 'uploading') {
        entry.cancelled = true;
        entry.status = 'cancelled';
        entry.controller.abort();
        updateFileUploadUI(file, {
          status: 'cancelled',
          progress: entry.progress,
        });
      }
    });
  }, [updateFileUploadUI]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      uploadCacheRef.current.forEach((entry) => {
        if (entry.status === 'optimizing' || entry.status === 'uploading') {
          entry.cancelled = true;
          entry.controller.abort();
        }
      });
    };
  }, []);

  const startFileUpload = useCallback(
    (file: File, path: string, label: string): Promise<string> => {
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        return Promise.reject(
          new Error(
            `Ukuran ${label} (${formatFileSize(file.size)}) melebihi batas maksimal ${MAX_UPLOAD_SIZE_MB} MB.`
          )
        );
      }

      const existing = uploadCacheRef.current.get(file);
      if (
        existing &&
        !existing.cancelled &&
        (existing.status === 'optimizing' ||
          existing.status === 'uploading' ||
          existing.status === 'done')
      ) {
        return existing.promise;
      }

      const controller = new AbortController();
      const entry: UploadCacheEntry = {
        promise: Promise.resolve(''),
        controller,
        cancelled: false,
        status: 'optimizing',
        progress: 0,
      };
      uploadCacheRef.current.set(file, entry);

      const category: FileCategory =
        path === 'photos'
          ? 'photo'
          : path === 'dossiers'
          ? 'dossier'
          : path.includes('trainings')
          ? 'training_cert'
          : 'certification_cert';

      const promise = (async () => {
        try {
          let lastProgressTick = 0;
          const downloadUrl = await uploadFileSmart({
            file,
            fileName: file.name,
            storagePath: path,
            category,
            label,
            signal: controller.signal,
            onProgress: (pct, stage) => {
              entry.status = stage === 'optimizing' ? 'optimizing' : 'uploading';
              entry.progress = pct;
              const now = Date.now();
              if (pct === 100 || pct <= 5 || now - lastProgressTick >= 150) {
                lastProgressTick = now;
                updateFileUploadUI(file, {
                  status: entry.status,
                  progress: pct,
                });
              }
            },
          });

          entry.status = 'done';
          entry.progress = 100;
          entry.url = downloadUrl;
          updateFileUploadUI(file, { status: 'done', progress: 100, url: downloadUrl });
          return downloadUrl;
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : `Gagal mengunggah ${label}. Periksa koneksi internet Anda.`;
          if (!entry.cancelled) {
            entry.status = 'error';
            updateFileUploadUI(file, { status: 'error', progress: entry.progress, error: message });
          }
          throw err;
        }
      })();

      entry.promise = promise;
      return promise;
    },
    [updateFileUploadUI]
  );

  const handleReset = useCallback(() => {
    cancelAllActiveUploads();
    uploadCacheRef.current.clear();
    setFileUploads(new Map());
    setFormError(null);
    reset();
  }, [cancelAllActiveUploads, reset]);

  const onSubmit = async (data: EmployeeFormValues) => {
    setFormError(null);
    try {
      type PendingUpload = {
        file: File;
        path: string;
        label: string;
        assign: (url: string) => void;
      };

      const pendingUploads: PendingUpload[] = [];

      let resolvedPhotoUrl =
        typeof data.photoUrl?.[0] === 'string' ? (data.photoUrl[0] as string) : '';
      let resolvedDossierUrl =
        typeof data.dossierUrl?.[0] === 'string' ? (data.dossierUrl[0] as string) : '';

      if (data.photoUrl && data.photoUrl[0] instanceof File) {
        pendingUploads.push({
          file: data.photoUrl[0],
          path: 'photos',
          label: 'Foto Pegawai',
          assign: (url) => {
            resolvedPhotoUrl = url;
          },
        });
      }

      if (data.dossierUrl && data.dossierUrl[0] instanceof File) {
        pendingUploads.push({
          file: data.dossierUrl[0],
          path: 'dossiers',
          label: 'Berkas Dossier',
          assign: (url) => {
            resolvedDossierUrl = url;
          },
        });
      }

      const resolvedTrainings = (data.trainings || []).map((t, index) => {
        const existingUrl =
          typeof t.certificateUrl?.[0] === 'string' ? (t.certificateUrl[0] as string) : '';
        const nextTraining = { ...t, certificateUrl: existingUrl };
        if (t.certificateUrl && t.certificateUrl[0] instanceof File) {
          pendingUploads.push({
            file: t.certificateUrl[0],
            path: 'certificates/trainings',
            label: `Sertifikat Pelatihan ${index + 1}`,
            assign: (url) => {
              nextTraining.certificateUrl = url;
            },
          });
        }
        return nextTraining;
      });

      const resolvedCerts = (data.certifications || []).map((c, index) => {
        const existingUrl =
          typeof c.certificateUrl?.[0] === 'string' ? (c.certificateUrl[0] as string) : '';
        const nextCert = { ...c, certificateUrl: existingUrl };
        if (c.certificateUrl && c.certificateUrl[0] instanceof File) {
          pendingUploads.push({
            file: c.certificateUrl[0],
            path: 'certificates/certs',
            label: `Sertifikat ${index + 1}`,
            assign: (url) => {
              nextCert.certificateUrl = url;
            },
          });
        }
        return nextCert;
      });

      const incompleteCount = pendingUploads.filter((item) => {
        const cached = uploadCacheRef.current.get(item.file);
        return !cached || cached.status !== 'done';
      }).length;

      if (incompleteCount > 0) {
        setIsUploadingStep(true);
        setUploadProgress(
          `Mengunggah ${incompleteCount} berkas secara paralel...`
        );
      } else {
        setIsUploadingStep(false);
        setUploadProgress('Menyimpan data pegawai...');
      }

      if (pendingUploads.length > 0) {
        await Promise.all(
          pendingUploads.map(async (item) => {
            const url = await startFileUpload(item.file, item.path, item.label);
            item.assign(url);
          })
        );
      }

      setIsUploadingStep(false);
      setUploadProgress('Menyimpan data pegawai...');

      const payload = {
        ...data,
        photoUrl: resolvedPhotoUrl || null,
        dossierUrl: resolvedDossierUrl || null,
        familyMembers: (data.familyMembers || []).map((m) => ({
          nama: m.nama.trim(),
          hubunganKeluarga: m.hubunganKeluarga,
          tanggalLahir: m.tanggalLahir,
          jenisKelamin: m.jenisKelamin,
          jaminanKesehatan: m.jaminanKesehatan,
          noKPS: m.noKPS?.trim() || '',
        })),
        trainings: resolvedTrainings.map((t) => ({
          ...t,
          certificateUrl: t.certificateUrl || null,
        })),
        certifications: resolvedCerts.map((c) => ({
          ...c,
          certificateUrl: c.certificateUrl || null,
        })),
      };

      if (initialData?.id) {
        await updateEmployee(initialData.id, payload as any);
      } else {
        await createEmployee(payload as any);
      }

      uploadCacheRef.current.clear();
      setFileUploads(new Map());
      setIsSuccess(true);
      if (!initialData) reset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        setIsSuccess(false);
        if (onSuccess) onSuccess();
      }, 900);
    } catch (err: any) {
      console.error('Submission Error:', err);
      const errMsg = err?.message && typeof err.message === 'string' ? err.message : '';
      setFormError(
        errMsg.includes('MB') ||
          errMsg.includes('dibatalkan') ||
          errMsg.includes('terhenti') ||
          errMsg.includes('Waktu unggah')
          ? errMsg
          : 'Gagal menyimpan data. Pastikan koneksi internet stabil, ukuran file maksimal 50 MB, dan seluruh data valid.'
      );
    } finally {
      setIsUploadingStep(false);
      setUploadProgress(null);
    }
  };

  const onInvalid = () => {
    setFormError('Terdapat kolom wajib yang belum diisi atau formatnya tidak sesuai. Periksa sorotan merah di bawah.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            {isUploadingStep && (
              <button
                type="button"
                onClick={cancelAllActiveUploads}
                className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 rounded-xl text-[11px] font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
              >
                <X size={13} />
                Batalkan Unggahan
              </button>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        <SectionCard title="1. Data Personal & Kontak" subtitle="Identitas dasar dan informasi komunikasi pegawai">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <InputField
              label="Nama Lengkap"
              name="fullName"
              register={register}
              error={errors.fullName}
              placeholder="Contoh: Budi Santoso"
              disabled={isProfileEdit}
            />
            <InputField
              label="NIP"
              name="nip"
              register={register}
              error={errors.nip}
              placeholder="Nomor Induk Pegawai"
              disabled={isProfileEdit || isEditing}
              helper={isEditing ? 'NIP bersifat permanen setelah terdaftar' : undefined}
            />
            <InputField
              label="Jenis Kelamin"
              name="jenisKelamin"
              register={register}
              disabled={isProfileEdit}
              options={[
                { label: 'Laki-laki', value: 'Laki-laki' },
                { label: 'Perempuan', value: 'Perempuan' },
              ]}
            />
            <InputField label="Agama" name="agama" register={register} error={errors.agama} placeholder="Islam / Kristen / dll" />
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Tanggal Lahir"
                name="tanggalLahir"
                register={register}
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
              register={register}
              type="email"
              error={errors.emailKorporat}
              placeholder="nama@plnnusantarapower.co.id"
              disabled={isProfileEdit}
            />
            <InputField
              label="Nomor Telepon"
              name="noTelepon"
              register={register}
              error={errors.noTelepon}
              placeholder="0812xxxx"
            />
            <InputField
              label="Pendidikan Terakhir"
              name="pendidikanTerakhir"
              register={register}
              error={errors.pendidikanTerakhir}
              placeholder="S1 Teknik Elektro / D3"
            />
            <div className="md:col-span-2 lg:col-span-1">
              <InputField
                label="Alamat Lengkap"
                name="alamatLengkap"
                register={register}
                error={errors.alamatLengkap}
                placeholder="Alamat domisili"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="2. Data Kepegawaian & Jabatan" subtitle="Penempatan unit, grade, dan afiliasi perusahaan">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <InputField label="Jabatan Lengkap" name="jabatanLengkap" register={register} error={errors.jabatanLengkap} disabled={isProfileEdit} />
            <InputField label="Unit Pelaksana" name="unitPelaksana" register={register} error={errors.unitPelaksana} disabled={isProfileEdit} />
            <InputField label="Sub Unit" name="subUnit" register={register} error={errors.subUnit} disabled={isProfileEdit} />
            <InputField label="Person Grade" name="personGrade" register={register} error={errors.personGrade} disabled={isProfileEdit} />
            <InputField label="Position Grade" name="positionGrade" register={register} error={errors.positionGrade} disabled={isProfileEdit} />
            <InputField
              label="Status Pegawai"
              name="status"
              register={register}
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
              register={register}
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
                register={register}
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
              <InputField label="Tanggal Masuk" name="tanggalMasuk" register={register} type="date" error={errors.tanggalMasuk} disabled={isProfileEdit} />
              <InputField label="Tanggal CP" name="tanggalCalonPegawai" register={register} type="date" error={errors.tanggalCalonPegawai} disabled={isProfileEdit} />
              <InputField label="Tgl Mulai Jabatan" name="tanggalMulaiJabatan" register={register} type="date" error={errors.tanggalMulaiJabatan} disabled={isProfileEdit} />
              <InputField label="Tgl Pensiun Normal" name="tanggalPensiunNormal" register={register} type="date" error={errors.tanggalPensiunNormal} disabled={isProfileEdit} />
              <InputField label="Tgl Akhir Kerja (Opsional)" name="tanggalBerakhirBekerja" register={register} type="date" disabled={isProfileEdit} />
            </div>

            <div className="pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <InputField label="Nomor KTP (NIK)" name="noKTP" register={register} error={errors.noKTP} />
              <InputField label="Nomor NPWP" name="noNPWP" register={register} error={errors.noNPWP} />
              <InputField label="BPJS Kesehatan" name="noBPJSKesehatan" register={register} error={errors.noBPJSKesehatan} />
              <InputField label="BPJS Ketenagakerjaan" name="noBPJSKetenagakerjaan" register={register} error={errors.noBPJSKetenagakerjaan} />
              <FileUploadField
                label="Foto Pegawai"
                name="photoUrl"
                register={register}
                watch={watch}
                uploadPath="photos"
                uploadLabel="Foto Pegawai"
                fileUploads={fileUploads}
                onFileSelected={startFileUpload}
                error={errors.photoUrl}
                accept="image/*"
                icon={Camera}
                helper="Maksimal 50 MB · Otomatis dioptimalkan agar unggahan cepat"
              />
              <FileUploadField
                label="Berkas Dossier (PDF/DOC)"
                name="dossierUrl"
                register={register}
                watch={watch}
                uploadPath="dossiers"
                uploadLabel="Berkas Dossier"
                fileUploads={fileUploads}
                onFileSelected={startFileUpload}
                error={errors.dossierUrl}
                accept=".pdf,.doc,.docx"
                icon={FileText}
                helper="Maksimal 50 MB · Format PDF, DOC, DOCX"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="4. Data Keluarga"
          subtitle="Daftar anggota keluarga inti dan informasi jaminan kesehatan (KPS)"
          icon={Users}
          action={
            <button
              type="button"
              onClick={() =>
                appendFamily({
                  nama: '',
                  hubunganKeluarga: 'Istri/Suami',
                  tanggalLahir: '',
                  jenisKelamin: 'Perempuan',
                  jaminanKesehatan: 'Dijamin',
                  noKPS: '',
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1] rounded-xl text-xs font-bold hover:bg-[#0072BC] hover:text-white transition-colors"
            >
              <Plus size={14} /> Tambah Anggota Keluarga
            </button>
          }
        >
          <div className="space-y-3">
            {familyFields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 p-4 bg-[#F4F8FB] dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800"
              >
                <div className="lg:col-span-2">
                  <InputField
                    label="Nama"
                    name={`familyMembers.${index}.nama`}
                    register={register}
                    placeholder="Nama lengkap anggota keluarga"
                    error={errors.familyMembers?.[index]?.nama}
                  />
                </div>
                <InputField
                  label="Hubungan Keluarga"
                  name={`familyMembers.${index}.hubunganKeluarga`}
                  register={register}
                  error={errors.familyMembers?.[index]?.hubunganKeluarga}
                  options={[
                    { label: 'Istri/Suami', value: 'Istri/Suami' },
                    { label: 'Anak Kandung', value: 'Anak Kandung' },
                  ]}
                />
                <InputField
                  label="Tanggal Lahir"
                  name={`familyMembers.${index}.tanggalLahir`}
                  register={register}
                  type="date"
                  error={errors.familyMembers?.[index]?.tanggalLahir}
                />
                <InputField
                  label="Jenis Kelamin"
                  name={`familyMembers.${index}.jenisKelamin`}
                  register={register}
                  error={errors.familyMembers?.[index]?.jenisKelamin}
                  options={[
                    { label: 'Laki-laki', value: 'Laki-laki' },
                    { label: 'Perempuan', value: 'Perempuan' },
                  ]}
                />
                <InputField
                  label="Jaminan Kesehatan"
                  name={`familyMembers.${index}.jaminanKesehatan`}
                  register={register}
                  error={errors.familyMembers?.[index]?.jaminanKesehatan}
                  options={[
                    { label: 'Dijamin', value: 'Dijamin' },
                    { label: 'Tidak Dijamin', value: 'Tidak Dijamin' },
                  ]}
                />
                <div className="md:col-span-2 lg:col-span-6 flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <InputField
                      label="Nomor Kartu Pegawai Sehat (KPS)"
                      name={`familyMembers.${index}.noKPS`}
                      register={register}
                      placeholder="Masukkan nomor kartu KPS (opsional jika Tidak Dijamin)"
                      error={errors.familyMembers?.[index]?.noKPS}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFamily(index)}
                    className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors mb-0.5"
                    title="Hapus Anggota Keluarga"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {familyFields.length === 0 && (
              <p className="text-center py-6 text-xs font-medium text-slate-400">
                Belum ada data keluarga. Klik &ldquo;Tambah Anggota Keluarga&rdquo; untuk mengisi data Istri/Suami atau Anak Kandung.
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="5. Riwayat Pelatihan"
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
                    register={register}
                    error={errors.trainings?.[index]?.namaPelatihan}
                  />
                </div>
                <InputField
                  label="Tanggal"
                  name={`trainings.${index}.tanggalPelaksanaan`}
                  register={register}
                  type="date"
                  error={errors.trainings?.[index]?.tanggalPelaksanaan}
                />
                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <FileUploadField
                      label="Sertifikat"
                      name={`trainings.${index}.certificateUrl`}
                      register={register}
                      watch={watch}
                      uploadPath="certificates/trainings"
                      uploadLabel={`Sertifikat Pelatihan ${index + 1}`}
                      fileUploads={fileUploads}
                      onFileSelected={startFileUpload}
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
          title="6. Riwayat Sertifikasi Kompetensi"
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
                    register={register}
                    error={errors.certifications?.[index]?.namaSertifikasi}
                  />
                </div>
                <InputField
                  label="Tgl Terbit"
                  name={`certifications.${index}.tanggalPelaksanaan`}
                  register={register}
                  type="date"
                  error={errors.certifications?.[index]?.tanggalPelaksanaan}
                />
                <InputField
                  label="Masa Berlaku"
                  name={`certifications.${index}.masaBerlaku`}
                  register={register}
                  type="date"
                  error={errors.certifications?.[index]?.masaBerlaku}
                />
                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <FileUploadField
                      label="Berkas"
                      name={`certifications.${index}.certificateUrl`}
                      register={register}
                      watch={watch}
                      uploadPath="certificates/certs"
                      uploadLabel={`Sertifikat ${index + 1}`}
                      fileUploads={fileUploads}
                      onFileSelected={startFileUpload}
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
              onClick={handleReset}
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
