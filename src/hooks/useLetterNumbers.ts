import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import {
  LetterClassificationCode,
  LetterCode,
  LetterNumberCounter,
  LetterNumberRequest,
  LetterUnitCode,
  WhatsAppNotificationStatus,
} from '../types';
import {
  formatNomorSurat,
  formatSequenceLabel,
  formatWhatsAppPhone,
  isValidIndonesianWhatsApp,
  isValidLetterCombination,
  LETTER_CODE_OPTIONS,
  LETTER_UNIT_LABELS,
  LETTER_UNIT_OPTIONS,
} from '../data/letterConstants';
import { logActivity } from '../lib/activityLogger';
import {
  dispatchSimapWhatsAppNotification,
  fetchWhatsAppGatewayStatus as fetchCentralGatewayStatus,
  SIMAP_WHATSAPP_NUMBER_E164,
  SIMAP_WHATSAPP_NUMBER_LOCAL,
  WhatsAppDispatchResult,
  WhatsAppGatewayStatus,
} from '../data/whatsappConstants';

export type { WhatsAppDispatchResult, WhatsAppGatewayStatus };

export interface SubmitLetterNumberInput {
  applicantEmployeeId?: string | null;
  namaPengaju: string;
  nip: string;
  bidang: string;
  tanggalPengajuan: string;
  nomorWhatsapp: string;
  kodeSurat: LetterCode;
  kodeKlasifikasi: LetterClassificationCode;
  unitKode: LetterUnitCode;
  tahun: number;
  perihal?: string;
}

const getSortableTime = (val: any): number => {
  if (!val) return 0;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (val.seconds) return val.seconds * 1000;
  const parsed = Date.parse(String(val));
  return Number.isNaN(parsed) ? 0 : parsed;
};

export function useLetterNumbers(enabled = true) {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<LetterNumberRequest[]>([]);
  const [counters, setCounters] = useState<LetterNumberCounter[]>([]);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [gatewayStatus, setGatewayStatus] = useState<WhatsAppGatewayStatus>({
    configured: false,
    provider: null,
    senderNumber: SIMAP_WHATSAPP_NUMBER_LOCAL,
    senderE164: SIMAP_WHATSAPP_NUMBER_E164,
    checked: false,
    backendAvailable: true,
  });

  const isPrivilegedViewer = !!profile && profile.role !== 'employee';

  const fetchWhatsAppGatewayStatus = useCallback(async (): Promise<WhatsAppGatewayStatus> => {
    const status = await fetchCentralGatewayStatus();
    setGatewayStatus(status);
    return status;
  }, []);

  useEffect(() => {
    if (!enabled || !user || !profile) {
      setRequests([]);
      setCounters([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchWhatsAppGatewayStatus();

    const requestsRef = collection(db, 'letter_number_requests');
    const qRequests = isPrivilegedViewer
      ? query(requestsRef, orderBy('createdAt', 'desc'))
      : query(requestsRef, where('createdByUid', '==', user.uid));

    const unsubRequests = onSnapshot(
      qRequests,
      (snapshot) => {
        const list = snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as LetterNumberRequest)
        );
        list.sort((a, b) => getSortableTime(b.createdAt) - getSortableTime(a.createdAt));
        setRequests(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to letter_number_requests:', err);
        setLoading(false);
      }
    );

    const unsubCounters = onSnapshot(
      collection(db, 'letter_number_counters'),
      (snapshot) => {
        const list = snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as LetterNumberCounter)
        );
        setCounters(list);
      },
      (err) => {
        console.warn('Unable to listen to letter_number_counters:', err);
      }
    );

    return () => {
      unsubRequests();
      unsubCounters();
    };
  }, [enabled, user, profile, isPrivilegedViewer, fetchWhatsAppGatewayStatus]);

  const countersByKey = useMemo(() => {
    const map: Record<string, number> = {};
    counters.forEach((c) => {
      const key = c.counterId || `${c.unitKode}_${c.tahun}`;
      map[key] = Number(c.lastSequence || 0);
    });
    return map;
  }, [counters]);

  const getNextSequencePreview = useCallback(
    (unitKode: LetterUnitCode, tahun: number): number => {
      const key = `${unitKode}_${tahun}`;
      return (countersByKey[key] || 0) + 1;
    },
    [countersByKey]
  );

  const dispatchWhatsAppNotification = useCallback(
    async (record: {
      requestId: string;
      nomorSurat: string;
      namaPengaju: string;
      nip: string;
      bidang: string;
      tanggalPengajuan: string;
      nomorWhatsapp: string;
      unitLabel: string;
    }): Promise<WhatsAppDispatchResult> => {
      const dispatchResult = await dispatchSimapWhatsAppNotification({
        category: 'letter_number',
        nomorWhatsapp: record.nomorWhatsapp,
        nomorSurat: record.nomorSurat,
        namaPengaju: record.namaPengaju,
        nip: record.nip,
        bidang: record.bidang,
        tanggalPengajuan: record.tanggalPengajuan,
        unitLabel: record.unitLabel,
      });

      const letterRef = doc(db, 'letter_number_requests', record.requestId);
      try {
        await updateDoc(letterRef, {
          whatsappStatus: dispatchResult.status,
          whatsappProvider: dispatchResult.provider || null,
          whatsappMessageId: dispatchResult.sent ? dispatchResult.messageId || null : null,
          whatsappError: dispatchResult.sent ? null : (dispatchResult.error || 'Gagal').slice(0, 512),
          whatsappSentAt: dispatchResult.sent ? new Date().toISOString() : null,
          updatedAt: serverTimestamp(),
        });
      } catch (updateErr) {
        handleFirestoreError(
          updateErr,
          OperationType.UPDATE,
          `letter_number_requests/${record.requestId}`
        );
      }

      return dispatchResult;
    },
    []
  );

  const submitLetterNumberRequest = useCallback(
    async (
      input: SubmitLetterNumberInput
    ): Promise<{ request: LetterNumberRequest; whatsappResult: WhatsAppDispatchResult }> => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Anda harus login untuk mengajukan nomor surat.');
      }

      const combo = isValidLetterCombination(input.kodeSurat, input.kodeKlasifikasi);
      if (!combo.valid) {
        throw new Error(combo.reason || 'Kombinasi kode surat dan klasifikasi tidak valid.');
      }

      const formattedWa = formatWhatsAppPhone(input.nomorWhatsapp);
      if (!isValidIndonesianWhatsApp(formattedWa)) {
        throw new Error('Format Nomor WhatsApp tidak valid. Gunakan format +628xxxxxxxxxx.');
      }

      const namaPengaju = input.namaPengaju.trim();
      const nip = input.nip.trim();
      const bidang = input.bidang.trim();
      const tanggalPengajuan = input.tanggalPengajuan.trim();
      const perihal = (input.perihal || '').trim();
      if (!namaPengaju || !nip || !bidang || !tanggalPengajuan) {
        throw new Error('Mohon lengkapi seluruh data pengaju dan penomoran terlebih dahulu.');
      }

      const tahun = Number(input.tahun);
      const unitLabel = LETTER_UNIT_LABELS[input.unitKode];
      const counterId = `${input.unitKode}_${tahun}`;
      const counterRef = doc(db, 'letter_number_counters', counterId);

      let issuedMeta: {
        requestId: string;
        sequenceNumber: number;
        sequenceLabel: string;
        nomorSurat: string;
      } | null = null;

      try {
        issuedMeta = await runTransaction(db, async (tx) => {
          const counterSnap = await tx.get(counterRef);
          const currentSeq = counterSnap.exists()
            ? Number(counterSnap.data()?.lastSequence || 0)
            : 0;
          let nextSeq = currentSeq + 1;
          let sequenceLabel = formatSequenceLabel(nextSeq);
          let requestId = `${counterId}_${sequenceLabel}`;
          let letterRef = doc(db, 'letter_number_requests', requestId);
          let existingLetter = await tx.get(letterRef);

          while (existingLetter.exists()) {
            nextSeq += 1;
            sequenceLabel = formatSequenceLabel(nextSeq);
            requestId = `${counterId}_${sequenceLabel}`;
            letterRef = doc(db, 'letter_number_requests', requestId);
            existingLetter = await tx.get(letterRef);
          }

          const nomorSurat = formatNomorSurat(
            nextSeq,
            input.kodeSurat,
            input.kodeKlasifikasi,
            input.unitKode,
            tahun
          );

          tx.set(counterRef, {
            counterId,
            unitKode: input.unitKode,
            tahun,
            lastSequence: nextSeq,
            lastRequestId: requestId,
            updatedAt: serverTimestamp(),
          });

          tx.set(letterRef, {
            requestId,
            counterId,
            sequenceNumber: nextSeq,
            sequenceLabel,
            nomorSurat,
            applicantEmployeeId: input.applicantEmployeeId || null,
            namaPengaju,
            nip,
            bidang,
            tanggalPengajuan,
            nomorWhatsapp: formattedWa,
            kodeSurat: input.kodeSurat,
            kodeKlasifikasi: input.kodeKlasifikasi,
            unitKode: input.unitKode,
            unitLabel,
            tahun,
            perihal: perihal || null,
            status: 'Diterbitkan',
            cancellationReason: null,
            cancelledAt: null,
            whatsappStatus: 'Menunggu Pengiriman',
            whatsappProvider: null,
            whatsappMessageId: null,
            whatsappError: null,
            whatsappSentAt: null,
            createdByUid: currentUser.uid,
            createdByEmail: currentUser.email || 'user@plnnusantarapower.co.id',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          return {
            requestId,
            sequenceNumber: nextSeq,
            sequenceLabel,
            nomorSurat,
          };
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'letter_number_requests');
      }

      if (!issuedMeta) {
        throw new Error('Gagal menerbitkan nomor surat melalui transaksi database.');
      }

      await logActivity({
        action: 'CREATE',
        entityType: 'letter_number',
        entityId: issuedMeta.requestId,
        entityName: issuedMeta.nomorSurat,
        description: `Penerbitan nomor surat ${issuedMeta.nomorSurat} (${input.kodeSurat}/${input.kodeKlasifikasi}) oleh ${namaPengaju} (${nip})`,
      });

      const whatsappResult = await dispatchWhatsAppNotification({
        requestId: issuedMeta.requestId,
        nomorSurat: issuedMeta.nomorSurat,
        namaPengaju,
        nip,
        bidang,
        tanggalPengajuan,
        nomorWhatsapp: formattedWa,
        unitLabel,
      });

      const createdRecord: LetterNumberRequest = {
        id: issuedMeta.requestId,
        requestId: issuedMeta.requestId,
        counterId,
        sequenceNumber: issuedMeta.sequenceNumber,
        sequenceLabel: issuedMeta.sequenceLabel,
        nomorSurat: issuedMeta.nomorSurat,
        applicantEmployeeId: input.applicantEmployeeId || null,
        namaPengaju,
        nip,
        bidang,
        tanggalPengajuan,
        nomorWhatsapp: formattedWa,
        kodeSurat: input.kodeSurat,
        kodeKlasifikasi: input.kodeKlasifikasi,
        unitKode: input.unitKode,
        unitLabel,
        tahun,
        perihal: perihal || null,
        status: 'Diterbitkan',
        cancellationReason: null,
        cancelledAt: null,
        whatsappStatus: whatsappResult.status,
        whatsappProvider: whatsappResult.provider || null,
        whatsappMessageId: whatsappResult.sent ? whatsappResult.messageId || null : null,
        whatsappError: whatsappResult.sent ? null : whatsappResult.error || null,
        whatsappSentAt: whatsappResult.sent ? new Date().toISOString() : null,
        createdByUid: currentUser.uid,
        createdByEmail: currentUser.email || 'user@plnnusantarapower.co.id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return { request: createdRecord, whatsappResult };
    },
    [dispatchWhatsAppNotification]
  );

  const resendWhatsAppNotification = useCallback(
    async (req: LetterNumberRequest): Promise<WhatsAppDispatchResult> => {
      const requestId = req.requestId || req.id;
      if (!requestId) {
        throw new Error('ID pengajuan tidak ditemukan.');
      }

      try {
        await updateDoc(doc(db, 'letter_number_requests', requestId), {
          whatsappStatus: 'Menunggu Pengiriman',
          whatsappError: null,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `letter_number_requests/${requestId}`);
      }

      const result = await dispatchWhatsAppNotification({
        requestId,
        nomorSurat: req.nomorSurat,
        namaPengaju: req.namaPengaju,
        nip: req.nip,
        bidang: req.bidang,
        tanggalPengajuan: req.tanggalPengajuan,
        nomorWhatsapp: req.nomorWhatsapp,
        unitLabel: req.unitLabel || LETTER_UNIT_LABELS[req.unitKode],
      });

      await logActivity({
        action: 'UPDATE',
        entityType: 'letter_number',
        entityId: requestId,
        entityName: req.nomorSurat,
        description: result.sent
          ? `Kirim ulang notifikasi WhatsApp untuk ${req.nomorSurat} berhasil terkirim ke ${req.nomorWhatsapp}`
          : `Percobaan kirim ulang WhatsApp untuk ${req.nomorSurat} gagal: ${result.error || 'Error gateway'}`,
      });

      return result;
    },
    [dispatchWhatsAppNotification]
  );

  const cancelLetterNumberRequest = useCallback(
    async (req: LetterNumberRequest, reason: string): Promise<void> => {
      const requestId = req.requestId || req.id;
      if (!requestId) {
        throw new Error('ID pengajuan tidak ditemukan.');
      }

      const cleanReason = reason.trim();
      if (!cleanReason) {
        throw new Error('Alasan pembatalan wajib diisi.');
      }

      try {
        await updateDoc(doc(db, 'letter_number_requests', requestId), {
          status: 'Dibatalkan',
          cancellationReason: cleanReason.slice(0, 500),
          cancelledAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `letter_number_requests/${requestId}`);
      }

      await logActivity({
        action: 'UPDATE',
        entityType: 'letter_number',
        entityId: requestId,
        entityName: req.nomorSurat,
        description: `Membatalkan pengajuan nomor surat ${req.nomorSurat} (nomor tetap terkunci & tidak digunakan ulang). Alasan: ${cleanReason}`,
      });
    },
    []
  );

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentYear = now.getFullYear();

    let activeCount = 0;
    let cancelledCount = 0;
    let monthCount = 0;
    let currentYearCount = 0;
    let waSent = 0;
    let waFailed = 0;
    let waPending = 0;

    const unitCounts: Record<LetterUnitCode, number> = {
      UPKS: 0,
      ULSR: 0,
      ULST: 0,
      ULKP: 0,
      ULSS: 0,
    };

    const codeCounts: Record<LetterCode, number> = {
      SKT: 0,
      BA: 0,
      BAPP: 0,
      BATK: 0,
    };

    const yearCounts: Record<number, number> = {};

    requests.forEach((req) => {
      if (req.status === 'Dibatalkan') {
        cancelledCount += 1;
      } else {
        activeCount += 1;
      }

      if ((req.tanggalPengajuan || '').startsWith(currentMonthPrefix)) {
        monthCount += 1;
      }

      if (Number(req.tahun) === currentYear) {
        currentYearCount += 1;
      }

      if (req.whatsappStatus === 'Terkirim') waSent += 1;
      else if (req.whatsappStatus === 'Gagal') waFailed += 1;
      else waPending += 1;

      if (req.unitKode in unitCounts) {
        unitCounts[req.unitKode] += 1;
      }

      if (req.kodeSurat in codeCounts) {
        codeCounts[req.kodeSurat] += 1;
      }

      const yr = Number(req.tahun);
      if (!Number.isNaN(yr)) {
        yearCounts[yr] = (yearCounts[yr] || 0) + 1;
      }
    });

    const byUnit = LETTER_UNIT_OPTIONS.map((u) => ({
      code: u.code,
      name: u.name,
      count: unitCounts[u.code] || 0,
    }));

    const byCode = LETTER_CODE_OPTIONS.map((c) => ({
      code: c.code,
      label: c.code,
      fullLabel: c.label,
      count: codeCounts[c.code] || 0,
    }));

    const yearKeys = Array.from(
      new Set([...Object.keys(yearCounts).map(Number), currentYear])
    ).sort((a, b) => a - b);

    const byYear = yearKeys.map((yr) => ({
      tahun: String(yr),
      count: yearCounts[yr] || 0,
    }));

    return {
      totalIssued: requests.length,
      activeCount,
      cancelledCount,
      monthCount,
      currentYearCount,
      waSent,
      waFailed,
      waPending,
      byUnit,
      byCode,
      byYear,
    };
  }, [requests]);

  return {
    requests,
    counters,
    loading,
    stats,
    gatewayStatus,
    fetchWhatsAppGatewayStatus,
    getNextSequencePreview,
    submitLetterNumberRequest,
    resendWhatsAppNotification,
    cancelLetterNumberRequest,
  };
}
