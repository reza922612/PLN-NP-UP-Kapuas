import React, { useState, useMemo } from 'react';
import { 
  Award, 
  Search, 
  Calendar, 
  User, 
  Building2, 
  AlertCircle,
  FileText,
  Filter,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Employee, Certification } from '../../types';
import { useEmployees } from '../../hooks/useEmployees';
import { cn } from '../../lib/utils';
import { format, isAfter, parseISO, differenceInDays } from 'date-fns';

const CertificationList: React.FC = () => {
  const { employees, loading } = useEmployees();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'warning'>('all');

  // Flatten certifications and associate with employee info
  const allCertifications = useMemo(() => {
    const certs: (Certification & { employeeName: string; employeeNip: string; unit: string; id: string })[] = [];
    
    employees.forEach(emp => {
      if (emp.certifications && Array.isArray(emp.certifications)) {
        emp.certifications.forEach((cert, index) => {
          certs.push({
            ...cert,
            id: cert.id || `${emp.id}-cert-${index}`,
            employeeName: emp.fullName,
            employeeNip: emp.nip,
            unit: emp.unitPelaksana,
          });
        });
      }
    });

    return certs;
  }, [employees]);

  const filteredCerts = useMemo(() => {
    return allCertifications.filter(cert => {
      const matchesSearch = 
        cert.namaSertifikasi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.employeeNip.includes(searchTerm);

      const today = new Date();
      const expiryDate = cert.masaBerlaku ? parseISO(cert.masaBerlaku) : null;
      
      let statusMatches = true;
      if (filterStatus === 'expired') {
        statusMatches = expiryDate ? !isAfter(expiryDate, today) : false;
      } else if (filterStatus === 'active') {
        statusMatches = expiryDate ? isAfter(expiryDate, today) : true;
      } else if (filterStatus === 'warning') {
        const daysToExpiry = expiryDate ? differenceInDays(expiryDate, today) : 999;
        statusMatches = daysToExpiry > 0 && daysToExpiry <= 30;
      }

      return matchesSearch && statusMatches;
    });
  }, [allCertifications, searchTerm, filterStatus]);

  const getStatusBadge = (expiryStr: string) => {
    if (!expiryStr) return null;
    const today = new Date();
    const expiryDate = parseISO(expiryStr);
    const isExpired = !isAfter(expiryDate, today);
    const daysToExpiry = differenceInDays(expiryDate, today);

    if (isExpired) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-100">
          <XCircle size={10} />
          Expired
        </span>
      );
    }

    if (daysToExpiry <= 30) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100">
          <Clock size={10} />
          Akan Berakhir
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100">
        <CheckCircle2 size={10} />
        Aktif
      </span>
    );
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
            <Award className="text-pln-blue" size={24} />
            Data Sertifikasi Pegawai
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Manajemen Kompetensi & Masa Berlaku Sertifikat</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Cari sertifikasi atau pegawai..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 bg-white border border-slate-200 rounded-2xl px-10 py-2.5 text-xs font-bold focus:ring-2 focus:ring-pln-blue transition-all outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
          </div>

          <div className="flex bg-white p-1 rounded-2xl border border-slate-200">
            {(['all', 'active', 'warning', 'expired'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                  filterStatus === status 
                    ? "bg-pln-blue text-white shadow-lg shadow-blue-100" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {status === 'all' ? 'Semua' : status === 'active' ? 'Aktif' : status === 'warning' ? 'Waspada' : 'Expired'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4 text-slate-400">
          <Award className="animate-pulse" size={48} />
          <p className="text-[10px] font-black uppercase tracking-widest">Memuat database kompetensi...</p>
        </div>
      ) : filteredCerts.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4 bg-white rounded-[32px] border-2 border-dashed border-slate-100 italic">
          <AlertCircle size={40} className="text-slate-300" />
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Tidak ada data sertifikasi ditemukan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredCerts.map((cert, index) => (
              <motion.div
                key={cert.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-[32px] border border-slate-100 p-6 hover:shadow-2xl hover:shadow-slate-100 transition-all group"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-pln-blue group-hover:scale-110 transition-transform">
                    <Award size={24} />
                  </div>
                  {getStatusBadge(cert.masaBerlaku)}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight line-clamp-1">{cert.namaSertifikasi}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                      <User size={10} />
                      {cert.employeeName}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-50">
                    <div className="space-y-1">
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Pelaksanaan</p>
                      <p className="text-[10px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Calendar size={10} className="text-slate-300" />
                        {cert.tanggalPelaksanaan ? format(parseISO(cert.tanggalPelaksanaan), 'dd MMM yyyy') : '-'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Berlaku s/d</p>
                      <p className={cn(
                        "text-[10px] font-bold flex items-center gap-1.5",
                        isAfter(new Date(), parseISO(cert.masaBerlaku)) ? "text-red-500" : "text-slate-700"
                      )}>
                        <Clock size={10} className="text-slate-300" />
                        {cert.masaBerlaku ? format(parseISO(cert.masaBerlaku), 'dd MMM yyyy') : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Building2 size={12} className="text-slate-300" />
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{cert.unit}</span>
                    </div>
                    {cert.certificateUrl && (
                      <a 
                        href={cert.certificateUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-pln-blue hover:text-white transition-all shadow-sm"
                        title="Lihat Sertifikat"
                      >
                        <FileText size={16} />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default CertificationList;
