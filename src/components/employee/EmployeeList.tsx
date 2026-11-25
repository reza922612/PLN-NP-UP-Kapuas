import React, { useMemo, useState } from 'react';
import { Employee } from '../../types';
import {
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  FileSpreadsheet,
  FileText,
  Printer,
  ChevronLeft,
  ChevronRight,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Upload,
} from 'lucide-react';
import { formatDate, calculateAge, calculateTenure, cn } from '../../lib/utils';
import { StoredImage } from '../common/StoredFileUI';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
import {
  PageHeader,
  EmptyState,
  TableSkeleton,
  ConfirmDialog,
} from '../common/DashboardUI';
import EmployeeCsvImportModal from './EmployeeCsvImportModal';
import {
  CsvEmployeeImportRow,
  CsvImportProgress,
  CsvImportResult,
} from '../../hooks/useEmployees';

interface EmployeeListProps {
  employees: Employee[];
  loading?: boolean;
  onView: (emp: Employee) => void;
  onEdit?: (emp: Employee) => void;
  onDelete?: (id: string) => Promise<void>;
  canDelete?: boolean;
  onCsvImport?: (
    rows: CsvEmployeeImportRow[],
    onProgress?: (progress: CsvImportProgress) => void
  ) => Promise<CsvImportResult>;
}

type SortField = 'fullName' | 'nip' | 'jabatanLengkap' | 'status' | 'tanggalPengangkatan';

const EmployeeList: React.FC<EmployeeListProps> = ({
  employees,
  loading = false,
  onView,
  onEdit,
  onDelete,
  canDelete,
  onCsvImport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterUnit, setFilterUnit] = useState('All');
  const [sortField, setSortField] = useState<SortField>('fullName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDeleteEmp, setConfirmDeleteEmp] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const itemsPerPage = 10;

  const unitOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => e.unitPelaksana && set.add(e.unitPelaksana));
    return Array.from(set).sort();
  }, [employees]);

  const filteredAndSorted = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = employees.filter((emp) => {
      const matchesSearch =
        !q ||
        emp.fullName.toLowerCase().includes(q) ||
        emp.nip.toLowerCase().includes(q) ||
        emp.jabatanLengkap?.toLowerCase().includes(q) ||
        emp.unitPelaksana?.toLowerCase().includes(q);
      const matchesStatus = filterStatus === 'All' || emp.status === filterStatus;
      const matchesUnit = filterUnit === 'All' || emp.unitPelaksana === filterUnit;
      return matchesSearch && matchesStatus && matchesUnit;
    });

    return [...filtered].sort((a, b) => {
      const valA = (a[sortField] || '').toString().toLowerCase();
      const valB = (b[sortField] || '').toString().toLowerCase();
      const cmp = valA.localeCompare(valB);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [employees, searchTerm, filterStatus, filterUnit, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * itemsPerPage;
  const currentItems = filteredAndSorted.slice(startIdx, startIdx + itemsPerPage);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-slate-300" />;
    return sortDir === 'asc' ? (
      <ArrowUp size={12} className="text-[#0072BC] dark:text-[#72C8F1]" />
    ) : (
      <ArrowDown size={12} className="text-[#0072BC] dark:text-[#72C8F1]" />
    );
  };

  const exportExcel = () => {
    const rows = filteredAndSorted.map((e) => ({
      NIP: e.nip,
      'Nama Lengkap': e.fullName,
      'Nomor KPS': e.noKPS || '-',
      Jabatan: e.jabatanLengkap,
      'Unit Pelaksana': e.unitPelaksana,
      'Sub Unit': e.subUnit,
      Status: e.status,
      Perusahaan: e.perusahaan,
      'Masa Kerja': calculateTenure(e.tanggalPengangkatan),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Pegawai');
    XLSX.writeFile(wb, 'Data_Pegawai_PLN_NP_Kapuas.xlsx');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    (doc as any).autoTable({
      head: [['NIP', 'Nama', 'Jabatan', 'Status', 'Masa Kerja']],
      body: filteredAndSorted.map((e) => [
        e.nip,
        e.fullName,
        e.jabatanLengkap,
        e.status,
        calculateTenure(e.tanggalPengangkatan),
      ]),
    });
    doc.save('Data_Pegawai_PLN_NP_Kapuas.pdf');
  };

  const exportCSV = () => {
    const rows = filteredAndSorted.map((e) => ({
      NIP: e.nip || '-',
      'Nama Lengkap': e.fullName || '-',
      'Nomor KPS': e.noKPS || '-',
      Jabatan: e.jabatanLengkap || '-',
      'Unit Pelaksana': e.unitPelaksana || '-',
      'Sub Unit': e.subUnit || '-',
      'Status Pegawai': e.status || '-',
      Perusahaan: e.perusahaan || '-',
      'Person Grade': e.personGrade || '-',
      'Position Grade': e.positionGrade || '-',
      'Masa Kerja': calculateTenure(e.tanggalPengangkatan),
      'Umur (Tahun)': calculateAge(e.tanggalLahir),
      'Jenis Kelamin': e.jenisKelamin || '-',
      Agama: e.agama || '-',
      'Pendidikan Terakhir': e.pendidikanTerakhir || '-',
      'Email Korporat': e.emailKorporat || '-',
      'Nomor Telepon': e.noTelepon || '-',
      'Alamat Lengkap': e.alamatLengkap || '-',
      'Tanggal Lahir': formatDate(e.tanggalLahir),
      'Tanggal Masuk': formatDate(e.tanggalMasuk),
      'Tanggal Pengangkatan': formatDate(e.tanggalPengangkatan),
      'Tanggal Pensiun Normal': formatDate(e.tanggalPensiunNormal),
      'Atasan Langsung': e.atasanNama || '-',
      'Jumlah Pelatihan': e.trainings?.length || 0,
      'Jumlah Sertifikasi': e.certifications?.length || 0,
    }));

    const csv = Papa.unparse(rows);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `Data_Pegawai_PLN_NP_Kapuas_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Direktori Data Pegawai"
        subtitle="Pengelolaan data kepegawaian, filter status & unit, pengurutan kolom, serta ekspor pelaporan"
        icon={Users}
        badge={`${filteredAndSorted.length} Pegawai`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {onCsvImport && (
              <button
                type="button"
                onClick={() => setCsvImportOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#EAF6FC] dark:bg-[#0072BC]/20 border border-[#72C8F1]/50 text-[#0072BC] dark:text-[#72C8F1] rounded-xl text-xs font-bold hover:bg-[#0072BC] hover:text-white transition-colors"
              >
                <Upload size={14} />
                Impor Excel / CSV
              </button>
            )}
            <button
              type="button"
              onClick={exportCSV}
              disabled={filteredAndSorted.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-[#0072BC] dark:text-[#72C8F1] rounded-xl text-xs font-bold hover:border-[#0072BC] transition-colors disabled:opacity-40"
            >
              <Download size={14} />
              CSV
            </button>
            <button
              type="button"
              onClick={exportExcel}
              disabled={filteredAndSorted.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold hover:border-emerald-500 transition-colors disabled:opacity-40"
            >
              <FileSpreadsheet size={14} />
              Excel
            </button>
            <button
              type="button"
              onClick={exportPDF}
              disabled={filteredAndSorted.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold hover:border-red-500 transition-colors disabled:opacity-40"
            >
              <FileText size={14} />
              PDF
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0072BC] text-white rounded-xl text-xs font-bold hover:bg-[#173B65] transition-colors shadow-xs"
            >
              <Printer size={14} />
              Cetak
            </button>
          </div>
        }
      />

      <div className="corporate-card overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 bg-[#F8FBFD] dark:bg-[#11223B]/50 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari nama, NIP, jabatan, atau unit..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-[#173B65] dark:text-slate-100 focus:ring-2 focus:ring-[#0072BC] focus:border-transparent outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#0E1A2E] rounded-xl border border-slate-200 dark:border-slate-700">
              <Filter size={14} className="text-[#0072BC] dark:text-[#72C8F1]" />
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-bold text-[#173B65] dark:text-slate-200 outline-none"
              >
                <option value="All" className="dark:bg-slate-900">Semua Status</option>
                <option value="Pegawai Organik" className="dark:bg-slate-900">Organik</option>
                <option value="Pegawai Tugas Khusus" className="dark:bg-slate-900">Tugas Khusus</option>
                <option value="Tenaga Alih Daya" className="dark:bg-slate-900">Alih Daya</option>
              </select>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#0E1A2E] rounded-xl border border-slate-200 dark:border-slate-700">
              <Building2 size={14} className="text-[#0072BC] dark:text-[#72C8F1]" />
              <select
                value={filterUnit}
                onChange={(e) => {
                  setFilterUnit(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-bold text-[#173B65] dark:text-slate-200 outline-none max-w-[190px]"
              >
                <option value="All" className="dark:bg-slate-900">Semua Unit</option>
                {unitOptions.map((u) => (
                  <option key={u} value={u} className="dark:bg-slate-900">
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : currentItems.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Tidak ada data pegawai ditemukan"
            description="Sesuaikan kata kunci pencarian, filter status kepegawaian, atau unit pelaksana."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F4F8FB] dark:bg-[#0B172A] border-b border-slate-100 dark:border-slate-800">
                <tr className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  <th className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => toggleSort('fullName')}
                      className="inline-flex items-center gap-1.5 hover:text-[#0072BC] dark:hover:text-[#72C8F1]"
                    >
                      Pegawai {renderSortIcon('fullName')}
                    </button>
                  </th>
                  <th className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => toggleSort('nip')}
                      className="inline-flex items-center gap-1.5 hover:text-[#0072BC] dark:hover:text-[#72C8F1]"
                    >
                      NIP {renderSortIcon('nip')}
                    </button>
                  </th>
                  <th className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => toggleSort('jabatanLengkap')}
                      className="inline-flex items-center gap-1.5 hover:text-[#0072BC] dark:hover:text-[#72C8F1]"
                    >
                      Jabatan &amp; Unit {renderSortIcon('jabatanLengkap')}
                    </button>
                  </th>
                  <th className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => toggleSort('status')}
                      className="inline-flex items-center gap-1.5 hover:text-[#0072BC] dark:hover:text-[#72C8F1]"
                    >
                      Status Kepegawaian {renderSortIcon('status')}
                    </button>
                  </th>
                  <th className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => toggleSort('tanggalPengangkatan')}
                      className="inline-flex items-center gap-1.5 hover:text-[#0072BC] dark:hover:text-[#72C8F1]"
                    >
                      Masa Kerja {renderSortIcon('tanggalPengangkatan')}
                    </button>
                  </th>
                  <th className="px-5 py-3.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {currentItems.map((emp) => {
                  const initials = emp.fullName
                    .split(' ')
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase();
                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-[#EAF6FC]/40 dark:hover:bg-[#0072BC]/10 transition-colors group"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] font-extrabold text-xs flex items-center justify-center overflow-hidden shrink-0 border border-[#72C8F1]/30">
                            {emp.photoUrl ? (
                              <StoredImage
                                src={emp.photoUrl}
                                alt={emp.fullName}
                                className="w-full h-full object-cover"
                                fallback={initials || 'P'}
                              />
                            ) : (
                              initials || 'P'
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[#173B65] dark:text-slate-100 truncate max-w-[200px]">
                              {emp.fullName}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                              {emp.emailKorporat || '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-300 font-semibold tabular-nums">
                        {emp.nip}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-[#173B65] dark:text-slate-200 line-clamp-1 max-w-[220px]">
                          {emp.jabatanLengkap}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                          {emp.unitPelaksana}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="space-y-1">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide',
                              emp.status === 'Pegawai Organik'
                                ? 'bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1]'
                                : emp.status === 'Pegawai Tugas Khusus'
                                ? 'bg-amber-50 dark:bg-[#F9D423]/15 text-amber-700 dark:text-[#F9D423]'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            )}
                          >
                            {emp.status}
                          </span>
                          <p className="text-[10px] font-medium text-slate-400 truncate max-w-[170px]">
                            {emp.perusahaan}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-[#173B65] dark:text-slate-200 tabular-nums">
                        {calculateTenure(emp.tanggalPengangkatan)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onView(emp)}
                            title="Lihat Profil Detail"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] font-bold text-[11px] hover:bg-[#0072BC] hover:text-white transition-colors"
                          >
                            <Eye size={13} />
                            Detail
                          </button>
                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(emp)}
                              title="Edit Data Pegawai"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#0072BC] dark:hover:text-[#72C8F1] hover:bg-[#EAF6FC] dark:hover:bg-slate-800 transition-colors"
                            >
                              <Edit size={14} />
                            </button>
                          )}
                          {canDelete && onDelete && emp.id && (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteEmp(emp)}
                              title="Hapus Pegawai"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredAndSorted.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F8FBFD] dark:bg-[#0B172A]/60">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
              Menampilkan{' '}
              <span className="font-bold text-[#173B65] dark:text-slate-200">
                {startIdx + 1}–{Math.min(startIdx + itemsPerPage, filteredAndSorted.length)}
              </span>{' '}
              dari{' '}
              <span className="font-bold text-[#173B65] dark:text-slate-200">
                {filteredAndSorted.length}
              </span>{' '}
              pegawai
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-[#0072BC] disabled:opacity-35 transition-colors"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="px-3 text-xs font-bold text-[#173B65] dark:text-slate-200 tabular-nums">
                  Hal {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-[#0072BC] disabled:opacity-35 transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDeleteEmp}
        title="Hapus Data Pegawai?"
        description={
          confirmDeleteEmp ? (
            <>
              Anda akan menghapus{' '}
              <span className="font-bold text-[#173B65] dark:text-slate-200">
                {confirmDeleteEmp.fullName}
              </span>{' '}
              (NIP: {confirmDeleteEmp.nip}). Tindakan ini akan dicatat di Activity Log.
            </>
          ) : null
        }
        loading={deleting}
        onCancel={() => setConfirmDeleteEmp(null)}
        onConfirm={async () => {
          if (!confirmDeleteEmp?.id || !onDelete) return;
          setDeleting(true);
          try {
            await onDelete(confirmDeleteEmp.id);
            setConfirmDeleteEmp(null);
          } finally {
            setDeleting(false);
          }
        }}
      />

      {onCsvImport && (
        <EmployeeCsvImportModal
          open={csvImportOpen}
          onClose={() => setCsvImportOpen(false)}
          employees={employees}
          onImport={onCsvImport}
        />
      )}
    </div>
  );
};

export default EmployeeList;
