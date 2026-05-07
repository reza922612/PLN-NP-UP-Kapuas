import React from 'react';
import { Employee } from '../../types';
import { 
  Mail, 
  MapPin, 
  Phone, 
  Award,
  ArrowLeft,
  Briefcase,
  User,
  ShieldCheck,
  Printer,
  Edit,
  User as UserIcon,
  FileSpreadsheet
} from 'lucide-react';
import { formatDate, calculateAge, calculateTenure, cn } from '../../lib/utils';
import { motion } from 'framer-motion';

const EmployeeDetail: React.FC<{ employee: Employee, onBack: () => void }> = ({ employee, onBack }) => {
  
  const InfoItem = ({ label, value }: { label: string, value: string | undefined }) => (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-slate-700">{value || '-'}</p>
    </div>
  );

  const ContactItem = ({ label, value }: { label: string, value: string | undefined }) => (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
      <p className="text-xs font-bold text-slate-600 truncate">{value || '-'}</p>
    </div>
  );

  const TabButton = ({ active, label }: { active: boolean, label: string }) => (
    <button className={cn(
      "px-6 py-4 text-xs font-bold uppercase tracking-wide transition-all border-b-2",
      active ? "border-pln-blue text-pln-blue bg-blue-50/30" : "border-transparent text-slate-400 hover:text-slate-600"
    )}>
      {label}
    </button>
  );

  const InfoSection = ({ title, children, columns = 3 }: { title: string, children: React.ReactNode, columns?: number }) => (
    <div className="space-y-4">
      <h5 className="text-[11px] font-bold text-pln-blue uppercase tracking-widest border-b border-blue-50 pb-2">{title}</h5>
      <div className={cn(
        "grid grid-cols-2 gap-6",
        columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"
      )}>
        {children}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Detail Profil Pegawai</h2>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{employee.nip} • {employee.status}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors uppercase">
            <Printer size={14} />
            Cetak Profil
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-pln-blue text-white rounded-lg text-xs font-bold hover:bg-pln-dark transition-colors uppercase shadow-md shadow-blue-100">
            <Edit size={14} />
            Edit Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm text-center border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-pln-blue"></div>
            <div className="w-40 h-40 bg-slate-50 rounded-3xl mx-auto mb-6 flex items-center justify-center text-slate-200 ring-4 ring-slate-50 overflow-hidden">
              {employee.photoUrl ? (
                <img src={employee.photoUrl} alt={employee.fullName} className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={80} />
              )}
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight mb-1">{employee.fullName}</h3>
            <p className="text-xs font-bold text-pln-blue mb-6 uppercase tracking-widest">{employee.jabatanLengkap}</p>
            
            <div className="grid grid-cols-2 gap-4 py-6 border-y border-slate-50">
              <div className="text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Masa Kerja</p>
                <p className="text-sm font-black text-slate-700">{calculateTenure(employee.tanggalPengangkatan)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Umur</p>
                <p className="text-sm font-black text-slate-700">{calculateAge(employee.tanggalLahir)} Thn</p>
              </div>
            </div>

            <div className="pt-6">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-widest">Perusahaan</p>
              <p className="text-xs font-black text-slate-600 uppercase tracking-tight">{employee.perusahaan}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm space-y-6 border border-slate-100">
            <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3 mb-4 uppercase text-[10px] tracking-widest">
              <Phone size={14} className="text-pln-blue" />
              Informasi Kontak
            </h4>
            <ContactItem label="Email Korporat" value={employee.emailKorporat} />
            <ContactItem label="Nomor Telepon" value={employee.noTelepon} />
            <ContactItem label="Alamat" value={employee.alamatLengkap} />
          </div>

          {employee.dossierUrl && (
            <a 
              href={employee.dossierUrl} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center justify-center gap-3 w-full p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 font-black text-xs uppercase tracking-widest hover:bg-emerald-100 transition-all"
            >
              <FileSpreadsheet size={18} />
              Open Digital Dossier
            </a>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex border-b border-slate-50 bg-slate-50/50">
              <TabButton active={true} label="Informasi Umum" />
              <TabButton active={false} label="Pendidikan" />
              <TabButton active={false} label="Riwayat" />
            </div>
            <div className="p-10 space-y-12">
              <InfoSection title="Informasi Kepegawaian Detail">
                <InfoItem label="Nama Lengkap" value={employee.fullName} />
                <InfoItem label="NIP" value={employee.nip} />
                <InfoItem label="Unit Pelaksana" value={employee.unitPelaksana} />
                <InfoItem label="Sub Unit" value={employee.subUnit} />
                <InfoItem label="Person Grade" value={employee.personGrade} />
                <InfoItem label="Position Grade" value={employee.positionGrade} />
                <InfoItem label="Pendidikan Terakhir" value={employee.pendidikanTerakhir} />
                <InfoItem label="Jenis Kelamin" value={employee.jenisKelamin} />
                <InfoItem label="Agama" value={employee.agama} />
              </InfoSection>

              <InfoSection title="Administrasi Tanggal">
                <InfoItem label="Tanggal Masuk" value={formatDate(employee.tanggalMasuk)} />
                <InfoItem label="Tanggal CP" value={formatDate(employee.tanggalCalonPegawai)} />
                <InfoItem label="Tanggal Pengangkatan" value={formatDate(employee.tanggalPengangkatan)} />
                <InfoItem label="Mulai Jabatan" value={formatDate(employee.tanggalMulaiJabatan)} />
                <InfoItem label="Tgl Pensiun Normal" value={formatDate(employee.tanggalPensiunNormal)} />
                <InfoItem label="Tgl Berakhir" value={formatDate(employee.tanggalBerakhirBekerja)} />
              </InfoSection>

              <InfoSection title="Legal & Identitas">
                <InfoItem label="Nomor KTP" value={employee.noKTP} />
                <InfoItem label="Nomor NPWP" value={employee.noNPWP} />
                <InfoItem label="BPJS Kesehatan" value={employee.noBPJSKesehatan} />
                <InfoItem label="BPJS Ketenagakerjaan" value={employee.noBPJSKetenagakerjaan} />
              </InfoSection>

              <div className="space-y-6">
                <h5 className="text-[11px] font-bold text-pln-blue uppercase tracking-widest border-b border-blue-50 pb-2">Riwayat Pelatihan & Sertifikasi</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pelatihan</p>
                    {employee.trainings && employee.trainings.length > 0 ? (
                      <div className="space-y-3">
                        {employee.trainings.map((t, i) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-xs font-black text-slate-700">{t.namaPelatihan}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{formatDate(t.tanggalPelaksanaan)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-300 italic">Belum ada riwayat pelatihan</p>
                    )}
                  </div>
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sertifikasi</p>
                    {employee.certifications && employee.certifications.length > 0 ? (
                      <div className="space-y-3">
                        {employee.certifications.map((c, i) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-xs font-black text-slate-700">{c.namaSertifikasi}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                              {formatDate(c.tanggalPelaksanaan)} • Exp: {formatDate(c.masaBerlaku)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-300 italic">Belum ada riwayat sertifikasi</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetail;
