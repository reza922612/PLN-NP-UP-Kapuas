import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { logActivity } from '../lib/activityLogger';
import { syncPublicVerification } from '../lib/publicVerification';
import { syncPublicStats } from '../lib/publicStats';
import { uploadFileSmart } from '../lib/fileStorage';
import { calculatePositionTenure } from '../lib/utils';
import {
  Employee,
  EmployeeMutation,
  EmployeeStatus,
  ExternalMutationDirection,
  MutationAttachment,
  MutationCategory,
  MutationCorrectionEntry,
  MutationType,
} from '../types';
import { resolveCurrentBidang } from '../data/mutationConstants';

export interface SubmitMutationInput {
  employee: Employee;
  jenisMutasi: MutationType;
  arahMutasi?: ExternalMutationDirection | null;
  subJenisMutasi: string;
  kategoriMutasi: MutationCategory;
  jabatanBaru: string;
  bidangBaru: string;
  unitKerjaBaru: string;
  statusKepegawaianBaru: EmployeeStatus;
  entitasEksternal?: string | null;
  effectiveDate: string;
  nomorSk: string;
  tanggalSk: string;
  alasanMutasi: string;
  dokumenFile?: File | null;
}

export interface CorrectMutationInput {
  jabatanBaru: string;
  bidangBaru: string;
  unitKerjaBaru: string;
  statusKepegawaianBaru: EmployeeStatus;
  entitasEksternal?: string | null;
  effectiveDate: string;
  nomorSk: string;
  tanggalSk: string;
  alasanMutasi: string;
  dokumenFile?: File | null;
  reason: string;
}

export interface UseMutationsOptions {
  enabled?: boolean;
  employeeIdFilter?: string;
  autoApplyScheduled?: boolean;
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const clamp = (val: string | undefined | null, max: number, fallback = ''): string => {
  const trimmed = (val || '').trim();
  if (!trimmed) return fallback;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
};

export function buildMutationDedupeKey(
  nip: string,
  nomorSk: string,
  effectiveDate: string,
  kategori: MutationCategory
): string {
  const raw = `${nip.trim().toLowerCase()}|${nomorSk.trim().toLowerCase()}|${effectiveDate.trim()}|${kategori.trim().toLowerCase()}`;
  return raw.slice(0, 256);
}

export const useMutations = (options: UseMutationsOptions = {}) => {
  const { enabled = true, employeeIdFilter, autoApplyScheduled = false } = options;
  const { user, profile } = useAuth();
  const [mutations, setMutations] = useState<EmployeeMutation[]>([]);
  const [loading, setLoading] = useState<boolean>(enabled);
  const autoAppliedIdsRef = useRef<Set<string>>(new Set());

  const isAdminUser = profile?.role === 'admin' || profile?.role === 'super_admin';

  useEffect(() => {
    if (!enabled || !user) {
      setLoading(false);
      return;
    }

    const colRef = collection(db, 'employee_mutations');
    const q = employeeIdFilter
      ? query(colRef, where('employeeId', '==', employeeIdFilter))
      : profile?.role === 'employee' && profile?.employeeId
      ? query(colRef, where('employeeId', '==', profile.employeeId))
      : query(colRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<EmployeeMutation, 'id'>),
        })) as EmployeeMutation[];

        list.sort((a, b) => {
          const dateCmp = (b.effectiveDate || '').localeCompare(a.effectiveDate || '');
          if (dateCmp !== 0) return dateCmp;
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });

        setMutations(list);
        setLoading(false);
      },
      (error) => {
        if (error.message.includes('permissions')) {
          console.warn('Menunggu sinkronisasi izin mutasi pegawai...');
        } else {
          console.error('Error listening employee_mutations:', error);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [enabled, user, employeeIdFilter, profile?.role, profile?.employeeId]);

  const applyMutationInTransaction = useCallback(
    async (
      mutation: EmployeeMutation,
      approvalPayload?: {
        approvedByUid: string;
        approvedByName: string;
        approvedAt: string;
        approvalNotes?: string | null;
      }
    ): Promise<'applied' | 'scheduled' | 'already_applied'> => {
      if (!mutation.id) throw new Error('ID mutasi tidak valid.');
      const mutRef = doc(db, 'employee_mutations', mutation.id);
      const empRef = doc(db, 'employees', mutation.employeeId);
      const todayStr = getTodayIsoDate();
      const nowIso = new Date().toISOString();

      const outcome = await runTransaction<'applied' | 'scheduled' | 'already_applied'>(
        db,
        async (tx) => {
          const mutSnap = await tx.get(mutRef);
          if (!mutSnap.exists()) {
            throw new Error('Data pengajuan mutasi tidak ditemukan.');
          }
          const freshMut = mutSnap.data() as EmployeeMutation;
          if (freshMut.appliedToEmployee || freshMut.status === 'Diterapkan') {
            return 'already_applied';
          }
          if (freshMut.status === 'Ditolak') {
            throw new Error('Mutasi yang sudah ditolak tidak dapat diterapkan.');
          }

          const empSnap = await tx.get(empRef);
          if (!empSnap.exists()) {
            throw new Error('Data induk pegawai tidak ditemukan di sistem.');
          }
          const freshEmp = empSnap.data() as Employee;

          const isDue = freshMut.effectiveDate <= todayStr;
          const mutUpdate: Record<string, any> = {
            updatedAt: serverTimestamp(),
          };

          if (approvalPayload) {
            mutUpdate.approvedByUid = approvalPayload.approvedByUid;
            mutUpdate.approvedByName = approvalPayload.approvedByName;
            mutUpdate.approvedAt = approvalPayload.approvedAt;
            mutUpdate.approvalNotes = approvalPayload.approvalNotes || null;
            mutUpdate.rejectionReason = null;
          }

          let txOutcome: 'applied' | 'scheduled' = 'scheduled';
          if (isDue) {
            const isOutboundExternal =
              freshMut.jenisMutasi === 'Eksternal' && freshMut.arahMutasi === 'Keluar';
            const jabatanBerubah =
              freshMut.kategoriMutasi === 'Mutasi Jabatan' ||
              freshMut.kategoriMutasi === 'Mutasi Unit dan Jabatan' ||
              freshMut.jabatanBaru !== freshEmp.jabatanLengkap;

            const empUpdate: Record<string, any> = {
              jabatanLengkap: clamp(freshMut.jabatanBaru, 256, freshEmp.jabatanLengkap),
              bidang: clamp(freshMut.bidangBaru, 256),
              subUnit: clamp(freshMut.bidangBaru, 256, freshEmp.subUnit || freshMut.bidangBaru),
              unitPelaksana: clamp(freshMut.unitKerjaBaru, 256, freshEmp.unitPelaksana),
              status: freshMut.statusKepegawaianBaru || freshEmp.status,
              placementStatus: isOutboundExternal ? 'Mutasi Keluar' : 'Aktif',
              externalEntity:
                freshMut.jenisMutasi === 'Eksternal'
                  ? clamp(freshMut.entitasEksternal, 256) || null
                  : null,
              lastMutationId: freshMut.mutationId,
              lastMutationDate: freshMut.effectiveDate,
              lastMutationSkNumber: freshMut.nomorSk,
              updatedAt: serverTimestamp(),
            };

            if (jabatanBerubah) {
              empUpdate.tanggalMulaiJabatan = freshMut.effectiveDate;
              empUpdate.masaJabatan =
                calculatePositionTenure(freshMut.effectiveDate) || freshEmp.masaJabatan || '';
            }

            tx.update(empRef, empUpdate);

            mutUpdate.status = 'Diterapkan';
            mutUpdate.appliedToEmployee = true;
            mutUpdate.appliedAt = nowIso;
            txOutcome = 'applied';
          } else {
            mutUpdate.status = 'Disetujui';
            mutUpdate.appliedToEmployee = false;
            txOutcome = 'scheduled';
          }

          tx.update(mutRef, mutUpdate);
          return txOutcome;
        }
      );

      if (outcome === 'applied') {
        const refreshedEmpSnap = await getDoc(empRef);
        if (refreshedEmpSnap.exists()) {
          const refreshedEmp = {
            id: refreshedEmpSnap.id,
            ...refreshedEmpSnap.data(),
          } as Employee;
          await Promise.allSettled([
            syncPublicVerification(refreshedEmpSnap.id, refreshedEmp),
            syncPublicStats(),
            logActivity({
              action: 'UPDATE',
              entityType: 'mutation',
              entityId: mutation.id,
              entityName: `${mutation.employeeName} (${mutation.employeeNip})`,
              description: `Mutasi ${mutation.jenisMutasi}${
                mutation.arahMutasi ? ` ${mutation.arahMutasi}` : ''
              } (${mutation.kategoriMutasi}) diterapkan ke data pegawai: ${
                mutation.unitKerjaBaru
              } · ${mutation.jabatanBaru} (SK ${mutation.nomorSk}).`,
            }),
          ]);
        }
      } else if (outcome === 'scheduled') {
        await logActivity({
          action: 'UPDATE',
          entityType: 'mutation',
          entityId: mutation.id,
          entityName: `${mutation.employeeName} (${mutation.employeeNip})`,
          description: `Mutasi ${mutation.jenisMutasi} disetujui dan dijadwalkan efektif pada ${mutation.effectiveDate} (SK ${mutation.nomorSk}).`,
        });
      }

      return outcome;
    },
    []
  );

  // Auto-apply approved mutations whose effective date has arrived
  useEffect(() => {
    if (!autoApplyScheduled || !isAdminUser || mutations.length === 0) return;
    const todayStr = getTodayIsoDate();
    const dueMutations = mutations.filter(
      (m) =>
        m.id &&
        m.status === 'Disetujui' &&
        !m.appliedToEmployee &&
        m.effectiveDate <= todayStr &&
        !autoAppliedIdsRef.current.has(m.id)
    );

    if (dueMutations.length === 0) return;

    dueMutations.forEach((dueMut) => {
      if (!dueMut.id) return;
      autoAppliedIdsRef.current.add(dueMut.id);
      applyMutationInTransaction(dueMut).catch((err) => {
        console.warn('Gagal menerapkan mutasi terjadwal:', err);
        if (dueMut.id) autoAppliedIdsRef.current.delete(dueMut.id);
      });
    });
  }, [autoApplyScheduled, isAdminUser, mutations, applyMutationInTransaction]);

  const submitMutation = useCallback(
    async (input: SubmitMutationInput): Promise<string> => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Sesi pengguna tidak aktif. Silakan masuk ulang.');
      }
      if (!isAdminUser) {
        throw new Error('Hanya Admin SDM atau Super Admin yang dapat menginput mutasi.');
      }
      if (!input.employee.id) {
        throw new Error('Pegawai yang dipilih belum memiliki ID dokumen yang valid.');
      }

      const dedupeKey = buildMutationDedupeKey(
        input.employee.nip,
        input.nomorSk,
        input.effectiveDate,
        input.kategoriMutasi
      );

      // Duplicate mutation prevention check against Firestore
      const dupSnap = await getDocs(
        query(collection(db, 'employee_mutations'), where('dedupeKey', '==', dedupeKey))
      );
      const hasActiveDuplicate = dupSnap.docs.some((d) => {
        const data = d.data() as EmployeeMutation;
        return data.status !== 'Ditolak';
      });
      if (hasActiveDuplicate) {
        throw new Error(
          `Duplikasi terdeteksi: Pegawai NIP ${input.employee.nip} dengan Nomor SK ${input.nomorSk} dan tanggal efektif ${input.effectiveDate} sudah tercatat dalam sistem.`
        );
      }

      let dokumenPendukung: MutationAttachment | null = null;
      if (input.dokumenFile) {
        const uploadedUrl = await uploadFileSmart({
          file: input.dokumenFile,
          fileName: input.dokumenFile.name,
          storagePath: 'mutations',
          category: 'mutation_doc',
          label: 'SK Mutasi',
        });
        dokumenPendukung = {
          name: clamp(input.dokumenFile.name, 256, 'SK_Mutasi.pdf'),
          url: clamp(uploadedUrl, 1024),
          size: input.dokumenFile.size,
          type: input.dokumenFile.type || 'application/pdf',
          uploadedAt: new Date().toISOString(),
        };
      }

      const docRef = doc(collection(db, 'employee_mutations'));
      const currentBidang = resolveCurrentBidang(
        input.employee.bidang,
        input.employee.subUnit,
        input.employee.unitPelaksana
      );

      const payload: Record<string, any> = {
        mutationId: docRef.id,
        dedupeKey,
        employeeId: clamp(input.employee.id, 128),
        employeeNip: clamp(input.employee.nip, 64),
        employeeName: clamp(input.employee.fullName, 256),
        jenisMutasi: input.jenisMutasi,
        arahMutasi: input.jenisMutasi === 'Eksternal' ? input.arahMutasi || 'Masuk' : null,
        subJenisMutasi: clamp(input.subJenisMutasi, 200),
        kategoriMutasi: input.kategoriMutasi,
        jabatanSebelumnya: clamp(input.employee.jabatanLengkap, 256, '-'),
        bidangSebelumnya: clamp(currentBidang, 256, '-'),
        unitKerjaSebelumnya: clamp(input.employee.unitPelaksana, 256, 'UP Kapuas'),
        statusKepegawaianSebelumnya: input.employee.status,
        perusahaanSebelumnya: clamp(input.employee.perusahaan, 256, 'PT PLN Nusantara Power'),
        jabatanBaru: clamp(input.jabatanBaru, 256),
        bidangBaru: clamp(input.bidangBaru, 256),
        unitKerjaBaru: clamp(input.unitKerjaBaru, 256),
        statusKepegawaianBaru: input.statusKepegawaianBaru,
        entitasEksternal:
          input.jenisMutasi === 'Eksternal'
            ? clamp(input.entitasEksternal, 256) || null
            : null,
        effectiveDate: clamp(input.effectiveDate, 32),
        nomorSk: clamp(input.nomorSk, 128),
        tanggalSk: clamp(input.tanggalSk, 32),
        alasanMutasi: clamp(input.alasanMutasi, 1000),
        dokumenPendukung,
        status: 'Menunggu Persetujuan',
        appliedToEmployee: false,
        appliedAt: null,
        rejectionReason: null,
        approvalNotes: null,
        approvedByUid: null,
        approvedByName: null,
        approvedAt: null,
        correctionHistory: [],
        createdByUid: currentUser.uid,
        createdByEmail: clamp(currentUser.email || 'admin@plnnusantarapower.co.id', 256),
        createdByName: clamp(
          profile?.displayName || currentUser.displayName || currentUser.email || 'Admin SDM',
          256
        ),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await runTransaction(db, async (tx) => {
          const empSnap = await tx.get(doc(db, 'employees', input.employee.id!));
          if (!empSnap.exists()) {
            throw new Error('Data pegawai tidak ditemukan di database.');
          }
          tx.set(docRef, payload);
        });

        await logActivity({
          action: 'CREATE',
          entityType: 'mutation',
          entityId: docRef.id,
          entityName: `${input.employee.fullName} (${input.employee.nip})`,
          description: `Pengajuan ${input.kategoriMutasi} (${input.jenisMutasi}) diajukan oleh ${payload.createdByName} dengan SK ${payload.nomorSk} — Menunggu Persetujuan.`,
        });

        return docRef.id;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'employee_mutations');
        throw error;
      }
    },
    [isAdminUser, profile?.displayName]
  );

  const approveOrRejectMutation = useCallback(
    async (
      mutation: EmployeeMutation,
      approve: boolean,
      notesOrReason?: string
    ): Promise<'applied' | 'scheduled' | 'rejected' | 'already_applied'> => {
      const currentUser = auth.currentUser;
      if (!currentUser || !isAdminUser) {
        throw new Error('Hanya pejabat berwenang (Admin / Super Admin) yang dapat memproses persetujuan mutasi.');
      }
      if (!mutation.id) throw new Error('ID mutasi tidak ditemukan.');

      const approverName = clamp(
        profile?.displayName || currentUser.displayName || currentUser.email || 'Pejabat SDM',
        256
      );
      const nowIso = new Date().toISOString();

      if (!approve) {
        const reasonText = clamp(
          notesOrReason,
          512,
          'Pengajuan mutasi tidak disetujui oleh pejabat berwenang.'
        );
        const mutRef = doc(db, 'employee_mutations', mutation.id);
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(mutRef);
          if (!snap.exists()) throw new Error('Data mutasi tidak ditemukan.');
          const fresh = snap.data() as EmployeeMutation;
          if (fresh.appliedToEmployee || fresh.status === 'Diterapkan') {
            throw new Error('Mutasi yang sudah diterapkan ke data pegawai tidak dapat ditolak.');
          }
          tx.update(mutRef, {
            status: 'Ditolak',
            rejectionReason: reasonText,
            approvedByUid: currentUser.uid,
            approvedByName: approverName,
            approvedAt: nowIso,
            updatedAt: serverTimestamp(),
          });
        });

        await logActivity({
          action: 'UPDATE',
          entityType: 'mutation',
          entityId: mutation.id,
          entityName: `${mutation.employeeName} (${mutation.employeeNip})`,
          description: `Pengajuan mutasi SK ${mutation.nomorSk} ditolak oleh ${approverName}: ${reasonText}`,
        });

        return 'rejected';
      }

      return applyMutationInTransaction(mutation, {
        approvedByUid: currentUser.uid,
        approvedByName: approverName,
        approvedAt: nowIso,
        approvalNotes: clamp(notesOrReason, 512) || null,
      });
    },
    [isAdminUser, profile?.displayName, applyMutationInTransaction]
  );

  const correctMutation = useCallback(
    async (mutation: EmployeeMutation, updates: CorrectMutationInput): Promise<void> => {
      const currentUser = auth.currentUser;
      if (!currentUser || !isAdminUser) {
        throw new Error('Hanya Admin / Super Admin yang berwenang melakukan koreksi mutasi.');
      }
      if (!mutation.id) throw new Error('ID mutasi tidak ditemukan.');
      if (!updates.reason.trim()) {
        throw new Error('Alasan koreksi mutasi wajib diisi untuk pencatatan audit.');
      }

      let nextAttachment = mutation.dokumenPendukung || null;
      if (updates.dokumenFile) {
        const uploadedUrl = await uploadFileSmart({
          file: updates.dokumenFile,
          fileName: updates.dokumenFile.name,
          storagePath: 'mutations',
          category: 'mutation_doc',
          label: 'Dokumen Koreksi SK Mutasi',
        });
        nextAttachment = {
          name: clamp(updates.dokumenFile.name, 256, 'SK_Mutasi_Koreksi.pdf'),
          url: clamp(uploadedUrl, 1024),
          size: updates.dokumenFile.size,
          type: updates.dokumenFile.type || 'application/pdf',
          uploadedAt: new Date().toISOString(),
        };
      }

      const correctorName = clamp(
        profile?.displayName || currentUser.displayName || currentUser.email || 'Admin SDM',
        256
      );
      const mutRef = doc(db, 'employee_mutations', mutation.id);
      const empRef = doc(db, 'employees', mutation.employeeId);
      let employeeWasUpdated = false;

      await runTransaction(db, async (tx) => {
        const mutSnap = await tx.get(mutRef);
        if (!mutSnap.exists()) throw new Error('Data mutasi tidak ditemukan.');
        const freshMut = mutSnap.data() as EmployeeMutation;

        const empSnap = await tx.get(empRef);
        const freshEmp = empSnap.exists() ? (empSnap.data() as Employee) : null;

        const previousSummary = `${freshMut.unitKerjaBaru} · ${freshMut.bidangBaru} · ${freshMut.jabatanBaru} (SK ${freshMut.nomorSk}, Efektif ${freshMut.effectiveDate})`;
        const newSummary = `${updates.unitKerjaBaru} · ${updates.bidangBaru} · ${updates.jabatanBaru} (SK ${updates.nomorSk}, Efektif ${updates.effectiveDate})`;

        const entry: MutationCorrectionEntry = {
          correctedAt: new Date().toISOString(),
          correctedByUid: currentUser.uid,
          correctedByName: correctorName,
          reason: clamp(updates.reason, 400),
          previousSummary: clamp(previousSummary, 400),
          newSummary: clamp(newSummary, 400),
        };

        const existingHistory = Array.isArray(freshMut.correctionHistory)
          ? freshMut.correctionHistory
          : [];
        const nextHistory = [...existingHistory, entry].slice(-50);

        const nextDedupeKey = buildMutationDedupeKey(
          freshMut.employeeNip,
          updates.nomorSk,
          updates.effectiveDate,
          freshMut.kategoriMutasi
        );

        tx.update(mutRef, {
          jabatanBaru: clamp(updates.jabatanBaru, 256),
          bidangBaru: clamp(updates.bidangBaru, 256),
          unitKerjaBaru: clamp(updates.unitKerjaBaru, 256),
          statusKepegawaianBaru: updates.statusKepegawaianBaru,
          entitasEksternal:
            freshMut.jenisMutasi === 'Eksternal'
              ? clamp(updates.entitasEksternal, 256) || null
              : null,
          effectiveDate: clamp(updates.effectiveDate, 32),
          nomorSk: clamp(updates.nomorSk, 128),
          tanggalSk: clamp(updates.tanggalSk, 32),
          alasanMutasi: clamp(updates.alasanMutasi, 1000),
          dokumenPendukung: nextAttachment,
          dedupeKey: nextDedupeKey,
          correctionHistory: nextHistory,
          updatedAt: serverTimestamp(),
        });

        // If this mutation is already applied AND is the latest applied mutation on employee, sync employee master
        if (
          freshMut.appliedToEmployee &&
          freshEmp &&
          (!freshEmp.lastMutationId || freshEmp.lastMutationId === freshMut.mutationId)
        ) {
          const isOutboundExternal =
            freshMut.jenisMutasi === 'Eksternal' && freshMut.arahMutasi === 'Keluar';
          tx.update(empRef, {
            jabatanLengkap: clamp(updates.jabatanBaru, 256, freshEmp.jabatanLengkap),
            bidang: clamp(updates.bidangBaru, 256),
            subUnit: clamp(updates.bidangBaru, 256, freshEmp.subUnit || updates.bidangBaru),
            unitPelaksana: clamp(updates.unitKerjaBaru, 256, freshEmp.unitPelaksana),
            status: updates.statusKepegawaianBaru,
            placementStatus: isOutboundExternal ? 'Mutasi Keluar' : 'Aktif',
            externalEntity:
              freshMut.jenisMutasi === 'Eksternal'
                ? clamp(updates.entitasEksternal, 256) || null
                : null,
            tanggalMulaiJabatan: clamp(updates.effectiveDate, 32),
            masaJabatan:
              calculatePositionTenure(updates.effectiveDate) || freshEmp.masaJabatan || '',
            lastMutationDate: clamp(updates.effectiveDate, 32),
            lastMutationSkNumber: clamp(updates.nomorSk, 128),
            updatedAt: serverTimestamp(),
          });
          employeeWasUpdated = true;
        }
      });

      if (employeeWasUpdated) {
        const refreshedEmpSnap = await getDoc(empRef);
        if (refreshedEmpSnap.exists()) {
          await Promise.allSettled([
            syncPublicVerification(refreshedEmpSnap.id, {
              id: refreshedEmpSnap.id,
              ...(refreshedEmpSnap.data() as Employee),
            }),
            syncPublicStats(),
          ]);
        }
      }

      await logActivity({
        action: 'UPDATE',
        entityType: 'mutation',
        entityId: mutation.id,
        entityName: `${mutation.employeeName} (${mutation.employeeNip})`,
        description: `Koreksi data mutasi SK ${updates.nomorSk} oleh ${correctorName}: ${clamp(updates.reason, 220)}`,
      });
    },
    [isAdminUser, profile?.displayName]
  );

  const mutationStats = useMemo(() => {
    const currentYear = String(new Date().getFullYear());
    const nonRejected = mutations.filter((m) => m.status !== 'Ditolak');

    const totalInternal = nonRejected.filter((m) => m.jenisMutasi === 'Internal').length;
    const totalEksternal = nonRejected.filter((m) => m.jenisMutasi === 'Eksternal').length;
    const eksternalMasuk = nonRejected.filter(
      (m) => m.jenisMutasi === 'Eksternal' && m.arahMutasi === 'Masuk'
    ).length;
    const eksternalKeluar = nonRejected.filter(
      (m) => m.jenisMutasi === 'Eksternal' && m.arahMutasi === 'Keluar'
    ).length;

    const antarUnit = nonRejected.filter(
      (m) =>
        m.kategoriMutasi === 'Mutasi Unit' ||
        m.kategoriMutasi === 'Mutasi Unit dan Jabatan' ||
        m.unitKerjaSebelumnya !== m.unitKerjaBaru
    ).length;
    const antarBidang = nonRejected.filter(
      (m) => m.bidangSebelumnya !== m.bidangBaru
    ).length;
    const mutasiJabatan = nonRejected.filter(
      (m) =>
        m.kategoriMutasi === 'Mutasi Jabatan' ||
        m.kategoriMutasi === 'Mutasi Unit dan Jabatan'
    ).length;

    const menungguPersetujuan = mutations.filter(
      (m) => m.status === 'Menunggu Persetujuan'
    ).length;
    const disetujuiTerjadwal = mutations.filter((m) => m.status === 'Disetujui').length;
    const diterapkan = mutations.filter((m) => m.status === 'Diterapkan').length;
    const ditolak = mutations.filter((m) => m.status === 'Ditolak').length;
    const tahunBerjalan = nonRejected.filter((m) =>
      (m.effectiveDate || '').startsWith(currentYear)
    ).length;

    // Breakdown by Year
    const yearMap: Record<string, { year: string; internal: number; eksternal: number; total: number }> = {};
    nonRejected.forEach((m) => {
      const y = (m.effectiveDate || '').slice(0, 4) || currentYear;
      if (!yearMap[y]) {
        yearMap[y] = { year: y, internal: 0, eksternal: 0, total: 0 };
      }
      if (m.jenisMutasi === 'Internal') yearMap[y].internal += 1;
      else yearMap[y].eksternal += 1;
      yearMap[y].total += 1;
    });
    const byYear = Object.values(yearMap).sort((a, b) => a.year.localeCompare(b.year));

    // Breakdown by Unit Kerja (Tujuan & Asal)
    const unitMap: Record<string, { name: string; tujuan: number; asal: number; total: number }> = {};
    nonRejected.forEach((m) => {
      const uTarget = m.unitKerjaBaru || 'UP Kapuas';
      const uOrigin = m.unitKerjaSebelumnya || 'UP Kapuas';
      if (!unitMap[uTarget]) unitMap[uTarget] = { name: uTarget, tujuan: 0, asal: 0, total: 0 };
      if (!unitMap[uOrigin]) unitMap[uOrigin] = { name: uOrigin, tujuan: 0, asal: 0, total: 0 };
      unitMap[uTarget].tujuan += 1;
      unitMap[uTarget].total += 1;
      if (uOrigin !== uTarget) {
        unitMap[uOrigin].asal += 1;
      }
    });
    const byUnit = Object.values(unitMap).sort((a, b) => b.total - a.total);

    // Breakdown by Bidang Tujuan
    const bidangMap: Record<string, number> = {};
    nonRejected.forEach((m) => {
      const b = m.bidangBaru || '-';
      bidangMap[b] = (bidangMap[b] || 0) + 1;
    });
    const byBidang = Object.entries(bidangMap)
      .map(([name, total]) => ({
        name: name.replace(/^Bidang\s+/i, ''),
        fullName: name,
        total,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      currentYear,
      totalRecords: mutations.length,
      totalInternal,
      totalEksternal,
      eksternalMasuk,
      eksternalKeluar,
      antarUnit,
      antarBidang,
      mutasiJabatan,
      menungguPersetujuan,
      disetujuiTerjadwal,
      diterapkan,
      ditolak,
      tahunBerjalan,
      byYear,
      byUnit,
      byBidang,
    };
  }, [mutations]);

  return {
    mutations,
    loading,
    mutationStats,
    submitMutation,
    approveOrRejectMutation,
    applyScheduledMutation: applyMutationInTransaction,
    correctMutation,
  };
};
