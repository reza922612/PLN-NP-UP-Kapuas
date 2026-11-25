import { auth } from '../lib/firebase';
import {
  SppdRequest,
  VehicleLoanRequest,
  WhatsAppNotificationStatus,
} from '../types';

export const SIMAP_WHATSAPP_NUMBER_LOCAL = '085111320701';
export const SIMAP_WHATSAPP_NUMBER_E164 = '+6285111320701';
export const SIMAP_WHATSAPP_NUMBER_DIGITS = '6285111320701';
export const SIMAP_WHATSAPP_DISPLAY = '0851-1132-0701 (+6285111320701)';

export interface WhatsAppDispatchResult {
  sent: boolean;
  configured?: boolean;
  provider?: string | null;
  senderNumber?: string;
  status: WhatsAppNotificationStatus;
  messageId?: string | null;
  error?: string | null;
}

export interface WhatsAppGatewayStatus {
  configured: boolean;
  provider: string | null;
  senderNumber: string;
  senderE164: string;
  checked: boolean;
  backendAvailable: boolean;
}

export function formatWhatsAppPhone(input: string): string {
  const cleaned = String(input || '').trim();
  if (!cleaned) return '';
  const digits = cleaned.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) {
    return `+62${digits.slice(1)}`;
  }
  if (digits.startsWith('62')) {
    return `+${digits}`;
  }
  if (digits.startsWith('8')) {
    return `+62${digits}`;
  }
  return `+${digits}`;
}

export function isValidIndonesianWhatsApp(phone: string): boolean {
  const normalized = formatWhatsAppPhone(phone);
  return /^\+628[0-9]{7,13}$/.test(normalized) || /^\+62[0-9]{8,14}$/.test(normalized);
}

export function toWaMeLink(recipientPhone: string, message: string): string {
  const normalized = formatWhatsAppPhone(recipientPhone);
  const digits = normalized.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function resolveApiBaseUrl(): string {
  const raw = String((import.meta as any).env?.VITE_API_BASE_URL || '').trim();
  if (!raw) return '';
  return raw.replace(/\/+$/, '');
}

export function buildApiUrl(apiPath: string): string {
  const base = resolveApiBaseUrl();
  return base ? `${base}${apiPath}` : apiPath;
}

export function buildLetterWhatsAppMessage(params: {
  namaPengaju: string;
  nomorSurat: string;
  nip: string;
  bidang: string;
  tanggalPengajuan: string;
  unitLabel: string;
}): string {
  return [
    `Yth. Bapak/Ibu ${params.namaPengaju},`,
    '',
    'Pengajuan Nomor Surat/Berita Acara Anda telah berhasil diproses melalui SIMAP UP Kapuas.',
    '',
    'Berikut detail nomor yang telah diterbitkan:',
    '',
    'Nomor Surat:',
    `*${params.nomorSurat}*`,
    '',
    `Nama: ${params.namaPengaju}`,
    `NIP: ${params.nip}`,
    `Bidang: ${params.bidang}`,
    `Tanggal Pengajuan: ${params.tanggalPengajuan}`,
    `Unit: ${params.unitLabel}`,
    '',
    'Terima kasih telah menggunakan layanan digital SIMAP UP Kapuas.',
    '',
    'PT PLN Nusantara Power',
    'Unit Pembangkitan Kapuas',
    `WhatsApp Resmi SIMAP: ${SIMAP_WHATSAPP_NUMBER_LOCAL}`,
  ].join('\n');
}

export function buildSppdWhatsAppMessage(sppd: {
  requestNumber: string;
  namaPegawai: string;
  nip: string;
  unitKerja: string;
  bidang: string;
  jenisSppd: string;
  judulPerjalanan: string;
  kotaKeberangkatan: string;
  kotaTujuan: string;
  tanggalKeberangkatan: string;
  tanggalKembali: string;
  jenisTransportasi: string;
  status: SppdRequest['status'];
  approvalNotes?: string | null;
}): string {
  const statusHeadline: Record<SppdRequest['status'], string> = {
    Draft: 'Pengajuan SPPD Anda tersimpan sebagai Draft di SIMAP UP Kapuas.',
    Submitted: 'Pengajuan SPPD Anda telah diterima oleh SIMAP UP Kapuas.',
    'Menunggu Approval': 'Pengajuan SPPD Anda telah masuk dan sedang menunggu persetujuan Admin/Pejabat.',
    Approved: 'Selamat, pengajuan SPPD Anda telah DISETUJUI.',
    Rejected: 'Mohon perhatian, pengajuan SPPD Anda DITOLAK / perlu perbaikan.',
    Completed: 'Perjalanan dinas (SPPD) Anda telah ditandai SELESAI.',
  };

  const lines = [
    `Yth. Bapak/Ibu ${sppd.namaPegawai},`,
    '',
    statusHeadline[sppd.status] || `Status pengajuan SPPD Anda: ${sppd.status}.`,
    '',
    'Detail Pengajuan SPPD:',
    `No. SPPD: *${sppd.requestNumber}*`,
    `Status: *${sppd.status}*`,
    `Nama / NIP: ${sppd.namaPegawai} (${sppd.nip})`,
    `Unit / Bidang: ${sppd.unitKerja} · ${sppd.bidang}`,
    `Jenis: ${sppd.jenisSppd}`,
    `Perihal: ${sppd.judulPerjalanan}`,
    `Rute: ${sppd.kotaKeberangkatan} → ${sppd.kotaTujuan}`,
    `Jadwal: ${sppd.tanggalKeberangkatan} s.d. ${sppd.tanggalKembali}`,
    `Transportasi: ${sppd.jenisTransportasi}`,
  ];

  if (sppd.approvalNotes) {
    lines.push(`Catatan Approval: ${sppd.approvalNotes}`);
  }

  lines.push(
    '',
    'Terima kasih telah menggunakan layanan digital SIMAP UP Kapuas.',
    '',
    'PT PLN Nusantara Power',
    'Unit Pembangkitan Kapuas',
    `WhatsApp Resmi SIMAP: ${SIMAP_WHATSAPP_NUMBER_LOCAL}`
  );

  return lines.join('\n');
}

export function buildVehicleLoanWhatsAppMessage(loan: {
  loanNumber: string;
  nama: string;
  pemohonNama: string;
  tujuan: string;
  keperluan: string;
  tanggalDipergunakan: string;
  jamMulai: string;
  jamSelesai: string;
  bidang: string;
  status: VehicleLoanRequest['status'];
  rejectionReason?: string | null;
  perintahJalan?: VehicleLoanRequest['perintahJalan'];
}): string {
  const statusHeadline: Record<VehicleLoanRequest['status'], string> = {
    'Menunggu Persetujuan':
      'Pengajuan Peminjaman Kendaraan Dinas Anda telah tercatat dan sedang menunggu persetujuan Admin.',
    Disetujui:
      'Pengajuan Peminjaman Kendaraan Dinas Anda telah DISETUJUI. Menunggu penerbitan Perintah Jalan oleh PIC.',
    'Perintah Jalan Terbit':
      'Perintah Jalan Kendaraan Dinas Anda telah TERBIT dan siap digunakan sesuai jadwal.',
    'Sedang Berpergian':
      'Status Peminjaman Kendaraan Dinas Anda saat ini: SEDANG BEPERGIAN.',
    Selesai:
      'Peminjaman Kendaraan Dinas Anda telah ditandai SELESAI.',
    Ditolak:
      'Mohon maaf, pengajuan Peminjaman Kendaraan Dinas Anda DITOLAK.',
  };

  const lines = [
    `Yth. Bapak/Ibu ${loan.pemohonNama || loan.nama},`,
    '',
    statusHeadline[loan.status] || `Status peminjaman kendaraan: ${loan.status}.`,
    '',
    'Detail Peminjaman Kendaraan:',
    `No. Pengajuan: *${loan.loanNumber}*`,
    `Status: *${loan.status}*`,
    `Pemohon: ${loan.pemohonNama || loan.nama}`,
    `Bidang: ${loan.bidang}`,
    `Tujuan: ${loan.tujuan}`,
    `Keperluan: ${loan.keperluan}`,
    `Jadwal: ${loan.tanggalDipergunakan} (${loan.jamMulai} – ${loan.jamSelesai})`,
  ];

  if (loan.perintahJalan) {
    lines.push(
      '',
      'Informasi Perintah Jalan:',
      `Kendaraan: *${loan.perintahJalan.kendaraanNoPol}* (${loan.perintahJalan.kendaraanNama})`,
      `Pengemudi / Driver: ${loan.perintahJalan.driverNama}`,
      `Jam Berangkat: ${loan.perintahJalan.berangkatJam}`
    );
  }

  if (loan.status === 'Ditolak' && loan.rejectionReason) {
    lines.push(`Alasan Penolakan: ${loan.rejectionReason}`);
  }

  lines.push(
    '',
    'Terima kasih telah menggunakan layanan digital SIMAP UP Kapuas.',
    '',
    'PT PLN Nusantara Power',
    'Unit Pembangkitan Kapuas',
    `WhatsApp Resmi SIMAP: ${SIMAP_WHATSAPP_NUMBER_LOCAL}`
  );

  return lines.join('\n');
}

export async function fetchWhatsAppGatewayStatus(): Promise<WhatsAppGatewayStatus> {
  const defaultStatus: WhatsAppGatewayStatus = {
    configured: false,
    provider: null,
    senderNumber: SIMAP_WHATSAPP_NUMBER_LOCAL,
    senderE164: SIMAP_WHATSAPP_NUMBER_E164,
    checked: true,
    backendAvailable: true,
  };

  const currentUser = auth.currentUser;
  if (!currentUser) {
    return defaultStatus;
  }

  try {
    const idToken = await currentUser.getIdToken();
    const resp = await fetch(buildApiUrl('/api/whatsapp/status'), {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const contentType = resp.headers.get('content-type') || '';
    if (!resp.ok || !contentType.includes('application/json')) {
      return {
        ...defaultStatus,
        backendAvailable: resp.status !== 404 && contentType.includes('application/json'),
      };
    }
    const data = (await resp.json()) as {
      configured?: boolean;
      provider?: string | null;
      senderNumber?: string;
      senderE164?: string;
    };
    return {
      configured: Boolean(data?.configured),
      provider: data?.provider || null,
      senderNumber: data?.senderNumber || SIMAP_WHATSAPP_NUMBER_LOCAL,
      senderE164: data?.senderE164 || SIMAP_WHATSAPP_NUMBER_E164,
      checked: true,
      backendAvailable: true,
    };
  } catch {
    return {
      ...defaultStatus,
      backendAvailable: false,
    };
  }
}

export type SimapWhatsAppPayload =
  | {
      category: 'letter_number';
      nomorWhatsapp: string;
      nomorSurat: string;
      namaPengaju: string;
      nip: string;
      bidang: string;
      tanggalPengajuan: string;
      unitLabel: string;
    }
  | {
      category: 'sppd';
      nomorWhatsapp: string;
      requestNumber: string;
      namaPegawai: string;
      nip: string;
      unitKerja: string;
      bidang: string;
      jenisSppd: string;
      judulPerjalanan: string;
      kotaKeberangkatan: string;
      kotaTujuan: string;
      tanggalKeberangkatan: string;
      tanggalKembali: string;
      jenisTransportasi: string;
      status: SppdRequest['status'];
      approvalNotes?: string | null;
    }
  | {
      category: 'vehicle_loan';
      nomorWhatsapp: string;
      loanNumber: string;
      nama: string;
      pemohonNama: string;
      tujuan: string;
      keperluan: string;
      tanggalDipergunakan: string;
      jamMulai: string;
      jamSelesai: string;
      bidang: string;
      status: VehicleLoanRequest['status'];
      rejectionReason?: string | null;
      kendaraanNoPol?: string | null;
      kendaraanNama?: string | null;
      driverNama?: string | null;
      berangkatJam?: string | null;
    };

export async function dispatchSimapWhatsAppNotification(
  payload: SimapWhatsAppPayload
): Promise<WhatsAppDispatchResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return {
      sent: false,
      senderNumber: SIMAP_WHATSAPP_NUMBER_LOCAL,
      status: 'Gagal',
      error: 'Sesi login tidak aktif.',
    };
  }

  const normalizedPhone = formatWhatsAppPhone(payload.nomorWhatsapp);
  if (!isValidIndonesianWhatsApp(normalizedPhone)) {
    return {
      sent: false,
      senderNumber: SIMAP_WHATSAPP_NUMBER_LOCAL,
      status: 'Gagal',
      error: 'Nomor WhatsApp penerima tidak valid atau belum diisi (+628xxxxxxxxxx).',
    };
  }

  try {
    const idToken = await currentUser.getIdToken();
    const resp = await fetch(buildApiUrl('/api/whatsapp/send-notification'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        ...payload,
        nomorWhatsapp: normalizedPhone,
      }),
    });

    const contentType = resp.headers.get('content-type') || '';
    const json = contentType.includes('application/json')
      ? ((await resp.json().catch(() => ({}))) as {
          sent?: boolean;
          configured?: boolean;
          provider?: string | null;
          senderNumber?: string;
          messageId?: string;
          error?: string;
        })
      : {};

    if (resp.ok && json.sent === true && json.messageId) {
      return {
        sent: true,
        configured: Boolean(json.configured ?? true),
        provider: json.provider || null,
        senderNumber: json.senderNumber || SIMAP_WHATSAPP_NUMBER_LOCAL,
        status: 'Terkirim',
        messageId: json.messageId,
        error: null,
      };
    }

    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const fallback404 =
      resp.status === 404
        ? `Endpoint API WhatsApp tidak tersedia di hosting statis (${currentOrigin || 'HTTP 404'}). Gunakan tombol Kirim via WhatsApp Web (pengirim SIMAP ${SIMAP_WHATSAPP_NUMBER_LOCAL}) atau jalankan dari server full-stack (npm run start) dengan token gateway aktif.`
        : `Pengiriman WhatsApp dari ${SIMAP_WHATSAPP_NUMBER_LOCAL} gagal (HTTP ${resp.status}).`;

    return {
      sent: false,
      configured: Boolean(json.configured),
      provider: json.provider || null,
      senderNumber: json.senderNumber || SIMAP_WHATSAPP_NUMBER_LOCAL,
      status: 'Gagal',
      messageId: null,
      error: json.error || fallback404,
    };
  } catch (err: any) {
    return {
      sent: false,
      senderNumber: SIMAP_WHATSAPP_NUMBER_LOCAL,
      status: 'Gagal',
      error: err?.message || 'Koneksi ke layanan WhatsApp Gateway gagal.',
    };
  }
}
