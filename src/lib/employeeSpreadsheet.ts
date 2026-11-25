import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { CsvEmployeeImportRow } from '../hooks/useEmployees';
import type { Employee } from '../types';

export const normalizeHeaderKey = (raw: string): string =>
  raw
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

export const HEADER_ALIAS_MAP: Record<string, keyof CsvEmployeeImportRow> = {
  nip: 'nip',
  nomorindukpegawai: 'nip',
  noinduk: 'nip',
  nippegawai: 'nip',
  nokps: 'noKPS',
  nomorkps: 'noKPS',
  kps: 'noKPS',
  nomorkartupegawaisehat: 'noKPS',
  kartupegawaisehat: 'noKPS',
  namalengkap: 'fullName',
  nama: 'fullName',
  namapegawai: 'fullName',
  fullname: 'fullName',
  jabatan: 'jabatanLengkap',
  jabatanlengkap: 'jabatanLengkap',
  namajabatan: 'jabatanLengkap',
  unitpelaksana: 'unitPelaksana',
  unitkerja: 'unitPelaksana',
  unit: 'unitPelaksana',
  up: 'unitPelaksana',
  subunit: 'subUnit',
  bidang: 'subUnit',
  bagian: 'subUnit',
  seksi: 'subUnit',
  status: 'status',
  statuspegawai: 'status',
  statuskepegawaian: 'status',
  perusahaan: 'perusahaan',
  company: 'perusahaan',
  afiliasi: 'perusahaan',
  persongrade: 'personGrade',
  pg: 'personGrade',
  positiongrade: 'positionGrade',
  posgrade: 'positionGrade',
  email: 'emailKorporat',
  emailkorporat: 'emailKorporat',
  emailperusahaan: 'emailKorporat',
  nomortelepon: 'noTelepon',
  notelepon: 'noTelepon',
  telepon: 'noTelepon',
  nohp: 'noTelepon',
  hp: 'noTelepon',
  whatsapp: 'noTelepon',
  nowa: 'noTelepon',
  alamatlengkap: 'alamatLengkap',
  alamat: 'alamatLengkap',
  alamatdomisili: 'alamatLengkap',
  jeniskelamin: 'jenisKelamin',
  gender: 'jenisKelamin',
  jk: 'jenisKelamin',
  kelamin: 'jenisKelamin',
  agama: 'agama',
  religion: 'agama',
  pendidikanterakhir: 'pendidikanTerakhir',
  pendidikan: 'pendidikanTerakhir',
  noktp: 'noKTP',
  nomorktp: 'noKTP',
  ktp: 'noKTP',
  nik: 'noKTP',
  nonpwp: 'noNPWP',
  nomornpwp: 'noNPWP',
  npwp: 'noNPWP',
  nobpjskesehatan: 'noBPJSKesehatan',
  bpjskesehatan: 'noBPJSKesehatan',
  bpjskes: 'noBPJSKesehatan',
  nobpjsketenagakerjaan: 'noBPJSKetenagakerjaan',
  bpjsketenagakerjaan: 'noBPJSKetenagakerjaan',
  bpjstk: 'noBPJSKetenagakerjaan',
  jamsostek: 'noBPJSKetenagakerjaan',
  tanggallahir: 'tanggalLahir',
  tgllahir: 'tanggalLahir',
  tanggalmasuk: 'tanggalMasuk',
  tglmasuk: 'tanggalMasuk',
  tanggalcalonpegawai: 'tanggalCalonPegawai',
  tglcapeg: 'tanggalCalonPegawai',
  tanggalcp: 'tanggalCalonPegawai',
  tglcp: 'tanggalCalonPegawai',
  tanggalmulaijabatan: 'tanggalMulaiJabatan',
  tglmulaijabatan: 'tanggalMulaiJabatan',
  tmtjabatan: 'tanggalMulaiJabatan',
  tanggalpengangkatan: 'tanggalPengangkatan',
  tglpengangkatan: 'tanggalPengangkatan',
  tmtpengangkatan: 'tanggalPengangkatan',
  tanggalpensiunnormal: 'tanggalPensiunNormal',
  tanggalpensiun: 'tanggalPensiunNormal',
  tglpensiun: 'tanggalPensiunNormal',
  tanggalberakhirbekerja: 'tanggalBerakhirBekerja',
  tglakhirkerja: 'tanggalBerakhirBekerja',
  tanggalakhirkerja: 'tanggalBerakhirBekerja',
  atasannama: 'atasanNama',
  atasanlangsung: 'atasanNama',
  namaatasan: 'atasanNama',
  atasan: 'atasanNama',
  atasanjabatan: 'atasanJabatan',
  jabatanatasan: 'atasanJabatan',
};

export const DATE_FIELDS = new Set<keyof CsvEmployeeImportRow>([
  'tanggalLahir',
  'tanggalMasuk',
  'tanggalCalonPegawai',
  'tanggalMulaiJabatan',
  'tanggalPengangkatan',
  'tanggalPensiunNormal',
  'tanggalBerakhirBekerja',
]);

export const normalizeSpreadsheetDate = (raw: unknown): string => {
  if (raw === null || raw === undefined) return '';

  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 1 && raw < 2958465) {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      const yyyy = String(parsed.y).padStart(4, '0');
      const mm = String(parsed.m).padStart(2, '0');
      const dd = String(parsed.d).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const yyyy = String(raw.getFullYear()).padStart(4, '0');
    const mm = String(raw.getMonth() + 1).padStart(2, '0');
    const dd = String(raw.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const val = String(raw).trim();
  if (!val || val === '-') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;

  const ymdSlash = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/.exec(val);
  if (ymdSlash) {
    return `${ymdSlash[1]}-${ymdSlash[2].padStart(2, '0')}-${ymdSlash[3].padStart(2, '0')}`;
  }

  const dmy = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(val);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    let yyyy = dmy[3];
    if (yyyy.length === 2) {
      yyyy = Number(yyyy) > 50 ? `19${yyyy}` : `20${yyyy}`;
    }
    return `${yyyy}-${mm}-${dd}`;
  }

  return val;
};

const formatCellText = (rawVal: unknown, formattedVal?: unknown): string => {
  if (formattedVal !== undefined && formattedVal !== null && String(formattedVal).trim() !== '') {
    const f = String(formattedVal).trim();
    // Avoid using formatted string if Excel truncated long digits to ###
    if (!/^#+$/.test(f)) return f;
  }
  if (rawVal === undefined || rawVal === null) return '';
  if (typeof rawVal === 'number') {
    if (!Number.isFinite(rawVal)) return '';
    return Number.isInteger(rawVal) ? rawVal.toFixed(0) : String(rawVal);
  }
  return String(rawVal).trim();
};

export interface ParsedEmployeeSpreadsheetResult {
  rows: CsvEmployeeImportRow[];
  detectedHeaders: string[];
  sheetName?: string;
}

function buildMappedHeaders(rawFields: string[]) {
  const mappedHeaders: string[] = [];
  const fieldMap: Record<string, keyof CsvEmployeeImportRow> = {};

  rawFields.forEach((rawCol) => {
    const norm = normalizeHeaderKey(rawCol);
    const target = HEADER_ALIAS_MAP[norm];
    if (target && !Object.values(fieldMap).includes(target)) {
      fieldMap[rawCol] = target;
      mappedHeaders.push(`${rawCol} → ${target}`);
    } else if (target) {
      // Allow alias fallback if key doesn't collide
      fieldMap[rawCol] = target;
    }
  });

  return { mappedHeaders, fieldMap };
}

export async function parseEmployeeSpreadsheetFile(
  file: File
): Promise<ParsedEmployeeSpreadsheetResult> {
  const lowerName = file.name.toLowerCase();
  const isCsv =
    lowerName.endsWith('.csv') ||
    file.type === 'text/csv' ||
    file.type === 'application/csv';
  const isExcel =
    lowerName.endsWith('.xlsx') ||
    lowerName.endsWith('.xls') ||
    file.type.includes('spreadsheetml') ||
    file.type.includes('ms-excel');

  if (!isCsv && !isExcel) {
    throw new Error('Format file harus berupa Excel (.xlsx / .xls) atau CSV (.csv).');
  }

  if (isCsv) {
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: (res) => {
          if (res.errors.length > 0 && res.data.length === 0) {
            reject(new Error(`Gagal membaca file CSV: ${res.errors[0].message}`));
            return;
          }

          const rawFields = res.meta.fields || [];
          const { mappedHeaders, fieldMap } = buildMappedHeaders(rawFields);

          if (!Object.values(fieldMap).includes('nip')) {
            reject(
              new Error(
                'Kolom "NIP" wajib ada pada header file untuk mencocokkan/menginput pegawai.'
              )
            );
            return;
          }

          const rows: CsvEmployeeImportRow[] = [];
          res.data.forEach((rawObj, idx) => {
            const entry: CsvEmployeeImportRow = {
              rowNumber: idx + 2,
              nip: '',
            };
            let hasAnyContent = false;

            Object.entries(fieldMap).forEach(([rawKey, targetKey]) => {
              if (targetKey === 'rowNumber') return;
              const rawVal = rawObj[rawKey] != null ? String(rawObj[rawKey]).trim() : '';
              if (!rawVal) return;
              hasAnyContent = true;
              (entry as any)[targetKey] = DATE_FIELDS.has(targetKey)
                ? normalizeSpreadsheetDate(rawVal)
                : rawVal;
            });

            if (hasAnyContent) {
              rows.push(entry);
            }
          });

          if (rows.length === 0) {
            reject(new Error('File CSV tidak memiliki baris data pegawai untuk diproses.'));
            return;
          }

          resolve({ rows, detectedHeaders: mappedHeaders });
        },
        error: (err) => {
          reject(new Error(`Error membaca file CSV: ${err.message}`));
        },
      });
    });
  }

  // Excel (.xlsx / .xls)
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('File Excel tidak memiliki sheet yang dapat dibaca.');
  }

  // Pick first sheet that has a recognizable NIP header, fallback to first sheet
  let chosenSheetName = workbook.SheetNames[0];
  for (const sheetName of workbook.SheetNames) {
    const wsCandidate = workbook.Sheets[sheetName];
    const headerMatrix = XLSX.utils.sheet_to_json<unknown[]>(wsCandidate, {
      header: 1,
      blankrows: false,
    });
    const firstRow = Array.isArray(headerMatrix[0]) ? headerMatrix[0] : [];
    const hasNipHeader = firstRow.some(
      (cell) => HEADER_ALIAS_MAP[normalizeHeaderKey(String(cell ?? ''))] === 'nip'
    );
    if (hasNipHeader) {
      chosenSheetName = sheetName;
      break;
    }
  }

  const worksheet = workbook.Sheets[chosenSheetName];
  const rawObjects = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    raw: true,
    defval: '',
  });
  const formattedObjects = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    raw: false,
    defval: '',
  });

  if (rawObjects.length === 0) {
    throw new Error(`Sheet "${chosenSheetName}" kosong atau tidak berisi baris data pegawai.`);
  }

  const rawFields = Array.from(
    new Set(rawObjects.flatMap((obj) => Object.keys(obj)))
  );
  const { mappedHeaders, fieldMap } = buildMappedHeaders(rawFields);

  if (!Object.values(fieldMap).includes('nip')) {
    throw new Error(
      `Kolom "NIP" wajib ada pada header sheet "${chosenSheetName}" untuk menginput pegawai.`
    );
  }

  const rows: CsvEmployeeImportRow[] = [];
  rawObjects.forEach((rawObj, idx) => {
    const fmtObj = formattedObjects[idx] || {};
    const entry: CsvEmployeeImportRow = {
      rowNumber: idx + 2,
      nip: '',
    };
    let hasAnyContent = false;

    Object.entries(fieldMap).forEach(([rawKey, targetKey]) => {
      if (targetKey === 'rowNumber') return;
      const rawVal = rawObj[rawKey];
      const fmtVal = fmtObj[rawKey];

      if (DATE_FIELDS.has(targetKey)) {
        const dateVal = normalizeSpreadsheetDate(rawVal !== '' ? rawVal : fmtVal);
        if (dateVal) {
          hasAnyContent = true;
          (entry as any)[targetKey] = dateVal;
        }
        return;
      }

      const strVal = formatCellText(rawVal, fmtVal);
      if (strVal) {
        hasAnyContent = true;
        (entry as any)[targetKey] = strVal;
      }
    });

    if (hasAnyContent) {
      rows.push(entry);
    }
  });

  if (rows.length === 0) {
    throw new Error(`Sheet "${chosenSheetName}" tidak memiliki baris data yang terisi.`);
  }

  return {
    rows,
    detectedHeaders: mappedHeaders,
    sheetName: chosenSheetName,
  };
}

export const FULL_EMPLOYEE_TEMPLATE_SAMPLE: Record<string, string>[] = [
  {
    NIP: '199205102018011002',
    'Nama Lengkap': 'Budi Santoso',
    'Jenis Kelamin': 'Laki-laki',
    Agama: 'Islam',
    'Tanggal Lahir': '1992-05-10',
    'Email Korporat': 'budi.santoso@plnnusantarapower.co.id',
    'Nomor Telepon': '081234567890',
    'Pendidikan Terakhir': 'S1 Teknik Elektro',
    'Alamat Lengkap': 'Jl. Ahmad Yani No. 10, Pontianak',
    'Jabatan Lengkap': 'Team Leader Pemeliharaan',
    'Unit Pelaksana': 'UP Kapuas',
    'Sub Unit': 'Bidang Pemeliharaan',
    'Person Grade': '12',
    'Position Grade': '11',
    'Status Pegawai': 'Pegawai Organik',
    Perusahaan: 'PT PLN Nusantara Power',
    'Tanggal Masuk': '2018-01-15',
    'Tanggal CP': '2018-07-01',
    'Tgl Mulai Jabatan': '2024-03-01',
    'Tanggal Pengangkatan': '2019-01-15',
    'Tanggal Pensiun Normal': '2048-05-10',
    'Nomor KTP': '6171011005920001',
    'Nomor NPWP': '123456789012345',
    'BPJS Kesehatan': '0001234567890',
    'BPJS Ketenagakerjaan': '18001234567',
    'Nomor KPS': 'KPS-2026-0001',
    'Atasan Langsung': '',
    'Jabatan Atasan': '',
  },
];

export function downloadCsvRows(rows: Record<string, string>[], downloadName: string) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', downloadName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadExcelRows(
  rows: Record<string, string>[],
  downloadName: string,
  sheetName: string = 'Data Pegawai'
) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  ws['!cols'] = headers.map((header) => {
    const maxLen = Math.max(
      header.length,
      ...rows.map((r) => String(r[header] ?? '').length)
    );
    return { wch: Math.min(Math.max(maxLen + 4, 14), 36) };
  });

  // Format text-sensitive identifier cells (NIP, KTP, NPWP, BPJS, Phone) as text
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (cell && typeof cell.v === 'string') {
        cell.t = 's';
        cell.z = '@';
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, downloadName);
}

export function buildMissingKpsRows(employees: Employee[]): Record<string, string>[] {
  const missing = employees.filter((e) => !e.noKPS || !e.noKPS.trim());
  const source = missing.length > 0 ? missing : employees;
  if (source.length === 0) {
    return [
      {
        NIP: '199001012015011001',
        'Nama Lengkap': 'Contoh Pegawai PLN NP',
        'Unit Pelaksana': 'UP Kapuas',
        'Nomor KPS': 'KPS-00012345',
      },
    ];
  }
  return source.map((e) => ({
    NIP: e.nip || '',
    'Nama Lengkap': e.fullName || '',
    'Unit Pelaksana': e.unitPelaksana || 'UP Kapuas',
    'Nomor KPS': e.noKPS || '',
  }));
}
