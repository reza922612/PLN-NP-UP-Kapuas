import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { BiometricCredentialRecord } from '../types';

const IDB_NAME = 'simap_biometric_vault';
const IDB_VERSION = 1;
const STORE_KEYS = 'keys';
const STORE_CREDS = 'credentials';
const MASTER_KEY_ID = 'aes_gcm_vault_key_v1';

export interface LocalBiometricCredential {
  credDocId: string;
  credentialId: string;
  uid: string;
  email: string;
  displayName: string;
  deviceName: string;
  rpId: string;
  iv: string;
  ciphertext: string;
  createdAtIso: string;
  lastUsedAtIso: string;
}

export interface BiometricCapabilities {
  supported: boolean;
  secureContext: boolean;
  platformAuthenticatorAvailable: boolean;
  isEmbeddedIframe: boolean;
  deviceName: string;
}

export interface VerifiedBiometricUnlock {
  credDocId: string;
  uid: string;
  email: string;
  secret: string;
  deviceName: string;
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUint8Array(base64url: string): Uint8Array {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const base64 = padded + '='.repeat(padLen);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Bytes(value: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(digest);
}

export function detectDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Perangkat Mobile';
  const ua = navigator.userAgent || '';

  let os = 'Perangkat';
  if (/iPhone/i.test(ua)) os = 'iPhone (Face ID / Touch ID)';
  else if (/iPad/i.test(ua)) os = 'iPad (Face ID / Touch ID)';
  else if (/Android/i.test(ua)) os = 'Android (Sidik Jari / Wajah)';
  else if (/Windows/i.test(ua)) os = 'Windows Hello';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'Mac (Touch ID)';
  else if (/Linux/i.test(ua)) os = 'Linux Authenticator';

  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/CriOS|Chrome/i.test(ua)) browser = 'Chrome';
  else if (/FxiOS|Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';

  return `${os} · ${browser}`.slice(0, 128);
}

export async function getBiometricCapabilities(): Promise<BiometricCapabilities> {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      secureContext: false,
      platformAuthenticatorAvailable: false,
      isEmbeddedIframe: false,
      deviceName: 'Perangkat Mobile',
    };
  }

  const secureContext = Boolean(window.isSecureContext);
  const hasWebAuthn =
    'PublicKeyCredential' in window &&
    Boolean(navigator.credentials?.create) &&
    Boolean(navigator.credentials?.get);
  const hasCryptoAndIdb = Boolean(window.crypto?.subtle) && Boolean(window.indexedDB);
  const supported = secureContext && hasWebAuthn && hasCryptoAndIdb;

  let platformAuthenticatorAvailable = false;
  if (supported && typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
    try {
      platformAuthenticatorAvailable =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      platformAuthenticatorAvailable = false;
    }
  }

  let isEmbeddedIframe = false;
  try {
    isEmbeddedIframe = window.self !== window.top;
  } catch {
    isEmbeddedIframe = true;
  }

  return {
    supported,
    secureContext,
    platformAuthenticatorAvailable,
    isEmbeddedIframe,
    deviceName: detectDeviceName(),
  };
}

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB tidak tersedia pada browser ini.'));
      return;
    }

    const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_KEYS)) {
        database.createObjectStore(STORE_KEYS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORE_CREDS)) {
        database.createObjectStore(STORE_CREDS, { keyPath: 'credDocId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Gagal membuka penyimpanan biometrik.'));
  });
}

async function getOrCreateVaultKey(): Promise<CryptoKey> {
  const database = await openVaultDb();
  try {
    const existing = await new Promise<{ id: string; key: CryptoKey } | undefined>((resolve, reject) => {
      const tx = database.transaction(STORE_KEYS, 'readonly');
      const store = tx.objectStore(STORE_KEYS);
      const req = store.get(MASTER_KEY_ID);
      req.onsuccess = () => resolve(req.result as { id: string; key: CryptoKey } | undefined);
      req.onerror = () => reject(req.error);
    });

    if (existing?.key) return existing.key;

    const generated = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(STORE_KEYS, 'readwrite');
      const store = tx.objectStore(STORE_KEYS);
      const req = store.put({ id: MASTER_KEY_ID, key: generated });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    return generated;
  } finally {
    database.close();
  }
}

export async function listLocalBiometricCredentials(): Promise<LocalBiometricCredential[]> {
  if (typeof window === 'undefined' || !window.indexedDB) return [];
  let database: IDBDatabase | null = null;
  try {
    database = await openVaultDb();
    const items = await new Promise<LocalBiometricCredential[]>((resolve, reject) => {
      const tx = database!.transaction(STORE_CREDS, 'readonly');
      const store = tx.objectStore(STORE_CREDS);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as LocalBiometricCredential[]) || []);
      req.onerror = () => reject(req.error);
    });
    return items.sort((a, b) => b.lastUsedAtIso.localeCompare(a.lastUsedAtIso));
  } catch {
    return [];
  } finally {
    database?.close();
  }
}

async function saveLocalBiometricCredential(record: LocalBiometricCredential): Promise<void> {
  const database = await openVaultDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(STORE_CREDS, 'readwrite');
      const store = tx.objectStore(STORE_CREDS);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } finally {
    database.close();
  }
}

export async function removeLocalBiometricCredential(credDocId: string): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return;
  let database: IDBDatabase | null = null;
  try {
    database = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
      const tx = database!.transaction(STORE_CREDS, 'readwrite');
      const store = tx.objectStore(STORE_CREDS);
      const req = store.delete(credDocId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore cleanup failure
  } finally {
    database?.close();
  }
}

async function waitForUserDoc(uid: string): Promise<boolean> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) return true;
    } catch {
      // retry after brief delay
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

export async function registerBiometricCredential(params: {
  uid: string;
  email: string;
  displayName: string;
  secret: string;
}): Promise<LocalBiometricCredential> {
  const { uid, email, displayName, secret } = params;
  const capabilities = await getBiometricCapabilities();
  if (!capabilities.supported) {
    throw new Error(
      'Browser atau perangkat ini belum mendukung autentikasi biometrik WebAuthn (pastikan akses menggunakan HTTPS).'
    );
  }

  const rpId = window.location.hostname;
  const challenge = window.crypto.getRandomValues(new Uint8Array(32));
  const expectedChallengeB64 = uint8ArrayToBase64Url(challenge);
  const userIdBytes = new TextEncoder().encode(uid);

  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    challenge: toArrayBuffer(challenge),
    rp: {
      name: 'SIMAP PLN NP UP Kapuas',
      ...(rpId ? { id: rpId } : {}),
    },
    user: {
      id: toArrayBuffer(userIdBytes),
      name: email,
      displayName: displayName || email,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' }, // ES256
      { alg: -257, type: 'public-key' }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
  };

  const credential = (await navigator.credentials.create({
    publicKey: publicKeyOptions,
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('Pendaftaran biometrik dibatalkan oleh perangkat.');
  }

  const attestationResponse = credential.response as AuthenticatorAttestationResponse;
  const clientData = JSON.parse(
    new TextDecoder().decode(new Uint8Array(attestationResponse.clientDataJSON))
  ) as { type?: string; challenge?: string; origin?: string };

  if (
    clientData.type !== 'webauthn.create' ||
    clientData.challenge !== expectedChallengeB64 ||
    clientData.origin !== window.location.origin
  ) {
    throw new Error('Verifikasi respons pendaftaran WebAuthn tidak valid.');
  }

  const credentialId = uint8ArrayToBase64Url(new Uint8Array(credential.rawId)).slice(0, 512);
  const credDocId = await sha256Hex(credentialId);
  const deviceName = detectDeviceName();

  // Encrypt session credential envelope with non-extractable AES-GCM CryptoKey in IndexedDB
  const vaultKey = await getOrCreateVaultKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify({ email, secret }));
  const encryptedBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    vaultKey,
    toArrayBuffer(plaintext)
  );

  const nowIso = new Date().toISOString();
  const localRecord: LocalBiometricCredential = {
    credDocId,
    credentialId,
    uid,
    email,
    displayName: displayName || email,
    deviceName,
    rpId: rpId.slice(0, 256),
    iv: uint8ArrayToBase64Url(iv),
    ciphertext: uint8ArrayToBase64Url(new Uint8Array(encryptedBuf)),
    createdAtIso: nowIso,
    lastUsedAtIso: nowIso,
  };

  // Replace any older local credential for the same uid on this browser to keep quick login clean
  const existingLocal = await listLocalBiometricCredentials();
  for (const prev of existingLocal) {
    if (prev.uid === uid && prev.credDocId !== credDocId) {
      await removeLocalBiometricCredential(prev.credDocId);
    }
  }
  await saveLocalBiometricCredential(localRecord);

  // Sync credential metadata to Firestore (non-secret metadata only)
  const userDocExists = await waitForUserDoc(uid);
  if (userDocExists) {
    const path = `users/${uid}/biometric_credentials/${credDocId}`;
    try {
      await setDoc(doc(db, 'users', uid, 'biometric_credentials', credDocId), {
        userId: uid,
        email: email.slice(0, 256),
        credentialId,
        deviceName,
        rpId: rpId.slice(0, 256),
        authenticatorType: 'platform',
        createdAt: serverTimestamp(),
        lastUsedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  }

  return localRecord;
}

export async function authenticateWithBiometric(
  preferredCredDocId?: string
): Promise<VerifiedBiometricUnlock> {
  const capabilities = await getBiometricCapabilities();
  if (!capabilities.supported) {
    throw new Error('Perangkat atau browser tidak mendukung verifikasi biometrik WebAuthn.');
  }

  const localCreds = await listLocalBiometricCredentials();
  const candidates = preferredCredDocId
    ? localCreds.filter((c) => c.credDocId === preferredCredDocId)
    : localCreds;

  if (candidates.length === 0) {
    throw new Error(
      'Belum ada sidik jari / Face ID yang terdaftar pada perangkat ini. Silakan login menggunakan password terlebih dahulu.'
    );
  }

  const rpId = window.location.hostname;
  const challenge = window.crypto.getRandomValues(new Uint8Array(32));
  const expectedChallengeB64 = uint8ArrayToBase64Url(challenge);

  const allowCredentials: PublicKeyCredentialDescriptor[] = candidates.map((c) => ({
    type: 'public-key',
    id: toArrayBuffer(base64UrlToUint8Array(c.credentialId)),
    transports: ['internal'],
  }));

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: toArrayBuffer(challenge),
      ...(rpId ? { rpId } : {}),
      allowCredentials,
      userVerification: 'required',
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;

  if (!assertion) {
    throw new Error('Autentikasi biometrik dibatalkan.');
  }

  const assertionResponse = assertion.response as AuthenticatorAssertionResponse;

  // 1. Validate clientDataJSON (type, challenge, origin)
  const clientData = JSON.parse(
    new TextDecoder().decode(new Uint8Array(assertionResponse.clientDataJSON))
  ) as { type?: string; challenge?: string; origin?: string };

  if (
    clientData.type !== 'webauthn.get' ||
    clientData.challenge !== expectedChallengeB64 ||
    clientData.origin !== window.location.origin
  ) {
    throw new Error('Validasi challenge WebAuthn gagal. Silakan coba lagi.');
  }

  // 2. Validate authenticatorData flags (User Present 0x01 & User Verified 0x04) & rpIdHash
  const authData = new Uint8Array(assertionResponse.authenticatorData);
  if (authData.byteLength < 37) {
    throw new Error('Data autentikator WebAuthn tidak lengkap.');
  }

  if (rpId) {
    const expectedRpHash = await sha256Bytes(rpId);
    for (let i = 0; i < 32; i += 1) {
      if (authData[i] !== expectedRpHash[i]) {
        throw new Error('Domain RP ID WebAuthn tidak cocok.');
      }
    }
  }

  const flags = authData[32];
  const userPresent = (flags & 0x01) !== 0;
  const userVerified = (flags & 0x04) !== 0;
  if (!userPresent || !userVerified) {
    throw new Error('Verifikasi biometrik pengguna (User Verification) tidak terpenuhi.');
  }

  // 3. Locate matching credential record & unwrap AES-GCM payload
  const returnedCredId = uint8ArrayToBase64Url(new Uint8Array(assertion.rawId));
  const returnedDocId = await sha256Hex(returnedCredId);
  const matched =
    candidates.find((c) => c.credDocId === returnedDocId) ||
    candidates.find((c) => c.credentialId === returnedCredId);

  if (!matched) {
    throw new Error('Kredensial biometrik tidak cocok dengan data tersimpan di perangkat.');
  }

  const vaultKey = await getOrCreateVaultKey();
  const decryptedBuf = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(base64UrlToUint8Array(matched.iv)) },
    vaultKey,
    toArrayBuffer(base64UrlToUint8Array(matched.ciphertext))
  );

  const payload = JSON.parse(new TextDecoder().decode(new Uint8Array(decryptedBuf))) as {
    email: string;
    secret: string;
  };

  matched.lastUsedAtIso = new Date().toISOString();
  await saveLocalBiometricCredential(matched);

  return {
    credDocId: matched.credDocId,
    uid: matched.uid,
    email: payload.email,
    secret: payload.secret,
    deviceName: matched.deviceName,
  };
}

export async function touchBiometricLastUsed(uid: string, credDocId: string): Promise<boolean> {
  const path = `users/${uid}/biometric_credentials/${credDocId}`;
  try {
    const ref = doc(db, 'users', uid, 'biometric_credentials', credDocId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await removeLocalBiometricCredential(credDocId);
      return false;
    }
    await updateDoc(ref, { lastUsedAt: serverTimestamp() });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
    return true;
  }
}

export async function listFirestoreBiometrics(uid: string): Promise<BiometricCredentialRecord[]> {
  const path = `users/${uid}/biometric_credentials`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'biometric_credentials'));
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<BiometricCredentialRecord, 'id'>),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function revokeBiometricCredential(uid: string, credDocId: string): Promise<void> {
  const path = `users/${uid}/biometric_credentials/${credDocId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'biometric_credentials', credDocId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  } finally {
    await removeLocalBiometricCredential(credDocId);
  }
}

export function translateWebAuthnError(err: unknown): string {
  if (err && typeof err === 'object' && 'name' in err) {
    const name = String((err as { name: string }).name);
    if (name === 'NotAllowedError') {
      return 'Pemindaian biometrik dibatalkan, melewati batas waktu, atau belum diizinkan pada perangkat ini.';
    }
    if (name === 'SecurityError') {
      return 'WebAuthn memerlukan konteks aman (HTTPS) atau akses di luar iframe terbatas. Buka portal langsung di browser mobile Anda.';
    }
    if (name === 'InvalidStateError') {
      return 'Perangkat biometrik ini sudah terdaftar sebelumnya.';
    }
    if (name === 'NotSupportedError') {
      return 'Sensor biometrik platform (Sidik Jari / Face ID) tidak tersedia pada perangkat ini.';
    }
    if (name === 'AbortError') {
      return 'Proses autentikasi biometrik dibatalkan.';
    }
  }
  return err instanceof Error ? err.message : 'Gagal memproses autentikasi biometrik.';
}
