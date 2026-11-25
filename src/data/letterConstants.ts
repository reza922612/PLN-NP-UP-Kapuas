import {
  LetterClassificationCode,
  LetterCode,
  LetterRequestStatus,
  LetterUnitCode,
  WhatsAppNotificationStatus,
} from '../types';
import {
  buildLetterWhatsAppMessage,
  formatWhatsAppPhone,
  isValidIndonesianWhatsApp,
} from './whatsappConstants';

export { formatWhatsAppPhone, isValidIndonesianWhatsApp };

export interface LetterCodeMeta {
  code: LetterCode;
  label: string;
  description: string;
  recommendedClassification: LetterClassificationCode;
  allowedClassifications: LetterClassificationCode[];
}

export const LETTER_CODE_OPTIONS: LetterCodeMeta[] = [
  {
    code: 'SKT',
    label: 'SKT — Surat Keterangan Kerja & Selesai Magang',
    description: 'Surat Keterangan Kerja dan Surat Keterangan Selesai Magang.',
    recommendedClassification: 'SDM.15.01',
    allowedClassifications: ['SDM.15.01'],
  },
  {
    code: 'BA',
    label: 'BA — Berita Acara Pembayaran',
    description: 'Berita Acara Pembayaran Pekerjaan Fix, Pekerjaan Var, dan Pemakaian BBM.',
    recommendedClassification: 'KEU.01.02',
    allowedClassifications: ['KEU.01.02'],
  },
  {
    code: 'BAPP',
    label: 'BAPP — Berita Acara Pemeriksaan Pekerjaan',
    description: 'Berita Acara Pemeriksaan Pekerjaan untuk Pembayaran Pekerjaan Fix, Pekerjaan Var, dan Pemakaian BBM.',
    recommendedClassification: 'KEU.01.02',
    allowedClassifications: ['KEU.01.02'],
  },
  {
    code: 'BATK',
    label: 'BATK — Berita Acara Tenaga Kerja',
    description: 'Berita Acara Tenaga Kerja (mendukung klasifikasi KEU.01.02 atau SDM.15.01).',
    recommendedClassification: 'KEU.01.02',
    allowedClassifications: ['KEU.01.02', 'SDM.15.01'],
  },
];

export interface LetterClassificationMeta {
  code: LetterClassificationCode;
  label: string;
  description: string;
}

export const LETTER_CLASSIFICATION_OPTIONS: LetterClassificationMeta[] = [
  {
    code: 'KEU.01.02',
    label: 'KEU.01.02 — Keuangan & Berita Acara (BA / BAPP / BATK)',
    description: 'Digunakan untuk Berita Acara Pembayaran (BA), BAPP, dan Berita Acara Tenaga Kerja.',
  },
  {
    code: 'ORG.00.02',
    label: 'ORG.00.02 — SK Tim dan Struktur Organisasi',
    description: 'Khusus untuk SK Tim dan Struktur Organisasi.',
  },
  {
    code: 'SDM.15.01',
    label: 'SDM.15.01 — Surat Keterangan Kerja & Magang',
    description: 'Digunakan untuk Surat Keterangan Kerja, Selesai Magang (SKT), dan Administrasi Tenaga Kerja.',
  },
];

export interface LetterUnitMeta {
  code: LetterUnitCode;
  name: string;
  label: string;
}

export const LETTER_UNIT_OPTIONS: LetterUnitMeta[] = [
  { code: 'UPKS', name: 'UP Kapuas', label: 'UPKS — UP Kapuas' },
  { code: 'ULSR', name: 'UL Sei Raya', label: 'ULSR — UL Sei Raya' },
  { code: 'ULST', name: 'UL Siantan', label: 'ULST — UL Siantan' },
  { code: 'ULKP', name: 'UL Ketapang', label: 'ULKP — UL Ketapang' },
  { code: 'ULSS', name: 'UL Sanggau dan Sintang', label: 'ULSS — UL Sanggau dan Sintang' },
];

export const LETTER_UNIT_LABELS: Record<LetterUnitCode, string> = {
  UPKS: 'UP Kapuas',
  ULSR: 'UL Sei Raya',
  ULST: 'UL Siantan',
  ULKP: 'UL Ketapang',
  ULSS: 'UL Sanggau dan Sintang',
};

export function getDynamicYearOptions(baseDate = new Date()): number[] {
  const currentYear = baseDate.getFullYear();
  const maxYear = Math.max(2028, currentYear + 2);
  const years: number[] = [];
  for (let y = 2024; y <= maxYear; y += 1) {
    years.push(y);
  }
  return years;
}

export function getLetterCodeMeta(code: LetterCode): LetterCodeMeta {
  return LETTER_CODE_OPTIONS.find((item) => item.code === code) || LETTER_CODE_OPTIONS[0];
}

export function getAllowedClassificationsForCode(code: LetterCode): LetterClassificationCode[] {
  return getLetterCodeMeta(code).allowedClassifications;
}

export function isValidLetterCombination(
  kodeSurat: LetterCode,
  kodeKlasifikasi: LetterClassificationCode
): { valid: boolean; reason?: string } {
  const meta = getLetterCodeMeta(kodeSurat);
  if (meta.allowedClassifications.includes(kodeKlasifikasi)) {
    return { valid: true };
  }

  if (kodeKlasifikasi === 'ORG.00.02') {
    return {
      valid: false,
      reason: `Kode Klasifikasi ORG.00.02 khusus untuk SK Tim dan Struktur Organisasi, tidak dapat digunakan dengan kode surat ${kodeSurat}. Gunakan ${meta.allowedClassifications.join(' atau ')}.`,
    };
  }

  return {
    valid: false,
    reason: `Kombinasi tidak sesuai ketentuan: Kode surat ${kodeSurat} wajib menggunakan klasifikasi ${meta.allowedClassifications.join(' atau ')}.`,
  };
}

export function formatSequenceLabel(sequenceNumber: number): string {
  return String(Math.max(1, Math.floor(sequenceNumber))).padStart(3, '0');
}

export function formatNomorSurat(
  sequenceNumber: number,
  kodeSurat: LetterCode,
  kodeKlasifikasi: LetterClassificationCode,
  unitKode: LetterUnitCode,
  tahun: number
): string {
  return `${formatSequenceLabel(sequenceNumber)}.${kodeSurat}/${kodeKlasifikasi}/${unitKode}/${tahun}`;
}

export function mapUnitPelaksanaToLetterUnit(unitPelaksana?: string): LetterUnitCode {
  const lower = (unitPelaksana || '').toLowerCase();
  if (lower.includes('sei raya') || lower.includes('sungai raya')) return 'ULSR';
  if (lower.includes('siantan')) return 'ULST';
  if (lower.includes('ketapang')) return 'ULKP';
  if (lower.includes('sanggau') || lower.includes('sintang')) return 'ULSS';
  return 'UPKS';
}

export const LETTER_STATUS_META: Record<
  LetterRequestStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  Diterbitkan: {
    label: 'Diterbitkan',
    badgeClass:
      'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60',
    dotClass: 'bg-emerald-500',
  },
  Dibatalkan: {
    label: 'Dibatalkan',
    badgeClass:
      'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60',
    dotClass: 'bg-red-500',
  },
};

export const WHATSAPP_STATUS_META: Record<
  WhatsAppNotificationStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  Terkirim: {
    label: 'Terkirim',
    badgeClass:
      'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60',
    dotClass: 'bg-emerald-500',
  },
  'Menunggu Pengiriman': {
    label: 'Menunggu Pengiriman',
    badgeClass:
      'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60',
    dotClass: 'bg-amber-500',
  },
  Gagal: {
    label: 'Gagal',
    badgeClass:
      'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60',
    dotClass: 'bg-red-500',
  },
};

export function buildWhatsAppPreviewMessage(params: {
  namaPengaju: string;
  nomorSurat: string;
  nip: string;
  bidang: string;
  tanggalPengajuan: string;
  unitLabel: string;
}): string {
  return buildLetterWhatsAppMessage(params);
}
