import React, { useState } from 'react';
import { Employee } from '../../types';
import { 
  Search, 
  Filter, 
  Download, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  FileSpreadsheet, 
  FileText,
  Printer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatDate, calculateAge, calculateTenure, cn } from '../../lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const EmployeeList: React.FC<{ employees: Employee[], onView: (emp: Employee) => void }> = ({ employees, onView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         emp.nip.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || emp.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const currentItems = filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(employees);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Pegawai");
    XLSX.writeFile(wb, "Data_Pegawai_PLN_NP_Kapuas.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    (doc as any).autoTable({
      head: [['NIP', 'Nama', 'Jabatan', 'Status', 'Masa Kerja']],
      body: employees.map(e => [e.nip, e.fullName, e.jabatanLengkap, e.status, calculateTenure(e.tanggalPengangkatan)]),
    });
    doc.save("Data_Pegawai_PLN_NP_Kapuas.pdf");
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="p-6 border-b border-slate-50 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari NIP atau Nama..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
              <Filter size={16} className="text-slate-400" />
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-slate-600 outline-none"
              >
                <option value="All">Semua Status</option>
                <option value="Pegawai Organik">Organik</option>
                <option value="Pegawai Tugas Khusus">Tugas Khusus</option>
                <option value="Tenaga Alih Daya">Alih Daya</option>
              </select>
            </div>
            
            <div className="flex gap-1">
              <button 
                onClick={exportExcel}
                title="Export Excel"
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-100"
              >
                <FileSpreadsheet size={18} />
              </button>
              <button 
                onClick={exportPDF}
                title="Export PDF"
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
              >
                <FileText size={18} />
              </button>
              <button 
                onClick={() => window.print()}
                title="Print"
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
              >
                <Printer size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0">
            <tr className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <th className="px-6 py-4">Pegawai</th>
              <th className="px-6 py-4">NIP</th>
              <th className="px-6 py-4">Jabatan</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Masa Kerja</th>
              <th className="px-6 py-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {currentItems.length > 0 ? currentItems.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-200 flex-shrink-0" />
                    <span className="font-bold text-slate-700">{emp.fullName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-slate-500 text-xs font-semibold">{emp.nip}</td>
                <td className="px-6 py-4 text-slate-500 text-[10px] font-bold uppercase tracking-tight">{emp.jabatanLengkap}</td>
                <td className="px-6 py-4">
                   <div className="flex flex-col gap-1">
                    <span className={cn(
                      "inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight w-fit",
                      emp.status === 'Pegawai Organik' ? "bg-blue-100 text-blue-700" :
                      emp.status === 'Pegawai Tugas Khusus' ? "bg-amber-100 text-amber-700" :
                      "bg-emerald-100 text-emerald-700"
                    )}>
                      {emp.status}
                    </span>
                    <p className="text-[9px] font-bold text-slate-400 truncate max-w-[150px] uppercase">{emp.perusahaan}</p>
                   </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-[11px] font-black text-slate-600">
                    {calculateTenure(emp.tanggalPengangkatan)}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      onClick={() => onView(emp)}
                      className="text-pln-blue font-bold text-xs hover:underline"
                    >
                      Detail
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                  Tidak ada data pegawai ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-6 border-t border-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Menampilkan {currentItems.length} dari {filteredEmployees.length} pegawai
          </p>
          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-1 rounded-md border border-slate-200 text-slate-400 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-slate-700">{currentPage} / {totalPages}</span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-1 rounded-md border border-slate-200 text-slate-400 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeList;
