import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Building2, 
  MapPin, 
  Zap, 
  Plus, 
  Trash2, 
  Save, 
  Camera, 
  Loader2,
  AlertCircle,
  Hash,
  Activity,
  Cpu,
  Settings2,
  Network,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useUnits } from '../../hooks/useUnits';
import { Unit } from '../../types';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { storage } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import imageCompression from 'browser-image-compression';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

const machineSchema = z.object({
  namaMesin: z.string().min(1, "Nama mesin wajib diisi"),
  typeMesin: z.string().min(1, "Type mesin wajib diisi"),
  nomorSeri: z.string().min(1, "Nomor seri wajib diisi"),
  dayaMampuNominal: z.coerce.number().min(0),
  bebanPuncak: z.coerce.number().min(0),
  jenisMesin: z.string().min(1),
  sistem: z.string().min(1),
});

const unitSchema = z.object({
  namaUnitLayananPusatListrik: z.string().min(1, "Nama unit wajib diisi"),
  alamatLengkap: z.string().min(1, "Alamat wajib diisi"),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  mesin: z.array(machineSchema),
  photoUrl: z.any().optional(),
});

type UnitFormValues = z.infer<typeof unitSchema>;

const UnitManagement: React.FC = () => {
  const { units, loading, createUnit, deleteUnit } = useUnits();
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema) as any,
    defaultValues: {
      namaUnitLayananPusatListrik: '',
      alamatLengkap: '',
      latitude: -1.7161,
      longitude: 109.5891,
      mesin: [{ namaMesin: '', typeMesin: '', nomorSeri: '', dayaMampuNominal: 0, bebanPuncak: 0, jenisMesin: 'PLTD', sistem: 'Sistem Khatulistiwa' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "mesin"
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setLoadingStatus('Menyiapkan data...');
    try {
      const formData = data as UnitFormValues;
      let photoUrl = '';
      
      if (formData.photoUrl && formData.photoUrl[0] instanceof File) {
        setLoadingStatus('Mengompresi gambar...');
        const file = formData.photoUrl[0];
        
        // Faster compression settings
        const options = {
          maxSizeMB: 0.3, // Reduced from 0.8
          maxWidthOrHeight: 800, // Reduced from 1280
          useWebWorker: true,
          initialQuality: 0.6,
        };
        
        try {
          const compressedFile = await imageCompression(file, options);
          setLoadingStatus('Mengunggah gambar (0%)...');
          const storageRef = ref(storage, `units/${Date.now()}_${file.name}`);
          
          const uploadTask = uploadBytesResumable(storageRef, compressedFile);
          
          await new Promise((resolve, reject) => {
            uploadTask.on('state_changed', 
              (snapshot) => {
                const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                setLoadingStatus(`Mengunggah gambar (${progress}%)...`);
              }, 
              (error) => reject(error), 
              () => resolve(true)
            );
          });
          
          photoUrl = await getDownloadURL(storageRef);
        } catch (compressionError) {
          console.error("Upload failed:", compressionError);
          setLoadingStatus('Gagal mengunggah gambar. Mencoba tanpa foto...');
        }
      }

      setLoadingStatus('Menyimpan ke database...');
      await createUnit({
        ...formData,
        photoUrl: photoUrl || null,
      } as any);

      setIsAdding(false);
      reset();
      setPhotoPreview(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  const InputField = ({ label, name, type = "text", placeholder, error, icon: Icon }: any) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>
      <div className="relative group">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-pln-blue transition-colors" />}
        <input 
          type={type}
          {...register(name)}
          placeholder={placeholder}
          className={cn(
            "w-full pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-pln-blue outline-none transition-all font-bold text-slate-600",
            Icon ? "pl-12" : "px-4",
            error ? "ring-2 ring-red-300 border-red-300" : ""
          )}
        />
      </div>
      {error && <span className="text-[9px] text-red-500 font-bold uppercase tracking-tight px-1">{error.message}</span>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
          <Building2 size={24} className="text-pln-blue" />
          Unit Layanan Pusat Listrik
        </h3>
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            if (!isAdding) reset();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-pln-blue text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:scale-105 transition-transform"
        >
          {isAdding ? 'Batal' : <><Plus size={16} /> Tambah Unit</>}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <InputField 
                  label="Nama Unit Layanan Pusat Listrik" 
                  name="namaUnitLayananPusatListrik" 
                  icon={Building2} 
                  placeholder="Contoh: ULPLTD Kapuas"
                  error={errors.namaUnitLayananPusatListrik}
                />
                 <InputField 
                  label="Alamat Lengkap" 
                  name="alamatLengkap" 
                  icon={MapPin} 
                  placeholder="Jl. Merdeka No. 1..."
                  error={errors.alamatLengkap}
                />
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Latitude" name="latitude" type="number" placeholder="Lat" error={errors.latitude} />
                  <InputField label="Longitude" name="longitude" type="number" placeholder="Lng" error={errors.longitude} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Informasi Mesin Pembangkit</h4>
                  <button 
                    type="button"
                    onClick={() => append({ namaMesin: '', typeMesin: '', nomorSeri: '', dayaMampuNominal: 0, bebanPuncak: 0, jenisMesin: 'PLTD', sistem: 'Sistem Khatulistiwa' })}
                    className="flex items-center gap-1.5 text-[10px] font-black text-pln-blue uppercase hover:bg-pln-blue/5 px-2 py-1 rounded-md transition-colors"
                  >
                    <Plus size={14} /> Tambah Mesin
                  </button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <motion.div 
                      key={field.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative"
                    >
                      <button 
                        type="button" 
                        onClick={() => remove(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-white shadow-sm border border-slate-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                      <InputField label="Nama Mesin" name={`mesin.${index}.namaMesin`} placeholder="Contoh: Caterpillar v12" error={errors.mesin?.[index]?.namaMesin} />
                      <InputField label="Type Mesin" name={`mesin.${index}.typeMesin`} placeholder="3516B" error={errors.mesin?.[index]?.typeMesin} />
                      <InputField label="Nomor Seri" name={`mesin.${index}.nomorSeri`} placeholder="S/N: 12345" error={errors.mesin?.[index]?.nomorSeri} />
                      <div className="grid grid-cols-2 gap-2">
                        <InputField label="Daya Mampu (KW)" name={`mesin.${index}.dayaMampuNominal`} type="number" error={errors.mesin?.[index]?.dayaMampuNominal} />
                        <InputField label="Beban Puncak (KW)" name={`mesin.${index}.bebanPuncak`} type="number" error={errors.mesin?.[index]?.bebanPuncak} />
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Jenis Mesin</label>
                        <select 
                          {...register(`mesin.${index}.jenisMesin`)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-pln-blue outline-none transition-all font-bold text-slate-600 appearance-none"
                        >
                          <option value="PLTD">PLTD (Diesel)</option>
                          <option value="PLTG">PLTG (Gas)</option>
                          <option value="PLTU">PLTU (Uap)</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Sistem Kelistrikan</label>
                        <select 
                          {...register(`mesin.${index}.sistem`)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-pln-blue outline-none transition-all font-bold text-slate-600 appearance-none"
                        >
                          <option value="Sistem Khatulistiwa">Sistem Khatulistiwa</option>
                          <option value="Sistem Ketapang">Sistem Ketapang</option>
                          <option value="Sistem Putusibau">Sistem Putusibau</option>
                        </select>
                      </div>
                    </motion.div>
                  ))}
                  {fields.length === 0 && (
                    <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Belum ada data mesin. Silakan tambah mesin.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6 items-end justify-between pt-4">
                <div className="w-full md:w-64">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1 mb-1.5">Foto Unit</label>
                   <div className="relative h-24 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center p-2 group overflow-hidden">
                      {photoPreview ? (
                        <img src={photoPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <>
                          <Camera size={24} className="text-slate-200 group-hover:text-pln-blue transition-colors" />
                          <span className="text-[8px] font-black text-slate-300 uppercase mt-1">Ganti Foto</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        {...register('photoUrl')}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setPhotoPreview(URL.createObjectURL(file));
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                   </div>
                </div>

                <div className="flex gap-3">
                   <button 
                    type="button"
                    onClick={() => { setIsAdding(false); reset(); }}
                    className="px-8 py-3 bg-slate-100 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="px-12 py-3 bg-pln-blue text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>{loadingStatus || 'Memproses...'}</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Simpan Unit & Mesin</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-1 gap-8">
        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Unit Layanan Terdaftar</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {units.length === 0 && !loading && (
               <div className="col-span-full bg-white p-24 rounded-3xl border border-dashed border-slate-200 text-center space-y-4">
                 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <Building2 size={40} className="text-slate-200" />
                 </div>
                 <p className="text-sm font-black text-slate-300 uppercase tracking-widest">Belum ada unit terdaftar</p>
               </div>
            )}
            {units.map(unit => (
              <motion.div 
                key={unit.id}
                layout
                className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden group hover:border-pln-blue transition-all"
              >
                <div className="flex p-6 gap-6">
                  <div className="w-32 h-32 rounded-2xl bg-slate-50 overflow-hidden shrink-0 relative shadow-inner ring-1 ring-slate-100">
                    {unit.photoUrl ? (
                      <img src={unit.photoUrl} alt={unit.namaUnitLayananPusatListrik} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="absolute inset-0 m-auto text-slate-200" size={40} />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{unit.namaUnitLayananPusatListrik}</h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold mt-1">
                          <MapPin size={12} className="text-pln-blue" />
                          {unit.alamatLengkap}
                        </div>
                      </div>
                      <button 
                        onClick={() => unit.id && deleteUnit(unit.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Mesin</p>
                         <p className="text-sm font-black text-slate-700">{unit.mesin?.length || 0} Unit</p>
                      </div>
                      <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100/50">
                         <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Total DMN</p>
                         <p className="text-sm font-black text-pln-blue">
                           {unit.mesin?.reduce((acc, m) => acc + (Number(m.dayaMampuNominal) || 0), 0)} <span className="text-[10px]">KW</span>
                         </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => setExpandedUnit(expandedUnit === unit.id ? null : unit.id || null)}
                      className="mt-4 flex items-center justify-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-pln-blue transition-colors group/btn"
                    >
                      {expandedUnit === unit.id ? <><ChevronUp size={14} /> Tutup Detail Mesin</> : <><ChevronDown size={14} /> Lihat Detail Mesin</>}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedUnit === unit.id && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-50 bg-slate-50/30 p-6 overflow-hidden"
                    >
                      <div className="space-y-3">
                        {unit.mesin?.map((m, idx) => (
                           <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-pln-blue/5 flex items-center justify-center text-pln-blue">
                                 <Cpu size={16} />
                               </div>
                               <div>
                                 <p className="text-[10px] font-black text-slate-800 uppercase">{m.namaMesin}</p>
                                 <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">{m.typeMesin} • {m.nomorSeri}</p>
                               </div>
                             </div>
                             <div className="flex gap-4">
                                <div className="text-right">
                                  <p className="text-[8px] font-black text-slate-400 uppercase">SISTEM</p>
                                  <p className="text-[9px] font-black text-pln-blue uppercase">{m.sistem}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[8px] font-black text-slate-400 uppercase">DMN/BP</p>
                                  <p className="text-[9px] font-black text-slate-700 uppercase">{m.dayaMampuNominal}/{m.bebanPuncak} KW</p>
                                </div>
                                <div className="px-2 py-1 bg-slate-100 rounded text-[8px] font-black text-slate-500 self-center">
                                  {m.jenisMesin}
                                </div>
                             </div>
                           </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-amber-50 rounded-xl">
                 <MapPin className="text-amber-500" size={20} />
               </div>
               <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Pemetaan Unit Layanan</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Visualisasi Geografis Pembangkit</p>
               </div>
             </div>
          </div>
          <div className="h-[500px]">
           {!API_KEY && (
             <div className="absolute inset-0 z-10 bg-slate-900/10 backdrop-blur-[2px] flex flex-col items-center justify-center p-8 text-center space-y-4">
               <div className="p-4 bg-white rounded-3xl shadow-xl flex flex-col items-center gap-4 max-w-xs ring-4 ring-slate-100">
                 <AlertCircle size={40} className="text-amber-500" />
                 <p className="text-slate-800 text-[10px] font-black uppercase tracking-widest leading-relaxed">Google Maps API Key Diperlukan untuk menampilkan Peta</p>
                 <button className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Cara Mendapatkan Key</button>
               </div>
             </div>
           )}
           {API_KEY && (
             <APIProvider apiKey={API_KEY} version="weekly">
               <Map
                 defaultCenter={{lat: -1.7161, lng: 109.5891}}
                 defaultZoom={9}
                 mapId="DEMO_MAP_ID"
                 internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                 style={{width: '100%', height: '100%'}}
                 gestureHandling={'greedy'}
                 disableDefaultUI={true}
               >
                 {units.map(unit => (
                   unit.latitude && unit.longitude && (
                     <AdvancedMarker 
                      key={unit.id} 
                      position={{lat: Number(unit.latitude), lng: Number(unit.longitude)}}
                      title={unit.namaUnitLayananPusatListrik}
                     >
                       <Pin background="#005DAA" glyphColor="#fff" borderColor="#005DAA" />
                     </AdvancedMarker>
                   )
                 ))}
               </Map>
             </APIProvider>
           )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnitManagement;
