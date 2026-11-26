import {
  ExternalMutationDirection,
  MutationApprovalStatus,
  MutationCategory,
  MutationType,
} from '../types';
import { SPPD_BIDANG_OPTIONS, SPPD_UNIT_KERJA_OPTIONS } from './sppdConstants';

export const MUTATION_UNIT_KERJA_OPTIONS = [...SPPD_UNIT_KERJA_OPTIONS] as const;

export const MUTATION_ALL_BIDANG_OPTIONS = [...SPPD_BIDANG_OPTIONS] as const;

export const UP_KAPUAS_BIDANG_OPTIONS = SPPD_BIDANG_OPTIONS.filter(
  (b) => !b.endsWith(' UL')
);

export const UL_UNIT_BIDANG_OPTIONS = SPPD_BIDANG_OPTIONS.filter(
  (b) => b.endsWith(' UL')
);

export function getBidangOptionsByUnit(unitKerja?: string): string[] {
  const normalized = (unitKerja || '').trim().toLowerCase();
  if (!normalized) return [...SPPD_BIDANG_OPTIONS];
  if (
    normalized.includes('ulpl') ||
    normalized.includes('sei raya') ||
    normalized.includes('siantan') ||
    normalized.includes('sanggau') ||
    normalized.includes('sintang') ||
    normalized.includes('ketapang')
  ) {
    return [...UL_UNIT_BIDANG_OPTIONS];
  }
  if (normalized.includes('up kapuas')) {
    return [...UP_KAPUAS_BIDANG_OPTIONS];
  }
  return [...SPPD_BIDANG_OPTIONS];
}

export function resolveCurrentBidang(
  bidang?: string,
  subUnit?: string,
  unitPelaksana?: string
): string {
  const raw = (bidang || subUnit || '').trim();
  if (!raw) {
    return getBidangOptionsByUnit(unitPelaksana)[0] || SPPD_BIDANG_OPTIONS[0];
  }
  const exact = SPPD_BIDANG_OPTIONS.find(
    (opt) => opt.toLowerCase() === raw.toLowerCase()
  );
  if (exact) return exact;
  return raw;
}

export const INTERNAL_MUTATION_SUBTYPES = [
  'Perpindahan Antarbidang di UP Kapuas',
  'Perpindahan Antarunit Layanan',
  'Perubahan Jabatan dalam Unit Kerja',
  'Perubahan Jabatan & Unit Kerja',
] as const;

export const EXTERNAL_MUTATION_SUBTYPES: Record<ExternalMutationDirection, string[]> = {
  Masuk: [
    'Mutasi Masuk dari Unit / Kantor Lain PT PLN Nusantara Power',
    'Mutasi Masuk dari PLN Holding / Entitas Lain',
  ],
  Keluar: [
    'Mutasi Keluar Menuju Unit / Kantor Lain PT PLN Nusantara Power',
    'Mutasi Keluar Menuju PLN Holding / Entitas Lain',
  ],
};

export const MUTATION_CATEGORY_OPTIONS: MutationCategory[] = [
  'Mutasi Unit',
  'Mutasi Jabatan',
  'Mutasi Unit dan Jabatan',
];

export const EXTERNAL_ENTITY_SUGGESTIONS = [
  'PT PLN Nusantara Power Kantor Pusat',
  'PT PLN Nusantara Power UP Muara Karang',
  'PT PLN Nusantara Power UP Paiton',
  'PT PLN Nusantara Power UP Gresik',
  'PT PLN Nusantara Power UP Cirata',
  'PT PLN Nusantara Power UP Muara Tawar',
  'PT PLN Nusantara Power UP Asam-Asam',
  'PT PLN Nusantara Power UP Pulang Pisau',
  'PT PLN (Persero) Kantor Pusat (Holding)',
  'PT PLN (Persero) UID Kalimantan Barat',
  'PT PLN Indonesia Power',
];

export const MUTATION_STATUS_META: Record<
  MutationApprovalStatus,
  {
    label: string;
    badgeClass: string;
    description: string;
  }
> = {
  'Menunggu Persetujuan': {
    label: 'Menunggu Persetujuan',
    badgeClass:
      'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60',
    description: 'Pengajuan baru menunggu verifikasi dan persetujuan pejabat berwenang.',
  },
  Disetujui: {
    label: 'Disetujui (Terjadwal)',
    badgeClass:
      'bg-[#EAF6FC] dark:bg-[#0072BC]/25 text-[#0072BC] dark:text-[#72C8F1] border border-[#72C8F1]/40 dark:border-[#0072BC]/40',
    description: 'Telah disetujui dan akan diterapkan otomatis sesuai tanggal efektif.',
  },
  Diterapkan: {
    label: 'Disetujui & Diterapkan',
    badgeClass:
      'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60',
    description: 'Data pegawai utama telah diperbarui permanen dan tercatat di riwayat.',
  },
  Ditolak: {
    label: 'Ditolak',
    badgeClass:
      'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60',
    description: 'Pengajuan mutasi ditolak dan tidak mengubah data pegawai.',
  },
};

export function inferMutationTypeBadge(
  jenis: MutationType,
  arah?: ExternalMutationDirection | null
): string {
  if (jenis === 'Internal') return 'Mutasi Internal';
  if (arah === 'Masuk') return 'Eksternal · Masuk';
  if (arah === 'Keluar') return 'Eksternal · Keluar';
  return 'Mutasi Eksternal';
}
