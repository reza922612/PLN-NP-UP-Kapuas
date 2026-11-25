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

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middleware
  app.use(express.json({ limit: "64kb" }));

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
    res.json({
      configured: cfg.configured,
      provider: cfg.provider,
    });
  });

  // Send Letter Number Issuance notification via configured WhatsApp Business API / Gateway
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

    const recipient = normalizeWaRecipient(String(req.body?.nomorWhatsapp || ""));
    const nomorSurat = clampField(req.body?.nomorSurat, 128);
    const namaPengaju = clampField(req.body?.namaPengaju, 200);
    const nip = clampField(req.body?.nip, 64);
    const bidang = clampField(req.body?.bidang, 128);
    const tanggalPengajuan = clampField(req.body?.tanggalPengajuan, 32);
    const unitLabel = clampField(req.body?.unitLabel, 128);

    if (!recipient) {
      res.status(400).json({
        sent: false,
        status: "Gagal",
        error: "Format nomor WhatsApp tujuan tidak valid (gunakan format +62...).",
      });
      return;
    }

    if (!nomorSurat || !namaPengaju || !nip || !bidang || !tanggalPengajuan || !unitLabel) {
      res.status(400).json({
        sent: false,
        status: "Gagal",
        error: "Data detail nomor surat belum lengkap untuk dikirim via WhatsApp.",
      });
      return;
    }

    const messageText = [
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
    ].join("\n");

    const cfg = resolveWhatsAppConfig();
    if (!cfg.configured) {
      res.status(503).json({
        sent: false,
        configured: false,
        status: "Gagal",
        error:
          "Integrasi WhatsApp Business API / Gateway belum dikonfigurasi pada environment server (WHATSAPP_PHONE_NUMBER_ID & WHATSAPP_ACCESS_TOKEN atau WHATSAPP_GATEWAY_URL & WHATSAPP_GATEWAY_TOKEN). Silakan gunakan tombol Kirim Ulang setelah kredensial gateway aktif.",
      });
      return;
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
          res.status(metaResp.status === 404 ? 502 : 502).json({
            sent: false,
            configured: true,
            provider: "meta",
            status: "Gagal",
            error:
              metaResp.status === 404
                ? "Meta WhatsApp Cloud API mengembalikan HTTP 404. Periksa WHATSAPP_PHONE_NUMBER_ID dan WHATSAPP_API_VERSION di environment server."
                : metaJson?.error?.message ||
                  `WhatsApp Business API menolak permintaan (HTTP ${metaResp.status}).`,
          });
          return;
        }

        res.json({
          sent: true,
          configured: true,
          provider: "meta",
          status: "Terkirim",
          messageId: metaJson.messages[0].id,
        });
        return;
      }

      // Generic / Fonnte / Wablas HTTPS Gateway
      const headers: Record<string, string> = {
        Authorization: cfg.provider === "fonnte" ? cfg.gatewayToken : `Bearer ${cfg.gatewayToken}`,
        "Content-Type": "application/json",
      };

      const payload =
        cfg.provider === "fonnte"
          ? { target: recipient, message: messageText, countryCode: "62" }
          : cfg.provider === "wablas"
          ? { phone: recipient, message: messageText }
          : { to: `+${recipient}`, phone: recipient, message: messageText };

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
        res.status(502).json({
          sent: false,
          configured: true,
          provider: cfg.provider,
          status: "Gagal",
          error:
            gwResp.status === 404
              ? `URL WhatsApp Gateway mengembalikan HTTP 404 (${cfg.gatewayUrl}). Periksa kembali konfigurasi WHATSAPP_GATEWAY_URL di environment server.`
              : String(gwJson?.reason || gwJson?.message || gwJson?.error || "") ||
                `WhatsApp Gateway gagal mengonfirmasi pengiriman (HTTP ${gwResp.status}).`,
        });
        return;
      }

      const messageId = String(
        gwJson?.id || gwJson?.messageId || gwJson?.data?.id || gwJson?.data?.messages?.[0]?.id || ""
      ).slice(0, 200);

      res.json({
        sent: true,
        configured: true,
        provider: cfg.provider,
        status: "Terkirim",
        messageId: messageId || `gw-${Date.now()}`,
      });
    } catch (err: any) {
      res.status(502).json({
        sent: false,
        configured: true,
        provider: cfg.provider,
        status: "Gagal",
        error: err?.message || "Gagal menghubungi WhatsApp Gateway.",
      });
    }
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
