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
  Mail, 
  MapPin, 
  Calendar, 
  Phone, 
  CreditCard, 
  Award,
  Plus,
  Loader2,
  CheckCircle2,
  Trash2,
  FileText,
  Camera,
  BookOpen,
  Upload,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { differenceInYears } from 'date-fns';
import imageCompression from 'browser-image-compression';

const trainingSchema = z.object({
  namaPelatihan: z.string().min(1, "Nama pelatihan wajib diisi"),
  tanggalPelaksanaan: z.string().min(1, "Tanggal wajib diisi"),
  certificateUrl: z.any().optional(),
});

const certificationSchema = z.object({
  namaSertifikasi: z.string().min(1, "Nama sertifikasi wajib diisi"),
  tanggalPelaksanaan: z.string().min(1, "Tanggal wajib diisi"),
  masaBerlaku: z.string().min(1, "Masa berlaku wajib diisi"),
  certificateUrl: z.any().optional(),
});

const employeeSchema = z.object({
  fullName: z.string().min(1, "Nama lengkap wajib diisi"),
  nip: z.string().min(1, "NIP wajib diisi"),
  unitPelaksana: z.string().min(1, "Unit pelaksana wajib diisi"),
  subUnit: z.string().min(1, "Sub unit wajib diisi"),
  jabatanLengkap: z.string().min(1, "Jabatan lengkap wajib diisi"),
  personGrade: z.string().min(1, "Person grade wajib diisi"),
  positionGrade: z.string().min(1, "Position grade wajib diisi"),
  tanggalMasuk: z.string().min(1, "Tanggal masuk wajib diisi"),
  tanggalCalonPegawai: z.string().min(1, "Tanggal calon pegawai wajib diisi"),
  emailKorporat: z.string().email("Format email salah"),
  alamatLengkap: z.string().min(1, "Alamat wajib diisi"),
  tanggalLahir: z.string().min(1, "Tanggal lahir wajib diisi"),
  tanggalMulaiJabatan: z.string().min(1, "Tanggal mulai jabatan wajib diisi"),
  tanggalPengangkatan: z.string().min(1, "Tanggal pengangkatan wajib diisi"),
  tanggalBerakhirBekerja: z.string().optional(),
  tanggalPensiunNormal: z.string().min(1, "Tanggal pensiun wajib diisi"),
  jenisKelamin: z.enum(["Laki-laki", "Perempuan"]),
  agama: z.string().min(1, "Agama wajib diisi"),
  noTelepon: z.string().min(1, "Nomor telepon wajib diisi"),
  noNPWP: z.string().min(1, "Nomor NPWP wajib diisi"),
  noKTP: z.string().min(1, "Nomor KTP wajib diisi"),
  noBPJSKesehatan: z.string().min(1, "Nomor BPJS Kesehatan wajib diisi"),
  noBPJSKetenagakerjaan: z.string().min(1, "Nomor BPJS Ketenagakerjaan wajib diisi"),
  pendidikanTerakhir: z.string().min(1, "Pendidikan terakhir wajib diisi"),
  status: z.enum(["Pegawai Organik", "Pegawai Tugas Khusus", "Tenaga Alih Daya"]),
  perusahaan: z.enum([
    "PT PLN Nusantara Power", 
    "PT PLN (Persero)", 
    "PT PLN Paguntaka Cahaya Nusantara", 
    "PT Mitra Karya Prima"
  ]),
  photoUrl: z.any().optional(),
  dossierUrl: z.any().optional(),
  trainings: z.array(trainingSchema),
  certifications: z.array(certificationSchema),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  initialData?: Employee | null;
  onSuccess?: () => void;
  isProfileEdit?: boolean;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ initialData, onSuccess, isProfileEdit }) => {
  const { createEmployee, updateEmployee } = useEmployees();
  const [isSuccess, setIsSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: initialData ? {
      ...initialData,
      trainings: (initialData.trainings || []).map(t => ({ ...t, certificateUrl: (t.certificateUrl ? [t.certificateUrl] : []) })),
      certifications: (initialData.certifications || []).map(c => ({ ...c, certificateUrl: (c.certificateUrl ? [c.certificateUrl] : []) })),
      photoUrl: initialData.photoUrl ? [initialData.photoUrl] : [],
      dossierUrl: initialData.dossierUrl ? [initialData.dossierUrl] : [],
    } as any : {
      jenisKelamin: 'Laki-laki',
      status: 'Pegawai Organik',
      perusahaan: 'PT PLN Nusantara Power',
      trainings: [],
      certifications: [],
    }
  });

  const { fields: trainingFields, append: appendTraining, remove: removeTraining } = useFieldArray({
    control,
    name: "trainings",
  });

  const { fields: certFields, append: appendCert, remove: removeCert } = useFieldArray({
    control,
    name: "certifications",
  });

  // Automatic calculations
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

  const uploadFileWithProgress = async (file: File, path: string, label: string): Promise<string> => {
    let fileToUpload = file;
    
    // Compress if it's an image
    if (file.type.startsWith('image/')) {
      try {
        setUploadProgress(`Mengompresi ${label}...`);
        const options = {
          maxSizeMB: 0.3,
          maxWidthOrHeight: 800,
          useWebWorker: true,
          initialQuality: 0.6,
        };
        fileToUpload = await imageCompression(file, options);
      } catch (err) {
        console.error("Compression failed, using original:", err);
      }
    }

    const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(`Mengunggah ${label} (${progress}%)...`);
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
      let photoUrl = "";
      let dossierUrl = "";

      // Handle Photo Upload
      if (data.photoUrl && data.photoUrl[0] instanceof File) {
        photoUrl = await uploadFileWithProgress(data.photoUrl[0], 'photos', 'Foto Pegawai');
      }

      // Handle Dossier Upload
      if (data.dossierUrl && data.dossierUrl[0] instanceof File) {
        dossierUrl = await uploadFileWithProgress(data.dossierUrl[0], 'dossiers', 'Berkas Dossier');
      }

      // Handle Trainings Uploads
      const trainingsWithUrls = [];
      if (data.trainings) {
        for (let i = 0; i < data.trainings.length; i++) {
          const t = data.trainings[i];
          if (t.certificateUrl && t.certificateUrl[0] instanceof File) {
            const url = await uploadFileWithProgress(t.certificateUrl[0], 'certificates/trainings', `Sertifikat Pelatihan ${i + 1}`);
            trainingsWithUrls.push({ ...t, certificateUrl: url });
          } else {
            trainingsWithUrls.push({ ...t, certificateUrl: "" });
          }
        }
      }

      // Handle Certifications Uploads
      const certsWithUrls = [];
      if (data.certifications) {
        for (let i = 0; i < data.certifications.length; i++) {
          const c = data.certifications[i];
          if (c.certificateUrl && c.certificateUrl[0] instanceof File) {
            const url = await uploadFileWithProgress(c.certificateUrl[0], 'certificates/certs', `Sertifikat ${i + 1}`);
            certsWithUrls.push({ ...c, certificateUrl: url });
          } else {
            certsWithUrls.push({ ...c, certificateUrl: "" });
          }
        }
      }

      setUploadProgress("Menyimpan data pegawai...");
      
      const payload = {
        ...data,
        photoUrl: photoUrl || (typeof data.photoUrl?.[0] === 'string' ? data.photoUrl[0] : null),
        dossierUrl: dossierUrl || (typeof data.dossierUrl?.[0] === 'string' ? data.dossierUrl[0] : null),
        trainings: trainingsWithUrls.map((t, idx) => ({
          ...t,
          certificateUrl: t.certificateUrl || (typeof data.trainings?.[idx]?.certificateUrl?.[0] === 'string' ? data.trainings[idx].certificateUrl[0] : null)
        })),
        certifications: certsWithUrls.map((c, idx) => ({
          ...c,
          certificateUrl: c.certificateUrl || (typeof data.certifications?.[idx]?.certificateUrl?.[0] === 'string' ? data.certifications[idx].certificateUrl[0] : null)
        })),
      };

      if (initialData?.id) {
        await updateEmployee(initialData.id, payload as any);
      } else {
        await createEmployee(payload as any);
      }
      
      setIsSuccess(true);
      if (onSuccess) onSuccess();
      if (!initialData) reset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err: any) {
      console.error("Submission Error:", err);
      setFormError("Gagal menyimpan data. Pastikan koneksi internet stabil.");
    } finally {
      setUploadProgress(null);
    }
  };

  const onInvalid = (errors: any) => {
    console.error("Validation Errors:", errors);
    setFormError("Terdapat kolom yang belum diisi atau format salah. Silakan periksa kembali.");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const Section = ({ title, children, columns = 3 }: { title: string, children: React.ReactNode, columns?: number }) => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest whitespace-nowrap">{title}</h4>
        <div className="h-px bg-slate-100 w-full"></div>
      </div>
      <div className={cn(
        "grid grid-cols-1 gap-6",
        columns === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"
      )}>
        {children}
      </div>
    </div>
  );

  const InputField = ({ label, name, type = "text", error, options, placeholder, disabled }: any) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{label}</label>
      {options ? (
        <select 
          {...register(name)}
          disabled={disabled}
          className={cn(
            "px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-pln-blue outline-none transition-all font-semibold appearance-none disabled:opacity-60 disabled:bg-slate-100",
            error ? "ring-2 ring-red-300 border-red-300" : ""
          )}
        >
          {options.map((opt: any) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input 
          type={type}
          {...register(name)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-pln-blue outline-none transition-all font-semibold disabled:opacity-60 disabled:bg-slate-100",
            error ? "ring-2 ring-red-300 border-red-300" : ""
          )}
        />
      )}
      {error && <span className="text-[10px] text-red-500 font-bold uppercase tracking-tight px-1">{error.message}</span>}
    </div>
  );

  const FileUploadField = ({ label, name, error, accept, icon: Icon }: any) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{label}</label>
      <div className="relative group">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-pln-blue transition-colors" />
        <input 
          type="file"
          accept={accept}
          {...register(name)}
          className={cn(
            "w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-pln-blue outline-none transition-all font-bold text-slate-500 file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-black file:bg-pln-blue/10 file:text-pln-blue hover:file:bg-pln-blue/20 cursor-pointer",
            error ? "ring-2 ring-red-300 border-red-300" : ""
          )}
        />
      </div>
      {error && <span className="text-[10px] text-red-500 font-bold uppercase tracking-tight px-1">{error.message}</span>}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between bg-white px-8 py-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-pln-blue/10 rounded-xl flex items-center justify-center text-pln-blue">
            <User size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Input Data Pegawai</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Sistem Manajemen Personel Digital</p>
          </div>
        </div>
        <AnimatePresence>
          {isSuccess && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 text-xs font-bold uppercase tracking-widest shadow-sm"
            >
              <CheckCircle2 size={18} />
              Data Berhasil Disimpan
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 space-y-16">
        {formError && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold"
          >
            <AlertCircle size={20} />
            {formError}
          </motion.div>
        )}
        
        {uploadProgress && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
              <Loader2 size={48} className="text-pln-blue animate-spin" />
              <p className="text-sm font-black text-slate-800 uppercase tracking-widest">{uploadProgress}</p>
            </div>
          </div>
        )}

        <Section title="Data Personal & Kontak">
          <InputField label="Nama Lengkap" name="fullName" error={errors.fullName} placeholder="Contoh: Budi Santoso" disabled={isProfileEdit} />
          <InputField label="NIP" name="nip" error={errors.nip} placeholder="Nomor Induk Pegawai" disabled={isProfileEdit} />
          <InputField label="Jenis Kelamin" name="jenisKelamin" disabled={isProfileEdit} options={[
            { label: 'Laki-laki', value: 'Laki-laki' },
            { label: 'Perempuan', value: 'Perempuan' }
          ]} />
          <InputField label="Agama" name="agama" error={errors.agama} />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Tanggal Lahir" name="tanggalLahir" type="date" error={errors.tanggalLahir} disabled={isProfileEdit} />
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Umur (Otomatis)</label>
              <div className="px-4 py-3 bg-slate-100 rounded-xl text-sm font-black text-slate-600">{age} Tahun</div>
            </div>
          </div>
          <InputField label="Email Korporat" name="emailKorporat" type="email" error={errors.emailKorporat} placeholder="user@plnnusantarapower.co.id" disabled={isProfileEdit} />
          <InputField label="Nomor Telepon" name="noTelepon" error={errors.noTelepon} placeholder="0812xxxx" />
          <InputField label="Pendidikan Terakhir" name="pendidikanTerakhir" error={errors.pendidikanTerakhir} />
          <div className="lg:col-span-2">
            <InputField label="Alamat Lengkap" name="alamatLengkap" error={errors.alamatLengkap} />
          </div>
        </Section>

        <Section title="Data Kepegawaian & Jabatan">
          <InputField label="Jabatan Lengkap" name="jabatanLengkap" error={errors.jabatanLengkap} disabled={isProfileEdit} />
          <InputField label="Unit Pelaksana" name="unitPelaksana" error={errors.unitPelaksana} disabled={isProfileEdit} />
          <InputField label="Sub Unit" name="subUnit" error={errors.subUnit} disabled={isProfileEdit} />
          <InputField label="Person Grade" name="personGrade" error={errors.personGrade} disabled={isProfileEdit} />
          <InputField label="Position Grade" name="positionGrade" error={errors.positionGrade} disabled={isProfileEdit} />
          <InputField label="Status Pegawai" name="status" disabled={isProfileEdit} options={[
            { label: 'Pegawai Organik', value: 'Pegawai Organik' },
            { label: 'Pegawai Tugas Khusus', value: 'Pegawai Tugas Khusus' },
            { label: 'Tenaga Alih Daya', value: 'Tenaga Alih Daya' }
          ]} />
          <InputField label="Perusahaan" name="perusahaan" disabled={isProfileEdit} options={[
            { label: 'PT PLN Nusantara Power', value: 'PT PLN Nusantara Power' },
            { label: 'PT PLN (Persero)', value: 'PT PLN (Persero)' },
            { label: 'PT PLN Paguntaka Cahaya Nusantara', value: 'PT PLN Paguntaka Cahaya Nusantara' },
            { label: 'PT Mitra Karya Prima', value: 'PT Mitra Karya Prima' }
          ]} />
          <div className="grid grid-cols-2 gap-4">
             <InputField label="Tgl Pengangkatan" name="tanggalPengangkatan" type="date" error={errors.tanggalPengangkatan} disabled={isProfileEdit} />
             <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Masa Kerja</label>
               <div className="px-4 py-3 bg-slate-100 rounded-xl text-sm font-black text-slate-600">{tenure}</div>
             </div>
          </div>
        </Section>

        <Section title="Administrasi Tanggal">
          <InputField label="Tanggal Masuk" name="tanggalMasuk" type="date" error={errors.tanggalMasuk} disabled={isProfileEdit} />
          <InputField label="Tanggal CP" name="tanggalCalonPegawai" type="date" error={errors.tanggalCalonPegawai} disabled={isProfileEdit} />
          <InputField label="Tgl Mulai Jabatan" name="tanggalMulaiJabatan" type="date" error={errors.tanggalMulaiJabatan} disabled={isProfileEdit} />
          <InputField label="Tgl Pensiun Normal" name="tanggalPensiunNormal" type="date" error={errors.tanggalPensiunNormal} disabled={isProfileEdit} />
          <InputField label="Tgl Akhir Kerja" name="tanggalBerakhirBekerja" type="date" disabled={isProfileEdit} />
        </Section>

        <Section title="Identitas & Dokumen">
          <InputField label="Nomor KTP" name="noKTP" error={errors.noKTP} />
          <InputField label="Nomor NPWP" name="noNPWP" error={errors.noNPWP} />
          <InputField label="BPJS Kesehatan" name="noBPJSKesehatan" error={errors.noBPJSKesehatan} />
          <InputField label="BPJS Ketenagakerjaan" name="noBPJSKetenagakerjaan" error={errors.noBPJSKetenagakerjaan} />
          <FileUploadField label="Upload Foto Pegawai" name="photoUrl" error={errors.photoUrl} accept="image/*" icon={Camera} />
          <FileUploadField label="Upload Dossier (PDF/DOC)" name="dossierUrl" error={errors.dossierUrl} accept=".pdf,.doc,.docx" icon={FileText} />
        </Section>

        {/* History Pelatihan */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest whitespace-nowrap">Riwayat Pelatihan</h4>
              <div className="h-px bg-slate-100 w-full"></div>
            </div>
            <button 
              type="button"
              onClick={() => appendTraining({ namaPelatihan: '', tanggalPelaksanaan: '' })}
              className="ml-4 flex items-center gap-2 px-4 py-2 bg-pln-blue/10 text-pln-blue rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-pln-blue/20 transition-all"
            >
              <Plus size={14} /> Tambah
            </button>
          </div>
          <div className="space-y-4">
            {trainingFields.map((field, index) => (
              <motion.div 
                key={field.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl relative group border border-slate-100"
              >
                <div className="md:col-span-2">
                  <InputField label="Nama Pelatihan" name={`trainings.${index}.namaPelatihan`} error={errors.trainings?.[index]?.namaPelatihan} />
                </div>
                <InputField label="Tanggal" name={`trainings.${index}.tanggalPelaksanaan`} type="date" error={errors.trainings?.[index]?.tanggalPelaksanaan} />
                <div className="flex items-end gap-2">
                   <div className="flex-1">
                     <FileUploadField label="Upload Sertifikat" name={`trainings.${index}.certificateUrl`} error={errors.trainings?.[index]?.certificateUrl} accept=".pdf,.jpg,.jpeg,.png" icon={Upload} />
                   </div>
                   <button 
                    type="button"
                    onClick={() => removeTraining(index)}
                    className="p-3 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all mb-0.5"
                   >
                     <Trash2 size={18} />
                   </button>
                </div>
              </motion.div>
            ))}
            {trainingFields.length === 0 && (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <BookOpen size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Belum ada data pelatihan</p>
              </div>
            )}
          </div>
        </div>

        {/* History Sertifikasi */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest whitespace-nowrap">Riwayat Sertifikasi</h4>
              <div className="h-px bg-slate-100 w-full"></div>
            </div>
            <button 
              type="button"
              onClick={() => appendCert({ namaSertifikasi: '', tanggalPelaksanaan: '', masaBerlaku: '' })}
              className="ml-4 flex items-center gap-2 px-4 py-2 bg-pln-blue/10 text-pln-blue rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-pln-blue/20 transition-all"
            >
              <Plus size={14} /> Tambah
            </button>
          </div>
          <div className="space-y-4">
            {certFields.map((field, index) => (
              <motion.div 
                key={field.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-slate-50 rounded-2xl relative group border border-slate-100"
              >
                <div className="md:col-span-2">
                  <InputField label="Nama Sertifikasi" name={`certifications.${index}.namaSertifikasi`} error={errors.certifications?.[index]?.namaSertifikasi} />
                </div>
                <InputField label="Tanggal Terbit" name={`certifications.${index}.tanggalPelaksanaan`} type="date" error={errors.certifications?.[index]?.tanggalPelaksanaan} />
                <InputField label="Masa Berlaku" name={`certifications.${index}.masaBerlaku`} type="date" error={errors.certifications?.[index]?.masaBerlaku} />
                <div className="flex items-end gap-2">
                   <div className="flex-1">
                     <FileUploadField label="Upload Sertifikat" name={`certifications.${index}.certificateUrl`} error={errors.certifications?.[index]?.certificateUrl} accept=".pdf,.jpg,.jpeg,.png" icon={Upload} />
                   </div>
                   <button 
                    type="button"
                    onClick={() => removeCert(index)}
                    className="p-3 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all mb-0.5"
                   >
                     <Trash2 size={18} />
                   </button>
                </div>
              </motion.div>
            ))}
            {certFields.length === 0 && (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <Award size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Belum ada data sertifikasi</p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-pln-blue"></div>
               Review data sebelum klik simpan
             </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button 
              type="button" 
              onClick={() => reset()}
              className="flex-1 md:flex-none px-8 py-3.5 text-slate-400 rounded-2xl font-black text-xs uppercase hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
            >
              Reset Form
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-1 md:flex-none px-12 py-3.5 pln-gradient text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-blue-900/10 flex items-center justify-center gap-3 min-w-[280px]"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (
                <>
                  <CheckCircle2 size={18} />
                  Simpan Seluruh Data
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
