import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import { Employee } from '../../types';
import {
  CsvEmployeeImportRow,
  CsvImportProgress,
  CsvImportResult,
} from '../../hooks/useEmployees';
import {
  buildMissingKpsRows,
  downloadCsvRows,
  downloadExcelRows,
  FULL_EMPLOYEE_TEMPLATE_SAMPLE,
  parseEmployeeSpreadsheetFile,
} from '../../lib/employeeSpreadsheet';
import { cn } from '../../lib/utils';

interface EmployeeCsvImportModalProps {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  onImport: (
    rows: CsvEmployeeImportRow[],
    onProgress?: (progress: CsvImportProgress) => void
  ) => Promise<CsvImportResult>;
}

const EmployeeCsvImportModal: React.FC<EmployeeCsvImportModalProps> = ({
  open,
  onClose,
  employees,
  onImport,
}) => {
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<CsvEmployeeImportRow[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<CsvImportProgress | null>(null);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const employeeByNip = useMemo(() => {
    const map: Record<string, Employee> = {};
    employees.forEach((e) => {
      if (e.nip) map[e.nip.trim().toLowerCase()] = e;
    });
    return map;
  }, [employees]);

  const missingKpsEmployees = useMemo(
    () => employees.filter((e) => !e.noKPS || !e.noKPS.trim()),
    [employees]
  );

  const previewSummary = useMemo(() => {
    let toUpdate = 0;
    let toCreate = 0;
    let invalid = 0;
    let withKps = 0;

    parsedRows.forEach((r) => {
      const nip = (r.nip || '').trim();
      if (!nip || nip === '-') {
        invalid += 1;
        return;
      }
      if (r.noKPS && r.noKPS.trim() && r.noKPS.trim() !== '-') {
        withKps += 1;
      }
      const existing = employeeByNip[nip.toLowerCase()];
      if (existing) {
        toUpdate += 1;
      } else if (r.fullName && r.fullName.trim() && r.fullName.trim() !== '-') {
        toCreate += 1;
      } else {
        invalid += 1;
      }
    });

    return { toUpdate, toCreate, invalid, withKps, total: parsedRows.length };
  }, [parsedRows, employeeByNip]);

  const resetState = () => {
    setFileName('');
    setParsedRows([]);
    setDetectedHeaders([]);
    setParseError(null);
    setProgress(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (importing) return;
    resetState();
    onClose();
  };

  const handleDownloadMissingKpsTemplate = () => {
    const rows = buildMissingKpsRows(employees);
    downloadExcelRows(
      rows,
      `Template_Isi_Nomor_KPS_Pegawai_${new Date().toISOString().slice(0, 10)}.xlsx`,
      'Daftar KPS Pegawai'
    );
  };

  const handleDownloadFullTemplateExcel = () => {
    downloadExcelRows(
      FULL_EMPLOYEE_TEMPLATE_SAMPLE,
      'Template_Impor_Lengkap_Pegawai_SIMAP.xlsx',
      'Input Pegawai'
    );
  };

  const handleDownloadFullTemplateCsv = () => {
    downloadCsvRows(
      FULL_EMPLOYEE_TEMPLATE_SAMPLE,
      'Template_Impor_Lengkap_Pegawai_SIMAP.csv'
    );
  };

  const processFile = async (file: File) => {
    setParseError(null);
    setResult(null);
    setProgress(null);
    setFileName(file.name);

    try {
      const parsed = await parseEmployeeSpreadsheetFile(file);
      setDetectedHeaders(parsed.detectedHeaders);
      setParsedRows(parsed.rows);
    } catch (err: any) {
      setParsedRows([]);
      setDetectedHeaders([]);
      setParseError(err?.message || 'Gagal membaca file Excel / CSV.');
    }
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0 || importing) return;
    setImporting(true);
    setParseError(null);
    setResult(null);
    try {
      const res = await onImport(parsedRows, (prog) => setProgress(prog));
      setResult(res);
    } catch (err: any) {
      setParseError(err?.message || 'Terjadi kesalahan saat menyimpan data impor ke Firestore.');
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#071120]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-import-title"
    >
      <div className="bg-white dark:bg-[#0E1A2E] w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#173B65] via-[#0072BC] to-[#009CE0] px-6 py-5 text-white relative shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                <FileSpreadsheet size={21} className="text-[#F9D423]" />
              </div>
              <div>
                <h2 id="csv-import-title" className="text-lg font-extrabold tracking-tight">
                  Impor Data Pegawai &amp; Nomor KPS (Excel / CSV Massal)
                </h2>
                <p className="text-xs text-blue-100/90 mt-0.5">
                  Perbarui ribuan Nomor KPS pegawai berdasarkan NIP atau tambah pegawai baru dari file Excel (.xlsx/.xls) atau CSV (.csv)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={importing}
              aria-label="Tutup Modal Impor Excel / CSV"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-40"
            >
              <X size={18} />
            </button>
          </div>
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-[#F9D423]" />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Template & KPS Quick Stats Bar */}
          <div className="p-4 rounded-2xl bg-[#F4F8FB] dark:bg-[#0B172A] border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-extrabold text-[#173B65] dark:text-slate-100">
                Pengisian Massal Nomor KPS ({missingKpsEmployees.length} dari {employees.length} pegawai belum terisi KPS)
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Unduh daftar NIP pegawai yang belum memiliki Nomor KPS, isi kolom <span className="font-bold text-[#0072BC] dark:text-[#72C8F1]">Nomor KPS</span> di Excel/CSV, lalu unggah kembali tanpa menimpa data lainnya.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadMissingKpsTemplate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0072BC] text-white text-xs font-bold hover:bg-[#173B65] transition-colors"
              >
                <Download size={14} />
                Unduh Daftar KPS (.xlsx)
              </button>
              <button
                type="button"
                onClick={handleDownloadFullTemplateExcel}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-[#173B65] dark:text-slate-200 text-xs font-bold hover:border-[#0072BC] transition-colors"
              >
                <Download size={14} />
                Template Excel
              </button>
              <button
                type="button"
                onClick={handleDownloadFullTemplateCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-700 text-[#173B65] dark:text-slate-200 text-xs font-bold hover:border-[#0072BC] transition-colors"
              >
                <Download size={14} />
                Template CSV
              </button>
            </div>
          </div>

          {/* Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) void processFile(dropped);
            }}
            onClick={() => !importing && fileInputRef.current?.click()}
            className={cn(
              'p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2.5',
              dragActive
                ? 'border-[#0072BC] bg-[#EAF6FC] dark:bg-[#0072BC]/15'
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B172A]/60 hover:border-[#0072BC]'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void processFile(file);
              }}
            />
            <div className="w-12 h-12 rounded-2xl bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center">
              <Upload size={22} />
            </div>
            <div>
              <p className="text-xs font-extrabold text-[#173B65] dark:text-slate-100">
                {fileName ? `File dipilih: ${fileName}` : 'Klik atau seret file Excel (.xlsx / .xls) atau CSV ke area ini'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Mendukung ribuan baris data sekaligus · Format Excel &amp; CSV otomatis dikenali
              </p>
            </div>
          </div>

          {parseError && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 flex items-start gap-2.5 text-xs font-semibold">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Batch Progress Bar */}
          {importing && progress && (
            <div className="p-4 rounded-2xl bg-[#EAF6FC] dark:bg-[#0072BC]/15 border border-[#72C8F1]/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#173B65] dark:text-slate-100">
                <span className="flex items-center gap-2">
                  <Loader2 size={15} className="animate-spin text-[#0072BC]" />
                  Memproses Batch {progress.batchIndex} / {progress.totalBatches}...
                </span>
                <span className="tabular-nums">
                  {progress.processed} / {progress.total} baris
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-white dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0072BC] to-[#009CE0] transition-all duration-300"
                  style={{
                    width: `${progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Import Result Summary */}
          {result && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold">
                <CheckCircle2 size={17} />
                <span>Impor Massal Excel / CSV Selesai Diproses</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#0E1A2E] border border-emerald-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Diperbarui</p>
                  <p className="text-lg font-extrabold text-[#0072BC] dark:text-[#72C8F1] tabular-nums">
                    {result.updatedCount}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#0E1A2E] border border-emerald-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Pegawai Baru</p>
                  <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {result.createdCount}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#0E1A2E] border border-emerald-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Dilewati</p>
                  <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                    {result.skippedCount}
                  </p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="max-h-28 overflow-y-auto p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/70 text-[11px] text-amber-700 dark:text-amber-300 space-y-1">
                  {result.errors.slice(0, 30).map((errMsg, idx) => (
                    <p key={idx}>• {errMsg}</p>
                  ))}
                  {result.errors.length > 30 && (
                    <p className="font-bold">...dan {result.errors.length - 30} catatan lainnya.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dry-Run Preview */}
          {parsedRows.length > 0 && !result && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#F4F8FB] dark:bg-[#0B172A] border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Baris File</p>
                  <p className="text-base font-extrabold text-[#173B65] dark:text-white tabular-nums">
                    {previewSummary.total}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#EAF6FC] dark:bg-[#0072BC]/15 border border-[#72C8F1]/40">
                  <p className="text-[10px] font-bold text-[#0072BC] dark:text-[#72C8F1] uppercase">
                    Update (NIP Cocok)
                  </p>
                  <p className="text-base font-extrabold text-[#0072BC] dark:text-[#72C8F1] tabular-nums">
                    {previewSummary.toUpdate}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50">
                  <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                    Pegawai Baru
                  </p>
                  <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
                    {previewSummary.toCreate}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50">
                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">
                    Terisi No KPS
                  </p>
                  <p className="text-base font-extrabold text-amber-700 dark:text-amber-300 tabular-nums">
                    {previewSummary.withKps}
                  </p>
                </div>
              </div>

              {detectedHeaders.length > 0 && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kolom dikenali:{' '}
                  <span className="font-semibold text-[#173B65] dark:text-slate-200">
                    {detectedHeaders.join(' · ')}
                  </span>
                </p>
              )}

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="max-h-56 overflow-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[#F4F8FB] dark:bg-[#0B172A] sticky top-0 border-b border-slate-200 dark:border-slate-800">
                      <tr className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                        <th className="px-3.5 py-2.5">Baris</th>
                        <th className="px-3.5 py-2.5">Aksi</th>
                        <th className="px-3.5 py-2.5">NIP</th>
                        <th className="px-3.5 py-2.5">Nama</th>
                        <th className="px-3.5 py-2.5">Nomor KPS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedRows.slice(0, 50).map((row) => {
                        const existing = row.nip
                          ? employeeByNip[row.nip.trim().toLowerCase()]
                          : undefined;
                        const statusLabel = !row.nip?.trim()
                          ? 'Lewati (NIP Kosong)'
                          : existing
                          ? 'Update Pegawai'
                          : row.fullName?.trim()
                          ? 'Tambah Baru'
                          : 'Lewati (Nama Kosong)';
                        return (
                          <tr key={row.rowNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-3.5 py-2 font-mono text-slate-400">{row.rowNumber}</td>
                            <td className="px-3.5 py-2">
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-md text-[10px] font-bold',
                                  statusLabel === 'Update Pegawai'
                                    ? 'bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1]'
                                    : statusLabel === 'Tambah Baru'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                                )}
                              >
                                {statusLabel}
                              </span>
                            </td>
                            <td className="px-3.5 py-2 font-mono font-semibold text-[#173B65] dark:text-slate-200">
                              {row.nip || '-'}
                            </td>
                            <td className="px-3.5 py-2 font-semibold text-[#173B65] dark:text-slate-200">
                              {row.fullName || existing?.fullName || '-'}
                            </td>
                            <td className="px-3.5 py-2 font-mono font-bold text-[#0072BC] dark:text-[#72C8F1]">
                              {row.noKPS || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 50 && (
                  <div className="px-3.5 py-2 bg-[#F8FBFD] dark:bg-[#0B172A] border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400">
                    Menampilkan 50 baris pertama dari total {parsedRows.length} baris yang siap diproses.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F8FBFD] dark:bg-[#0B172A] border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={resetState}
            disabled={importing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-[#173B65] dark:hover:text-white disabled:opacity-40"
          >
            <RefreshCw size={14} />
            Reset File
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={importing}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1A2E] text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40"
            >
              {result ? 'Tutup' : 'Batal'}
            </button>

            {!result && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={
                  importing ||
                  parsedRows.length === 0 ||
                  previewSummary.toUpdate + previewSummary.toCreate === 0
                }
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#0072BC] to-[#173B65] text-white text-xs font-bold hover:brightness-110 transition-all shadow-sm disabled:opacity-40"
              >
                {importing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Mengimpor Data...
                  </>
                ) : (
                  <>
                    <Upload size={14} className="text-[#F9D423]" />
                    Proses Impor ({previewSummary.toUpdate + previewSummary.toCreate} Pegawai)
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeCsvImportModal;
