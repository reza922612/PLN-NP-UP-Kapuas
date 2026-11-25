import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react';
import type { Employee } from '../../types';
import type {
  CsvEmployeeImportRow,
  CsvImportProgress,
  CsvImportResult,
} from '../../hooks/useEmployees';
import {
  downloadCsvRows,
  downloadExcelRows,
  FULL_EMPLOYEE_TEMPLATE_SAMPLE,
  parseEmployeeSpreadsheetFile,
} from '../../lib/employeeSpreadsheet';
import { cn } from '../../lib/utils';

interface EmployeeBulkInputCardProps {
  employees: Employee[];
  onImport: (
    rows: CsvEmployeeImportRow[],
    onProgress?: (progress: CsvImportProgress) => void
  ) => Promise<CsvImportResult>;
  onNavigateToList?: () => void;
}

const EmployeeBulkInputCard: React.FC<EmployeeBulkInputCardProps> = ({
  employees,
  onImport,
  onNavigateToList,
}) => {
  const [autoSubmitOnSelect, setAutoSubmitOnSelect] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [sheetName, setSheetName] = useState<string | undefined>(undefined);
  const [parsedRows, setParsedRows] = useState<CsvEmployeeImportRow[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<CsvImportProgress | null>(null);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [tableFilter, setTableFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const employeeByNip = useMemo(() => {
    const map: Record<string, Employee> = {};
    employees.forEach((e) => {
      if (e.nip) map[e.nip.trim().toLowerCase()] = e;
    });
    return map;
  }, [employees]);

  const previewSummary = useMemo(() => {
    let toUpdate = 0;
    let toCreate = 0;
    let invalid = 0;

    parsedRows.forEach((r) => {
      const nip = (r.nip || '').trim();
      if (!nip || nip === '-') {
        invalid += 1;
        return;
      }
      if (employeeByNip[nip.toLowerCase()]) {
        toUpdate += 1;
      } else if (r.fullName && r.fullName.trim() && r.fullName.trim() !== '-') {
        toCreate += 1;
      } else {
        invalid += 1;
      }
    });

    return { toUpdate, toCreate, invalid, total: parsedRows.length };
  }, [parsedRows, employeeByNip]);

  const rowOutcomeByNumber = useMemo(() => {
    const map: Record<number, CsvImportResult['rowResults'][number]> = {};
    (result?.rowResults || []).forEach((item) => {
      map[item.rowNumber] = item;
    });
    return map;
  }, [result]);

  const filteredRows = useMemo(() => {
    const q = tableFilter.trim().toLowerCase();
    if (!q) return parsedRows;
    return parsedRows.filter(
      (r) =>
        (r.nip || '').toLowerCase().includes(q) ||
        (r.fullName || '').toLowerCase().includes(q) ||
        (r.jabatanLengkap || '').toLowerCase().includes(q) ||
        (r.unitPelaksana || '').toLowerCase().includes(q)
    );
  }, [parsedRows, tableFilter]);

  const resetBulkState = () => {
    setFileName('');
    setSheetName(undefined);
    setParsedRows([]);
    setDetectedHeaders([]);
    setParseError(null);
    setProgress(null);
    setResult(null);
    setTableFilter('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runImport = async (rowsToImport: CsvEmployeeImportRow[]) => {
    if (rowsToImport.length === 0 || importing) return;
    setImporting(true);
    setParseError(null);
    setResult(null);
    try {
      const res = await onImport(rowsToImport, (prog) => setProgress(prog));
      setResult(res);
    } catch (err: any) {
      setParseError(
        err?.message || 'Gagal menyimpan data pegawai ke sistem. Periksa hak akses dan format data.'
      );
    } finally {
      setImporting(false);
    }
  };

  const handleFileSelected = async (file: File) => {
    if (importing) return;
    setParseError(null);
    setResult(null);
    setProgress(null);
    setTableFilter('');
    setFileName(file.name);

    try {
      const parsed = await parseEmployeeSpreadsheetFile(file);
      setParsedRows(parsed.rows);
      setDetectedHeaders(parsed.detectedHeaders);
      setSheetName(parsed.sheetName);

      if (autoSubmitOnSelect) {
        await runImport(parsed.rows);
      }
    } catch (err: any) {
      setParsedRows([]);
      setDetectedHeaders([]);
      setSheetName(undefined);
      setParseError(err?.message || 'Gagal membaca file Excel / CSV.');
    }
  };

  const handleDownloadExcelTemplate = () => {
    downloadExcelRows(
      FULL_EMPLOYEE_TEMPLATE_SAMPLE,
      'Template_Input_Pegawai_SIMAP_UP_Kapuas.xlsx',
      'Input Pegawai'
    );
  };

  const handleDownloadCsvTemplate = () => {
    downloadCsvRows(
      FULL_EMPLOYEE_TEMPLATE_SAMPLE,
      'Template_Input_Pegawai_SIMAP_UP_Kapuas.csv'
    );
  };

  return (
    <div className="corporate-card overflow-hidden">
      {/* Header Bar */}
      <div className="px-6 py-4 bg-gradient-to-r from-[#173B65] via-[#0072BC] to-[#009CE0] text-white relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={20} className="text-[#F9D423]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
                  Input Pegawai Massal via File Excel / CSV
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-[#F9D423] text-[#173B65] text-[10px] font-black uppercase tracking-wider">
                  Otomatis Semua Baris
                </span>
              </div>
              <p className="text-xs text-blue-100/90 mt-0.5">
                Unggah file <span className="font-bold text-white">.xlsx</span>,{' '}
                <span className="font-bold text-white">.xls</span>, atau{' '}
                <span className="font-bold text-white">.csv</span> untuk langsung menginput seluruh data pegawai sekaligus ke SIMAP UP Kapuas.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadExcelTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#173B65] text-xs font-extrabold hover:bg-[#EAF6FC] transition-colors shadow-xs"
            >
              <Download size={13} />
              Template Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={handleDownloadCsvTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 border border-white/25 text-white text-xs font-bold hover:bg-white/25 transition-colors"
            >
              <Download size={13} />
              Template CSV (.csv)
            </button>
          </div>
        </div>
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-[#F9D423]" />
      </div>

      {/* Content */}
      <div className="p-5 sm:p-6 space-y-4">
        {/* Auto-submit toggle + helper */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#F4F8FB] dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoSubmitOnSelect}
              onChange={(e) => setAutoSubmitOnSelect(e.target.checked)}
              disabled={importing}
              className="w-4 h-4 rounded border-slate-300 text-[#0072BC] focus:ring-[#0072BC]"
            />
            <span className="text-xs font-bold text-[#173B65] dark:text-slate-100">
              Langsung input &amp; simpan semua pegawai saat file dipilih
            </span>
          </label>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Kolom wajib: <strong className="text-[#0072BC] dark:text-[#72C8F1]">NIP</strong> &amp;{' '}
            <strong className="text-[#0072BC] dark:text-[#72C8F1]">Nama Lengkap</strong> (NIP yang sudah terdaftar otomatis diperbarui).
          </span>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!importing) setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) void handleFileSelected(dropped);
          }}
          onClick={() => !importing && fileInputRef.current?.click()}
          className={cn(
            'p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4',
            dragActive
              ? 'border-[#0072BC] bg-[#EAF6FC] dark:bg-[#0072BC]/15'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B172A]/60 hover:border-[#0072BC]',
            importing && 'opacity-70 cursor-wait'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileSelected(file);
            }}
          />
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#EAF6FC] dark:bg-[#0072BC]/20 text-[#0072BC] dark:text-[#72C8F1] flex items-center justify-center shrink-0">
              {importing ? <Loader2 size={21} className="animate-spin" /> : <Upload size={21} />}
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-extrabold text-[#173B65] dark:text-slate-100 truncate">
                {importing
                  ? `Sedang memproses ${fileName}...`
                  : fileName
                  ? `File terunggah: ${fileName}${sheetName ? ` (Sheet: ${sheetName})` : ''}`
                  : 'Klik atau seret file Excel (.xlsx / .xls) atau CSV (.csv) ke sini'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Mendukung format tanggal Excel, DD/MM/YYYY, YYYY-MM-DD, dan ribuan baris pegawai sekaligus.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {fileName && !importing && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  resetBulkState();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1A2E] text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-slate-300"
              >
                <RefreshCw size={13} />
                Reset
              </button>
            )}
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0072BC] text-white text-xs font-bold shadow-xs">
              <Upload size={13} />
              Pilih File Excel / CSV
            </span>
          </div>
        </div>

        {/* Parse/Import Error */}
        {parseError && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 flex items-start gap-2.5 text-xs font-semibold">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Batch Progress */}
        {importing && (
          <div className="p-4 rounded-xl bg-[#EAF6FC] dark:bg-[#0072BC]/15 border border-[#72C8F1]/40 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#173B65] dark:text-slate-100">
              <span className="flex items-center gap-2">
                <Loader2 size={15} className="animate-spin text-[#0072BC]" />
                {progress
                  ? `Menyimpan Batch ${progress.batchIndex} / ${progress.totalBatches} ke database...`
                  : `Membaca & menyimpan ${parsedRows.length} baris pegawai...`}
              </span>
              {progress && (
                <span className="tabular-nums">
                  {progress.processed} / {progress.total} baris
                </span>
              )}
            </div>
            <div className="h-2 w-full rounded-full bg-white dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0072BC] to-[#009CE0] transition-all duration-300"
                style={{
                  width: `${
                    progress && progress.total > 0
                      ? Math.round((progress.processed / progress.total) * 100)
                      : 20
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Result Summary */}
        {result && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-extrabold">
                <CheckCircle2 size={18} />
                <span>
                  Proses Input Pegawai Selesai — {result.createdCount + result.updatedCount} Data Tersimpan ke Sistem
                </span>
              </div>
              {onNavigateToList && (
                <button
                  type="button"
                  onClick={onNavigateToList}
                  className="text-xs font-extrabold text-[#0072BC] dark:text-[#72C8F1] hover:underline"
                >
                  Lihat Semua di Data Pegawai →
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#0E1A2E] border border-emerald-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Baris File</p>
                <p className="text-lg font-extrabold text-[#173B65] dark:text-white tabular-nums">
                  {parsedRows.length}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#0E1A2E] border border-emerald-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Pegawai Baru Terinput</p>
                <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {result.createdCount}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#0E1A2E] border border-emerald-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Data Diperbarui</p>
                <p className="text-lg font-extrabold text-[#0072BC] dark:text-[#72C8F1] tabular-nums">
                  {result.updatedCount}
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
              <div className="max-h-28 overflow-y-auto p-3 rounded-xl bg-white/85 dark:bg-slate-900/70 border border-amber-200/70 dark:border-amber-900/40 text-[11px] text-amber-700 dark:text-amber-300 space-y-1">
                {result.errors.slice(0, 25).map((errMsg, idx) => (
                  <p key={idx}>• {errMsg}</p>
                ))}
                {result.errors.length > 25 && (
                  <p className="font-bold">...dan {result.errors.length - 25} catatan lainnya.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Preview Summary + Confirm Button (when autoSubmit is OFF and not yet saved) */}
        {parsedRows.length > 0 && !result && !importing && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-[#F4F8FB] dark:bg-[#0B172A] border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Baris Terbaca</p>
                <p className="text-base font-extrabold text-[#173B65] dark:text-white tabular-nums">
                  {previewSummary.total}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50">
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                  Siap Input Baru
                </p>
                <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {previewSummary.toCreate}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#EAF6FC] dark:bg-[#0072BC]/15 border border-[#72C8F1]/40">
                <p className="text-[10px] font-bold text-[#0072BC] dark:text-[#72C8F1] uppercase">
                  Update NIP Terdaftar
                </p>
                <p className="text-base font-extrabold text-[#0072BC] dark:text-[#72C8F1] tabular-nums">
                  {previewSummary.toUpdate}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50">
                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">
                  Baris Tidak Valid
                </p>
                <p className="text-base font-extrabold text-amber-700 dark:text-amber-300 tabular-nums">
                  {previewSummary.invalid}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {detectedHeaders.length > 0 && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 min-w-0 flex-1">
                  Kolom dikenali:{' '}
                  <span className="font-semibold text-[#173B65] dark:text-slate-200">
                    {detectedHeaders.slice(0, 12).join(' · ')}
                    {detectedHeaders.length > 12 ? ` (+${detectedHeaders.length - 12} kolom lain)` : ''}
                  </span>
                </p>
              )}
              <button
                type="button"
                onClick={() => void runImport(parsedRows)}
                disabled={previewSummary.toCreate + previewSummary.toUpdate === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl pln-cta-gradient text-white text-xs font-extrabold uppercase tracking-wider shadow-md hover:brightness-105 transition-all disabled:opacity-40"
              >
                <CheckCircle2 size={15} />
                Input &amp; Simpan Semua ({previewSummary.toCreate + previewSummary.toUpdate} Pegawai)
              </button>
            </div>
          </div>
        )}

        {/* Table Preview / Result Rows */}
        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-xs font-extrabold text-[#173B65] dark:text-slate-200">
                {result
                  ? `Daftar Pegawai yang Diproses (${filteredRows.length} baris)`
                  : `Pratinjau Data Excel / CSV (${filteredRows.length} baris)`}
              </p>
              {parsedRows.length > 8 && (
                <div className="relative sm:w-64">
                  <Search
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    placeholder="Cari NIP / nama / jabatan..."
                    className="w-full pl-8 pr-3 py-1.5 bg-[#F4F8FB] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-[#173B65] dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-[#0072BC] outline-none"
                  />
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#F4F8FB] dark:bg-[#0B172A] sticky top-0 border-b border-slate-200 dark:border-slate-800">
                    <tr className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                      <th className="px-3 py-2.5">Baris</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">NIP</th>
                      <th className="px-3 py-2.5">Nama Lengkap</th>
                      <th className="px-3 py-2.5">Jabatan</th>
                      <th className="px-3 py-2.5">Unit Pelaksana</th>
                      <th className="px-3 py-2.5">Status Pegawai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRows.slice(0, 100).map((row) => {
                      const outcome = rowOutcomeByNumber[row.rowNumber];
                      const existing = row.nip
                        ? employeeByNip[row.nip.trim().toLowerCase()]
                        : undefined;

                      let badgeText = '';
                      let badgeClass = '';

                      if (outcome) {
                        if (outcome.action === 'created') {
                          badgeText = 'Terinput Baru';
                          badgeClass =
                            'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300';
                        } else if (outcome.action === 'updated') {
                          badgeText = 'Diperbarui';
                          badgeClass =
                            'bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1]';
                        } else {
                          badgeText = outcome.message || 'Dilewati';
                          badgeClass =
                            'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300';
                        }
                      } else {
                        badgeText = !row.nip?.trim()
                          ? 'NIP Kosong'
                          : existing
                          ? 'Update Data'
                          : row.fullName?.trim()
                          ? 'Input Baru'
                          : 'Nama Kosong';
                        badgeClass =
                          badgeText === 'Input Baru'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                            : badgeText === 'Update Data'
                            ? 'bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1]'
                            : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300';
                      }

                      return (
                        <tr
                          key={row.rowNumber}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-3 py-2 font-mono text-slate-400">{row.rowNumber}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold', badgeClass)}>
                              {badgeText}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold text-[#173B65] dark:text-slate-200 whitespace-nowrap">
                            {row.nip || '-'}
                          </td>
                          <td className="px-3 py-2 font-semibold text-[#173B65] dark:text-slate-200">
                            {row.fullName || existing?.fullName || '-'}
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                            {row.jabatanLengkap || existing?.jabatanLengkap || '-'}
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                            {row.unitPelaksana || existing?.unitPelaksana || 'UP Kapuas'}
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                            {row.status || existing?.status || 'Pegawai Organik'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredRows.length > 100 && (
                <div className="px-3.5 py-2 bg-[#F8FBFD] dark:bg-[#0B172A] border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400">
                  Menampilkan 100 baris pertama dari total {filteredRows.length} baris yang sesuai.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeBulkInputCard;
