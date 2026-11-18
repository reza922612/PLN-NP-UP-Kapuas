import { SppdStatus, SppdTransportType, SppdType, SppdUnitWork } from '../types';

export const SPPD_BIDANG_OPTIONS = [
  'Manager UP',
  'Bidang Operasi',
  'Bidang Operasi - Rendal Operasi dan Niaga',
  'Bidang Operasi - Bahan Bakar',
  'Bidang Pemeliharaan',
  'Bidang Pemeliharaan - Rendal Pemeliharaan',
  'Bidang Pemeliharaan - Management Outage',
  'Bidang Pemeliharaan - Inventory Control dan Gudang',
  'Bidang Engineering',
  'Bidang Engineering - System Owner',
  'Bidang Engineering - Manajemen Mutu, Risiko dan Kepatuhan',
  'Bidang Engineering - Condition Based Maintenance',
  'Bidang Business Support',
  'Bidang Business Support - Keuangan dan Akuntansi',
  'Bidang Business Support - SDM, Umum dan CSR',
  'Bidang Business Support - Pengadaan',
  'Bidang K3 dan Keamanan',
  'Bidang Lingkungan',
  'Manager UL',
  'Bidang Operasi UL',
  'Bidang Pemeliharaan UL',
  'Bidang K3, Lingkungan dan Keamanan UL',
  'Bidang Operasi dan Pemeliharaan UL',
] as const;

export const SPPD_UNIT_KERJA_OPTIONS: SppdUnitWork[] = [
  'UP Kapuas',
  'ULPLTD Sei Raya',
  'ULPLTG/D Siantan',
  'ULPLTD Sanggau dan Sintang',
  'ULPLTD Ketapang',
];

export const SPPD_JENIS_OPTIONS: SppdType[] = ['SPPD Diklat', 'SPPD Non Diklat'];

export const SPPD_TRANSPORT_OPTIONS: SppdTransportType[] = [
  'Pesawat (Angkutan Udara)',
  'Bus / Taksi (Angkutan Darat)',
  'Kendaraan Dinas',
];

export const SPPD_STATUS_OPTIONS: SppdStatus[] = [
  'Draft',
  'Submitted',
  'Menunggu Approval',
  'Approved',
  'Rejected',
  'Completed',
];

export const SPPD_CITY_SUGGESTIONS: string[] = [
  'Pontianak',
  'Kubu Raya',
  'Singkawang',
  'Ketapang',
  'Sanggau',
  'Sintang',
  'Putussibau',
  'Sekadau',
  'Melawi',
  'Sambas',
  'Mempawah',
  'Jakarta',
  'Tangerang',
  'Bandung',
  'Surabaya',
  'Sidoarjo',
  'Semarang',
  'Yogyakarta',
  'Balikpapan',
  'Samarinda',
  'Banjarmasin',
  'Palangkaraya',
  'Makassar',
  'Medan',
  'Denpasar',
];

export const SPPD_STATUS_META: Record<
  SppdStatus,
  {
    label: string;
    badgeClass: string;
    dotClass: string;
    description: string;
  }
> = {
  Draft: {
    label: 'Draft',
    badgeClass:
      'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    dotClass: 'bg-slate-400',
    description: 'Tersimpan sementara, belum diajukan untuk persetujuan.',
  },
  Submitted: {
    label: 'Submitted',
    badgeClass:
      'bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1] border border-[#72C8F1]/40 dark:border-[#0072BC]/40',
    dotClass: 'bg-[#0072BC]',
    description: 'Pengajuan telah dikirim ke sistem administrasi.',
  },
  'Menunggu Approval': {
    label: 'Menunggu Approval',
    badgeClass:
      'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60',
    dotClass: 'bg-amber-500',
    description: 'Sedang menunggu peninjauan dan persetujuan atasan/admin.',
  },
  Approved: {
    label: 'Approved',
    badgeClass:
      'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60',
    dotClass: 'bg-emerald-500',
    description: 'Perjalanan dinas telah disetujui.',
  },
  Rejected: {
    label: 'Rejected',
    badgeClass:
      'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60',
    dotClass: 'bg-red-500',
    description: 'Pengajuan ditolak dan dapat diperbaiki untuk diajukan kembali.',
  },
  Completed: {
    label: 'Completed',
    badgeClass:
      'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60',
    dotClass: 'bg-indigo-500',
    description: 'Perjalanan dinas beserta pertanggungjawaban telah selesai.',
  },
};

export function mapUnitPelaksanaToSppdUnit(unitName?: string): SppdUnitWork {
  const lower = (unitName || '').toLowerCase();
  if (lower.includes('sei raya') || lower.includes('sungai raya')) return 'ULPLTD Sei Raya';
  if (lower.includes('siantan')) return 'ULPLTG/D Siantan';
  if (lower.includes('sanggau') || lower.includes('sintang')) return 'ULPLTD Sanggau dan Sintang';
  if (lower.includes('ketapang')) return 'ULPLTD Ketapang';
  return 'UP Kapuas';
}
