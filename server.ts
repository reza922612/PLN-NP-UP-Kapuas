import dotenv from "dotenv";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();
if (fs.existsSync(path.join(process.cwd(), ".env.local"))) {
  dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: true });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FirebaseClientConfig {
  apiKey?: string;
  projectId?: string;
}

function loadFirebaseConfig(): FirebaseClientConfig {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch (err) {
    console.warn("Unable to read firebase-applet-config.json:", err);
  }
  return {};
}

async function verifyFirebaseIdToken(idToken: string): Promise<{ uid: string; email?: string } | null> {
  const cfg = loadFirebaseConfig();
  if (!cfg.apiKey || !idToken) return null;

  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(cfg.apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      users?: Array<{ localId?: string; email?: string }>;
    };
    const user = data?.users?.[0];
    if (!user?.localId) return null;
    return { uid: user.localId, email: user.email };
  } catch {
    return null;
  }
}

function isAllowedGatewayUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host === "169.254.169.254" ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function resolveSimapSender() {
  const raw = (process.env.WHATSAPP_SENDER_NUMBER || "085111320701").trim() || "085111320701";
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`;
  } else if (digits.startsWith("8")) {
    digits = `62${digits}`;
  }
  if (!/^62[0-9]{8,14}$/.test(digits)) {
    digits = "6285111320701";
  }
  const local = digits.startsWith("62") ? `0${digits.slice(2)}` : raw;
  return {
    local,
    digits,
    e164: `+${digits}`,
  };
}

function resolveWhatsAppConfig() {
  const explicitProvider = (process.env.WHATSAPP_PROVIDER || "").trim().toLowerCase();
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim();
  const accessToken = (process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
  const apiVersion = (process.env.WHATSAPP_API_VERSION || "v21.0").trim();
  const gatewayUrl = (process.env.WHATSAPP_GATEWAY_URL || "").trim();
  const gatewayToken = (process.env.WHATSAPP_GATEWAY_TOKEN || "").trim();

  if (
    (explicitProvider === "meta" || (!explicitProvider && phoneNumberId && accessToken)) &&
    phoneNumberId &&
    accessToken
  ) {
    return {
      configured: true,
      provider: "meta",
      phoneNumberId,
      accessToken,
      apiVersion,
    } as const;
  }

  if (gatewayUrl && gatewayToken && isAllowedGatewayUrl(gatewayUrl)) {
    return {
      configured: true,
      provider: explicitProvider || "gateway",
      gatewayUrl,
      gatewayToken,
    } as const;
  }

  return {
    configured: false,
    provider: null,
  } as const;
}

function normalizeWaRecipient(rawPhone: string): string | null {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  let normalized = digits;
  if (normalized.startsWith("0")) {
    normalized = `62${normalized.slice(1)}`;
  } else if (normalized.startsWith("8")) {
    normalized = `62${normalized}`;
  }
  if (!/^62[0-9]{8,14}$/.test(normalized)) {
    return null;
  }
  return normalized;
}

function clampField(value: unknown, maxLen: number): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, maxLen);
}

function buildLetterMessageText(body: Record<string, unknown>, senderLocal: string): string | null {
  const nomorSurat = clampField(body?.nomorSurat, 128);
  const namaPengaju = clampField(body?.namaPengaju, 200);
  const nip = clampField(body?.nip, 64);
  const bidang = clampField(body?.bidang, 128);
  const tanggalPengajuan = clampField(body?.tanggalPengajuan, 32);
  const unitLabel = clampField(body?.unitLabel, 128);

  if (!nomorSurat || !namaPengaju || !nip || !bidang || !tanggalPengajuan || !unitLabel) {
    return null;
  }

  return [
    `Yth. Bapak/Ibu ${namaPengaju},`,
    ``,
    `Pengajuan Nomor Surat/Berita Acara Anda telah berhasil diproses melalui SIMAP UP Kapuas.`,
    ``,
    `Berikut detail nomor yang telah diterbitkan:`,
    ``,
    `Nomor Surat:`,
    `*${nomorSurat}*`,
    ``,
    `Nama: ${namaPengaju}`,
    `NIP: ${nip}`,
    `Bidang: ${bidang}`,
    `Tanggal Pengajuan: ${tanggalPengajuan}`,
    `Unit: ${unitLabel}`,
    ``,
    `Terima kasih telah menggunakan layanan digital SIMAP UP Kapuas.`,
    ``,
    `PT PLN Nusantara Power`,
    `Unit Pembangkitan Kapuas`,
    `WhatsApp Resmi SIMAP: ${senderLocal}`,
  ].join("\n");
}

function buildSppdMessageText(body: Record<string, unknown>, senderLocal: string): string | null {
  const requestNumber = clampField(body?.requestNumber, 64);
  const namaPegawai = clampField(body?.namaPegawai, 200);
  const nip = clampField(body?.nip, 64);
  const unitKerja = clampField(body?.unitKerja, 128);
  const bidang = clampField(body?.bidang, 128);
  const jenisSppd = clampField(body?.jenisSppd, 64);
  const judulPerjalanan = clampField(body?.judulPerjalanan, 300);
  const kotaKeberangkatan = clampField(body?.kotaKeberangkatan, 128);
  const kotaTujuan = clampField(body?.kotaTujuan, 128);
  const tanggalKeberangkatan = clampField(body?.tanggalKeberangkatan, 32);
  const tanggalKembali = clampField(body?.tanggalKembali, 32);
  const jenisTransportasi = clampField(body?.jenisTransportasi, 128);
  const status = clampField(body?.status, 64);
  const approvalNotes = clampField(body?.approvalNotes, 512);

  if (!requestNumber || !namaPegawai || !judulPerjalanan || !status) {
    return null;
  }

  const headlines: Record<string, string> = {
    Draft: "Pengajuan SPPD Anda tersimpan sebagai Draft di SIMAP UP Kapuas.",
    Submitted: "Pengajuan SPPD Anda telah diterima oleh SIMAP UP Kapuas.",
    "Menunggu Approval":
      "Pengajuan SPPD Anda telah masuk dan sedang menunggu persetujuan Admin/Pejabat.",
    Approved: "Selamat, pengajuan SPPD Anda telah DISETUJUI.",
    Rejected: "Mohon perhatian, pengajuan SPPD Anda DITOLAK / perlu perbaikan.",
    Completed: "Perjalanan dinas (SPPD) Anda telah ditandai SELESAI.",
  };

  const lines = [
    `Yth. Bapak/Ibu ${namaPegawai},`,
    ``,
    headlines[status] || `Status pengajuan SPPD Anda: ${status}.`,
    ``,
    `Detail Pengajuan SPPD:`,
    `No. SPPD: *${requestNumber}*`,
    `Status: *${status}*`,
    `Nama / NIP: ${namaPegawai} (${nip || "-"})`,
    `Unit / Bidang: ${unitKerja || "-"} · ${bidang || "-"}`,
    `Jenis: ${jenisSppd || "-"}`,
    `Perihal: ${judulPerjalanan}`,
    `Rute: ${kotaKeberangkatan || "-"} → ${kotaTujuan || "-"}`,
    `Jadwal: ${tanggalKeberangkatan || "-"} s.d. ${tanggalKembali || "-"}`,
    `Transportasi: ${jenisTransportasi || "-"}`,
  ];

  if (approvalNotes) {
    lines.push(`Catatan Approval: ${approvalNotes}`);
  }

  lines.push(
    ``,
    `Terima kasih telah menggunakan layanan digital SIMAP UP Kapuas.`,
    ``,
    `PT PLN Nusantara Power`,
    `Unit Pembangkitan Kapuas`,
    `WhatsApp Resmi SIMAP: ${senderLocal}`
  );

  return lines.join("\n");
}

function buildVehicleLoanMessageText(body: Record<string, unknown>, senderLocal: string): string | null {
  const loanNumber = clampField(body?.loanNumber, 64);
  const pemohonNama = clampField(body?.pemohonNama || body?.nama, 200);
  const bidang = clampField(body?.bidang, 128);
  const tujuan = clampField(body?.tujuan, 300);
  const keperluan = clampField(body?.keperluan, 500);
  const tanggalDipergunakan = clampField(body?.tanggalDipergunakan, 32);
  const jamMulai = clampField(body?.jamMulai, 16);
  const jamSelesai = clampField(body?.jamSelesai, 16);
  const status = clampField(body?.status, 64);
  const rejectionReason = clampField(body?.rejectionReason, 512);
  const kendaraanNoPol = clampField(body?.kendaraanNoPol, 32);
  const kendaraanNama = clampField(body?.kendaraanNama, 150);
  const driverNama = clampField(body?.driverNama, 200);
  const berangkatJam = clampField(body?.berangkatJam, 16);

  if (!loanNumber || !pemohonNama || !tujuan || !status) {
    return null;
  }

  const headlines: Record<string, string> = {
    "Menunggu Persetujuan":
      "Pengajuan Peminjaman Kendaraan Dinas Anda telah tercatat dan sedang menunggu persetujuan Admin.",
    Disetujui:
      "Pengajuan Peminjaman Kendaraan Dinas Anda telah DISETUJUI. Menunggu penerbitan Perintah Jalan oleh PIC.",
    "Perintah Jalan Terbit":
      "Perintah Jalan Kendaraan Dinas Anda telah TERBIT dan siap digunakan sesuai jadwal.",
    "Sedang Berpergian": "Status Peminjaman Kendaraan Dinas Anda saat ini: SEDANG BEPERGIAN.",
    Selesai: "Peminjaman Kendaraan Dinas Anda telah ditandai SELESAI.",
    Ditolak: "Mohon maaf, pengajuan Peminjaman Kendaraan Dinas Anda DITOLAK.",
  };

  const lines = [
    `Yth. Bapak/Ibu ${pemohonNama},`,
    ``,
    headlines[status] || `Status peminjaman kendaraan: ${status}.`,
    ``,
    `Detail Peminjaman Kendaraan:`,
    `No. Pengajuan: *${loanNumber}*`,
    `Status: *${status}*`,
    `Pemohon: ${pemohonNama}`,
    `Bidang: ${bidang || "-"}`,
    `Tujuan: ${tujuan}`,
    `Keperluan: ${keperluan || "-"}`,
    `Jadwal: ${tanggalDipergunakan || "-"} (${jamMulai || "-"} – ${jamSelesai || "-"})`,
  ];

  if (kendaraanNoPol) {
    lines.push(
      ``,
      `Informasi Perintah Jalan:`,
      `Kendaraan: *${kendaraanNoPol}* (${kendaraanNama || "-"})`,
      `Pengemudi / Driver: ${driverNama || "-"}`,
      `Jam Berangkat: ${berangkatJam || "-"}`
    );
  }

  if (status === "Ditolak" && rejectionReason) {
    lines.push(`Alasan Penolakan: ${rejectionReason}`);
  }

  lines.push(
    ``,
    `Terima kasih telah menggunakan layanan digital SIMAP UP Kapuas.`,
    ``,
    `PT PLN Nusantara Power`,
    `Unit Pembangkitan Kapuas`,
    `WhatsApp Resmi SIMAP: ${senderLocal}`
  );

  return lines.join("\n");
}

async function sendViaConfiguredGateway(recipient: string, messageText: string) {
  const sender = resolveSimapSender();
  const cfg = resolveWhatsAppConfig();

  if (!cfg.configured) {
    return {
      httpStatus: 503,
      body: {
        sent: false,
        configured: false,
        senderNumber: sender.local,
        status: "Gagal",
        error: `Integrasi WhatsApp Business API / Gateway untuk nomor pengirim SIMAP (${sender.local}) belum dikonfigurasi pada environment server (WHATSAPP_PHONE_NUMBER_ID & WHATSAPP_ACCESS_TOKEN atau WHATSAPP_GATEWAY_URL & WHATSAPP_GATEWAY_TOKEN). Gunakan tombol WhatsApp Web sebagai alternatif pengiriman langsung.`,
      },
    };
  }

  try {
    if (cfg.provider === "meta") {
      const metaUrl = `https://graph.facebook.com/${encodeURIComponent(
        cfg.apiVersion
      )}/${encodeURIComponent(cfg.phoneNumberId)}/messages`;
      const metaResp = await fetch(metaUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "text",
          text: {
            preview_url: false,
            body: messageText,
          },
        }),
      });

      const metaJson = (await metaResp.json().catch(() => ({}))) as {
        messages?: Array<{ id?: string }>;
        error?: { message?: string };
      };

      if (!metaResp.ok || !metaJson?.messages?.[0]?.id) {
        return {
          httpStatus: 502,
          body: {
            sent: false,
            configured: true,
            provider: "meta",
            senderNumber: sender.local,
            status: "Gagal",
            error:
              metaResp.status === 404
                ? "Meta WhatsApp Cloud API mengembalikan HTTP 404. Periksa WHATSAPP_PHONE_NUMBER_ID dan WHATSAPP_API_VERSION di environment server."
                : metaJson?.error?.message ||
                  `WhatsApp Business API menolak permintaan (HTTP ${metaResp.status}).`,
          },
        };
      }

      return {
        httpStatus: 200,
        body: {
          sent: true,
          configured: true,
          provider: "meta",
          senderNumber: sender.local,
          status: "Terkirim",
          messageId: metaJson.messages[0].id,
        },
      };
    }

    // Generic / Fonnte / Wablas HTTPS Gateway
    const headers: Record<string, string> = {
      Authorization: cfg.provider === "fonnte" ? cfg.gatewayToken : `Bearer ${cfg.gatewayToken}`,
      "Content-Type": "application/json",
    };

    const payload =
      cfg.provider === "fonnte"
        ? { target: recipient, message: messageText, countryCode: "62", sender: sender.digits }
        : cfg.provider === "wablas"
        ? { phone: recipient, message: messageText, sender: sender.digits }
        : {
            to: `+${recipient}`,
            phone: recipient,
            from: sender.e164,
            sender: sender.digits,
            message: messageText,
          };

    const gwResp = await fetch(cfg.gatewayUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const gwJson = (await gwResp.json().catch(() => ({}))) as Record<string, any>;
    const isConfirmed =
      gwResp.ok &&
      gwJson?.status !== false &&
      gwJson?.success !== false &&
      gwJson?.ok !== false;

    if (!isConfirmed) {
      return {
        httpStatus: 502,
        body: {
          sent: false,
          configured: true,
          provider: cfg.provider,
          senderNumber: sender.local,
          status: "Gagal",
          error:
            gwResp.status === 404
              ? `URL WhatsApp Gateway mengembalikan HTTP 404 (${cfg.gatewayUrl}). Periksa kembali konfigurasi WHATSAPP_GATEWAY_URL di environment server.`
              : String(gwJson?.reason || gwJson?.message || gwJson?.error || "") ||
                `WhatsApp Gateway gagal mengonfirmasi pengiriman (HTTP ${gwResp.status}).`,
        },
      };
    }

    const messageId = String(
      gwJson?.id || gwJson?.messageId || gwJson?.data?.id || gwJson?.data?.messages?.[0]?.id || ""
    ).slice(0, 200);

    return {
      httpStatus: 200,
      body: {
        sent: true,
        configured: true,
        provider: cfg.provider,
        senderNumber: sender.local,
        status: "Terkirim",
        messageId: messageId || `gw-${Date.now()}`,
      },
    };
  } catch (err: any) {
    return {
      httpStatus: 502,
      body: {
        sent: false,
        configured: true,
        provider: cfg.provider,
        senderNumber: sender.local,
        status: "Gagal",
        error: err?.message || "Gagal menghubungi WhatsApp Gateway.",
      },
    };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middleware
  app.use(express.json({ limit: "64kb" }));

  // Explicit CORS support for /api/* when frontend calls from an external or static host
  const configuredOrigins = (process.env.CORS_ALLOWED_ORIGIN || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.use("/api", (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && configuredOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  // Explicitly allow WebAuthn platform authenticators in same-origin contexts
  app.use((req, res, next) => {
    res.setHeader(
      "Permissions-Policy",
      "publickey-credentials-get=(self), publickey-credentials-create=(self)"
    );
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // WhatsApp Gateway readiness status (no secrets exposed)
  app.get("/api/whatsapp/status", async (req, res) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const verified = await verifyFirebaseIdToken(token);
    if (!verified) {
      res.status(401).json({ error: "Autentikasi pengguna tidak valid." });
      return;
    }

    const cfg = resolveWhatsAppConfig();
    const sender = resolveSimapSender();
    res.json({
      configured: cfg.configured,
      provider: cfg.provider,
      senderNumber: sender.local,
      senderE164: sender.e164,
    });
  });

  // Unified WhatsApp notification route (SPPD, Peminjaman Kendaraan, Nomor Surat & Berita Acara)
  app.post("/api/whatsapp/send-notification", async (req, res) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const verified = await verifyFirebaseIdToken(token);
    if (!verified) {
      res.status(401).json({
        sent: false,
        status: "Gagal",
        error: "Sesi pengguna tidak terautentikasi untuk mengirim notifikasi WhatsApp.",
      });
      return;
    }

    const sender = resolveSimapSender();
    const recipient = normalizeWaRecipient(String(req.body?.nomorWhatsapp || ""));
    if (!recipient) {
      res.status(400).json({
        sent: false,
        senderNumber: sender.local,
        status: "Gagal",
        error: "Format nomor WhatsApp tujuan tidak valid (gunakan format +62...).",
      });
      return;
    }

    const category = clampField(req.body?.category, 32);
    let messageText: string | null = null;

    if (category === "sppd") {
      messageText = buildSppdMessageText(req.body || {}, sender.local);
    } else if (category === "vehicle_loan") {
      messageText = buildVehicleLoanMessageText(req.body || {}, sender.local);
    } else if (category === "letter_number") {
      messageText = buildLetterMessageText(req.body || {}, sender.local);
    } else {
      res.status(400).json({
        sent: false,
        senderNumber: sender.local,
        status: "Gagal",
        error: "Kategori notifikasi WhatsApp tidak dikenali.",
      });
      return;
    }

    if (!messageText) {
      res.status(400).json({
        sent: false,
        senderNumber: sender.local,
        status: "Gagal",
        error: "Data pengajuan belum lengkap untuk dikirim via WhatsApp.",
      });
      return;
    }

    const result = await sendViaConfiguredGateway(recipient, messageText);
    res.status(result.httpStatus).json(result.body);
  });

  // Backward-compatible route for Letter Number Issuance notification
  app.post("/api/whatsapp/send-letter-notification", async (req, res) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const verified = await verifyFirebaseIdToken(token);
    if (!verified) {
      res.status(401).json({
        sent: false,
        status: "Gagal",
        error: "Sesi pengguna tidak terautentikasi untuk mengirim notifikasi WhatsApp.",
      });
      return;
    }

    const sender = resolveSimapSender();
    const recipient = normalizeWaRecipient(String(req.body?.nomorWhatsapp || ""));
    if (!recipient) {
      res.status(400).json({
        sent: false,
        senderNumber: sender.local,
        status: "Gagal",
        error: "Format nomor WhatsApp tujuan tidak valid (gunakan format +62...).",
      });
      return;
    }

    const messageText = buildLetterMessageText(req.body || {}, sender.local);
    if (!messageText) {
      res.status(400).json({
        sent: false,
        senderNumber: sender.local,
        status: "Gagal",
        error: "Data detail nomor surat belum lengkap untuk dikirim via WhatsApp.",
      });
      return;
    }

    const result = await sendViaConfiguredGateway(recipient, messageText);
    res.status(result.httpStatus).json(result.body);
  });

  // Ensure unmatched /api/* routes always return JSON instead of falling through to SPA HTML
  app.all("/api/*", (req, res) => {
    res.status(404).json({
      sent: false,
      status: "Gagal",
      error: `Endpoint API ${req.method} ${req.path} tidak ditemukan.`,
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
