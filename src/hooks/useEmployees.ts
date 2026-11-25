import { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { logActivity } from '../lib/activityLogger';
import { deletePublicVerification, syncPublicVerification } from '../lib/publicVerification';
import { syncPublicStats } from '../lib/publicStats';
import { calculatePositionTenure } from '../lib/utils';
import { CompanyName, Employee, EmployeeStatus } from '../types';

export interface CsvEmployeeImportRow {
  rowNumber: number;
  nip: string;
  fullName?: string;
  noKPS?: string;
  jabatanLengkap?: string;
  unitPelaksana?: string;
  subUnit?: string;
  status?: string;
  perusahaan?: string;
  personGrade?: string;
  positionGrade?: string;
  emailKorporat?: string;
  noTelepon?: string;
  alamatLengkap?: string;
  jenisKelamin?: string;
  agama?: string;
  pendidikanTerakhir?: string;
  noKTP?: string;
  noNPWP?: string;
  noBPJSKesehatan?: string;
  noBPJSKetenagakerjaan?: string;
  tanggalLahir?: string;
  tanggalMasuk?: string;
  tanggalCalonPegawai?: string;
  tanggalMulaiJabatan?: string;
  tanggalPengangkatan?: string;
  tanggalPensiunNormal?: string;
  tanggalBerakhirBekerja?: string;
  atasanNama?: string;
  atasanJabatan?: string;
}

export interface CsvImportProgress {
  processed: number;
  total: number;
  batchIndex: number;
  totalBatches: number;
}

export interface CsvImportRowOutcome {
  rowNumber: number;
  nip: string;
  fullName: string;
  action: 'created' | 'updated' | 'skipped';
  message?: string;
}

export interface CsvImportResult {
  updatedCount: number;
  createdCount: number;
  skippedCount: number;
  errors: string[];
  rowResults: CsvImportRowOutcome[];
}

const VALID_STATUSES: EmployeeStatus[] = [
  'Pegawai Organik',
  'Pegawai Tugas Khusus',
  'Tenaga Alih Daya',
];

const VALID_COMPANIES: CompanyName[] = [
  'PT PLN Nusantara Power',
  'PT PLN (Persero)',
  'PT PLN Paguntaka Cahaya Nusantara',
  'PT Mitra Karya Prima',
];

const normalizeStatus = (val?: string): EmployeeStatus | undefined => {
  const s = (val || '').trim().toLowerCase();
  if (!s) return undefined;
  if (s.includes('organik')) return 'Pegawai Organik';
  if (s.includes('khusus')) return 'Pegawai Tugas Khusus';
  if (s.includes('alih') || s.includes('daya') || s.includes('tad')) return 'Tenaga Alih Daya';
  return VALID_STATUSES.find((v) => v.toLowerCase() === s);
};

const normalizeCompany = (val?: string): CompanyName | undefined => {
  const c = (val || '').trim().toLowerCase();
  if (!c) return undefined;
  if (c.includes('nusantara power') || c === 'pln np') return 'PT PLN Nusantara Power';
  if (c.includes('persero')) return 'PT PLN (Persero)';
  if (c.includes('paguntaka') || c.includes('pcn')) return 'PT PLN Paguntaka Cahaya Nusantara';
  if (c.includes('mitra karya') || c.includes('mkp')) return 'PT Mitra Karya Prima';
  return VALID_COMPANIES.find((v) => v.toLowerCase() === c);
};

const normalizeGender = (val?: string): 'Laki-laki' | 'Perempuan' | undefined => {
  const g = (val || '').trim().toLowerCase();
  if (!g) return undefined;
  if (g === 'l' || g.includes('laki') || g === 'male' || g === 'pria') return 'Laki-laki';
  if (g === 'p' || g.includes('perempuan') || g === 'female' || g === 'wanita') return 'Perempuan';
  return undefined;
};

export const useEmployees = (shouldFetch: boolean = true) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    organic: 0,
    taskForce: 0,
    subcontract: 0,
    retirement: 0,
    activeCerts: 0,
  });

  useEffect(() => {
    if (!shouldFetch) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'employees'), orderBy('fullName', 'asc'));

    const unsubscribeSnap = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Employee[];
        setEmployees(docs);

        const total = docs.length;
        const organic = docs.filter((e) => e.status === 'Pegawai Organik').length;
        const taskForce = docs.filter((e) => e.status === 'Pegawai Tugas Khusus').length;
        const subcontract = docs.filter((e) => e.status === 'Tenaga Alih Daya').length;

        setStats({
          total,
          organic,
          taskForce,
          subcontract,
          retirement: 0,
          activeCerts: 0,
        });

        setLoading(false);
      },
      (error) => {
        if (error.message.includes('permissions')) {
          console.warn('Waiting for correct permissions/profile...');
        } else {
          console.error('Firestore Error in useEmployees:', error);
        }
        setLoading(false);
      }
    );

    return () => unsubscribeSnap();
  }, [shouldFetch]);

  const createEmployee = async (employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const docRef = await addDoc(collection(db, 'employees'), {
        ...employeeData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await Promise.allSettled([
        syncPublicVerification(docRef.id, employeeData),
        syncPublicStats(),
        logActivity({
          action: 'CREATE',
          entityType: 'employee',
          entityId: docRef.id,
          entityName: `${employeeData.fullName} (${employeeData.nip})`,
          description: `Menambahkan pegawai baru ${employeeData.fullName} (NIP: ${employeeData.nip}) pada ${employeeData.unitPelaksana}`,
        }),
      ]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'employees');
    }
  };

  const updateEmployee = async (id: string, employeeData: Partial<Employee>) => {
    try {
      const docRef = doc(db, 'employees', id);
      let mergedData: Partial<Employee> = { ...employeeData };
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        mergedData = { ...(snap.data() as Employee), ...employeeData };
      }
      await updateDoc(docRef, {
        ...employeeData,
        updatedAt: serverTimestamp(),
      });
      const label = mergedData.fullName
        ? `${mergedData.fullName}${mergedData.nip ? ` (${mergedData.nip})` : ''}`
        : id;
      await Promise.allSettled([
        syncPublicVerification(id, mergedData),
        syncPublicStats(),
        logActivity({
          action: 'UPDATE',
          entityType: 'employee',
          entityId: id,
          entityName: label,
          description: `Memperbarui data pegawai ${label}`,
        }),
      ]);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `employees/${id}`);
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      const docRef = doc(db, 'employees', id);
      let label = id;
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const d = snap.data() as Employee;
        label = `${d.fullName} (${d.nip})`;
      }
      await deleteDoc(docRef);
      await Promise.allSettled([
        deletePublicVerification(id),
        syncPublicStats(),
        logActivity({
          action: 'DELETE',
          entityType: 'employee',
          entityId: id,
          entityName: label,
          description: `Menghapus data pegawai ${label} dari sistem`,
        }),
      ]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `employees/${id}`);
    }
  };

  const importEmployeesFromCsv = async (
    rows: CsvEmployeeImportRow[],
    onProgress?: (progress: CsvImportProgress) => void
  ): Promise<CsvImportResult> => {
    const errors: string[] = [];
    const rowResults: CsvImportRowOutcome[] = [];
    let updatedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;

    // Fetch fresh snapshot so thousands of NIPs match accurately
    const empSnap = await getDocs(collection(db, 'employees'));
    const existingList = empSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Employee) }));
    const byNip: Record<string, Employee & { id: string }> = {};
    const byName: Record<string, Employee & { id: string }> = {};

    existingList.forEach((emp) => {
      if (emp.nip) byNip[emp.nip.trim().toLowerCase()] = emp as Employee & { id: string };
      if (emp.fullName) byName[emp.fullName.trim().toLowerCase()] = emp as Employee & { id: string };
    });

    interface QueuedWrite {
      mode: 'update' | 'create';
      docId: string;
      payload: Record<string, any>;
      verifySnapshot: Partial<Employee>;
    }

    const queued: QueuedWrite[] = [];
    const queuedByNip: Record<string, QueuedWrite> = {};

    const buildPatch = (row: CsvEmployeeImportRow) => {
      const patch: Record<string, any> = {};
      const assignIfPresent = (key: keyof CsvEmployeeImportRow, targetKey: string, maxLen = 256) => {
        const rawVal = row[key];
        const val = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
        if (val && val !== '-') {
          patch[targetKey] = val.slice(0, maxLen);
        }
      };

      assignIfPresent('fullName', 'fullName', 256);
      assignIfPresent('noKPS', 'noKPS', 128);
      assignIfPresent('jabatanLengkap', 'jabatanLengkap', 256);
      assignIfPresent('unitPelaksana', 'unitPelaksana', 256);
      assignIfPresent('subUnit', 'subUnit', 256);
      assignIfPresent('personGrade', 'personGrade', 64);
      assignIfPresent('positionGrade', 'positionGrade', 64);
      assignIfPresent('emailKorporat', 'emailKorporat', 256);
      assignIfPresent('noTelepon', 'noTelepon', 64);
      assignIfPresent('alamatLengkap', 'alamatLengkap', 512);
      assignIfPresent('agama', 'agama', 50);
      assignIfPresent('pendidikanTerakhir', 'pendidikanTerakhir', 128);
      assignIfPresent('noKTP', 'noKTP', 64);
      assignIfPresent('noNPWP', 'noNPWP', 64);
      assignIfPresent('noBPJSKesehatan', 'noBPJSKesehatan', 64);
      assignIfPresent('noBPJSKetenagakerjaan', 'noBPJSKetenagakerjaan', 64);
      assignIfPresent('tanggalLahir', 'tanggalLahir', 32);
      assignIfPresent('tanggalMasuk', 'tanggalMasuk', 32);
      assignIfPresent('tanggalCalonPegawai', 'tanggalCalonPegawai', 32);
      assignIfPresent('tanggalMulaiJabatan', 'tanggalMulaiJabatan', 32);
      assignIfPresent('tanggalPengangkatan', 'tanggalPengangkatan', 32);
      assignIfPresent('tanggalPensiunNormal', 'tanggalPensiunNormal', 32);
      assignIfPresent('tanggalBerakhirBekerja', 'tanggalBerakhirBekerja', 32);

      const normStatus = normalizeStatus(row.status);
      if (normStatus) patch.status = normStatus;

      const normCompany = normalizeCompany(row.perusahaan);
      if (normCompany) patch.perusahaan = normCompany;

      const normGender = normalizeGender(row.jenisKelamin);
      if (normGender) patch.jenisKelamin = normGender;

      if (patch.tanggalMulaiJabatan) {
        patch.masaJabatan = calculatePositionTenure(patch.tanggalMulaiJabatan) || '';
      }

      return patch;
    };

    for (const row of rows) {
      const cleanNip = (row.nip || '').trim();
      if (!cleanNip || cleanNip === '-') {
        skippedCount += 1;
        const msg = `Baris ${row.rowNumber}: NIP kosong sehingga dilewati.`;
        errors.push(msg);
        rowResults.push({
          rowNumber: row.rowNumber,
          nip: '-',
          fullName: (row.fullName || '').trim() || '-',
          action: 'skipped',
          message: 'NIP kosong',
        });
        continue;
      }

      const nipKey = cleanNip.toLowerCase();
      const existing = byNip[nipKey];

      // Resolve optional supervisor name
      let resolvedAtasanId: string | null | undefined;
      let resolvedAtasanNama: string | undefined;
      let resolvedAtasanJabatan: string | undefined;
      if (row.atasanNama && row.atasanNama.trim() && row.atasanNama.trim() !== '-') {
        const supMatch = byName[row.atasanNama.trim().toLowerCase()];
        resolvedAtasanNama = row.atasanNama.trim().slice(0, 256);
        if (supMatch) {
          resolvedAtasanId = supMatch.id;
          resolvedAtasanJabatan = supMatch.jabatanLengkap || row.atasanJabatan?.trim() || '';
        } else if (row.atasanJabatan?.trim()) {
          resolvedAtasanJabatan = row.atasanJabatan.trim().slice(0, 256);
        }
      }

      const alreadyQueued = queuedByNip[nipKey];
      if (alreadyQueued) {
        // Merge non-empty fields from duplicate NIP row in same file into the queued write
        const patch = buildPatch(row);
        if (resolvedAtasanNama) {
          patch.atasanNama = resolvedAtasanNama;
          if (resolvedAtasanId !== undefined) patch.atasanId = resolvedAtasanId;
          if (resolvedAtasanJabatan !== undefined) patch.atasanJabatan = resolvedAtasanJabatan;
        }
        Object.assign(alreadyQueued.payload, patch);
        Object.assign(alreadyQueued.verifySnapshot, patch);
        rowResults.push({
          rowNumber: row.rowNumber,
          nip: cleanNip,
          fullName: String(alreadyQueued.verifySnapshot.fullName || row.fullName || '-'),
          action: alreadyQueued.mode === 'create' ? 'created' : 'updated',
          message: 'Digabung ke NIP yang sama pada file',
        });
        continue;
      }

      if (existing) {
        // Patch ONLY non-empty fields provided in file (never wipe existing data)
        const patch = buildPatch(row);

        if (resolvedAtasanNama) {
          patch.atasanNama = resolvedAtasanNama;
          if (resolvedAtasanId !== undefined) patch.atasanId = resolvedAtasanId;
          if (resolvedAtasanJabatan !== undefined) patch.atasanJabatan = resolvedAtasanJabatan;
        }

        if (Object.keys(patch).length === 0) {
          skippedCount += 1;
          rowResults.push({
            rowNumber: row.rowNumber,
            nip: cleanNip,
            fullName: existing.fullName || '-',
            action: 'skipped',
            message: 'Tidak ada kolom perubahan',
          });
          continue;
        }

        patch.updatedAt = serverTimestamp();

        const merged = { ...existing, ...patch };
        const qItem: QueuedWrite = {
          mode: 'update',
          docId: existing.id,
          payload: patch,
          verifySnapshot: merged,
        };
        queued.push(qItem);
        queuedByNip[nipKey] = qItem;
        updatedCount += 1;
        rowResults.push({
          rowNumber: row.rowNumber,
          nip: cleanNip,
          fullName: String(merged.fullName || '-'),
          action: 'updated',
        });
      } else {
        // Create new employee record (requires fullName)
        const cleanName = (row.fullName || '').trim();
        if (!cleanName || cleanName === '-') {
          skippedCount += 1;
          const msg = `Baris ${row.rowNumber} (NIP ${cleanNip}): Pegawai baru belum terdaftar di sistem dan kolom Nama Lengkap kosong.`;
          errors.push(msg);
          rowResults.push({
            rowNumber: row.rowNumber,
            nip: cleanNip,
            fullName: '-',
            action: 'skipped',
            message: 'Nama Lengkap kosong',
          });
          continue;
        }

        const newDocRef = doc(collection(db, 'employees'));
        const tglMulaiJabatan = (row.tanggalMulaiJabatan || '').trim();
        const newPayload: Record<string, any> = {
          nip: cleanNip.slice(0, 64),
          fullName: cleanName.slice(0, 256),
          unitPelaksana: (row.unitPelaksana || 'UP Kapuas').trim().slice(0, 256) || 'UP Kapuas',
          subUnit: (row.subUnit || '').trim().slice(0, 256),
          jabatanLengkap: (row.jabatanLengkap || '').trim().slice(0, 256),
          personGrade: (row.personGrade || '').trim().slice(0, 64),
          positionGrade: (row.positionGrade || '').trim().slice(0, 64),
          tanggalMasuk: (row.tanggalMasuk || '').trim().slice(0, 32),
          tanggalCalonPegawai: (row.tanggalCalonPegawai || '').trim().slice(0, 32),
          emailKorporat: (row.emailKorporat || '').trim().slice(0, 256),
          alamatLengkap: (row.alamatLengkap || '').trim().slice(0, 512),
          tanggalLahir: (row.tanggalLahir || '').trim().slice(0, 32),
          tanggalMulaiJabatan: tglMulaiJabatan.slice(0, 32),
          masaJabatan: tglMulaiJabatan ? calculatePositionTenure(tglMulaiJabatan) : '',
          tanggalPengangkatan: (row.tanggalPengangkatan || '').trim().slice(0, 32),
          tanggalBerakhirBekerja: (row.tanggalBerakhirBekerja || '').trim().slice(0, 32),
          tanggalPensiunNormal: (row.tanggalPensiunNormal || '').trim().slice(0, 32),
          jenisKelamin: normalizeGender(row.jenisKelamin) || 'Laki-laki',
          agama: (row.agama || 'Islam').trim().slice(0, 50) || 'Islam',
          noTelepon: (row.noTelepon || '').trim().slice(0, 64),
          noNPWP: (row.noNPWP || '').trim().slice(0, 64),
          noKTP: (row.noKTP || '').trim().slice(0, 64),
          noBPJSKesehatan: (row.noBPJSKesehatan || '').trim().slice(0, 64),
          noBPJSKetenagakerjaan: (row.noBPJSKetenagakerjaan || '').trim().slice(0, 64),
          noKPS: (row.noKPS || '').trim().slice(0, 128),
          pendidikanTerakhir: (row.pendidikanTerakhir || '').trim().slice(0, 128),
          status: normalizeStatus(row.status) || 'Pegawai Organik',
          perusahaan: normalizeCompany(row.perusahaan) || 'PT PLN Nusantara Power',
          atasanId: resolvedAtasanId || null,
          atasanNama: resolvedAtasanNama || '',
          atasanJabatan: resolvedAtasanJabatan || '',
          familyMembers: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        // Register in maps in case duplicate NIPs or supervisor references appear later in same file
        const registeredEmp = { id: newDocRef.id, ...(newPayload as Employee) };
        byNip[nipKey] = registeredEmp;
        byName[cleanName.toLowerCase()] = registeredEmp;

        const qItem: QueuedWrite = {
          mode: 'create',
          docId: newDocRef.id,
          payload: newPayload,
          verifySnapshot: newPayload as Partial<Employee>,
        };
        queued.push(qItem);
        queuedByNip[nipKey] = qItem;
        createdCount += 1;
        rowResults.push({
          rowNumber: row.rowNumber,
          nip: cleanNip,
          fullName: cleanName,
          action: 'created',
        });
      }
    }

    const CHUNK_SIZE = 400;
    const totalBatches = Math.max(1, Math.ceil(queued.length / CHUNK_SIZE));
    let processed = 0;

    for (let i = 0; i < queued.length; i += CHUNK_SIZE) {
      const slice = queued.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const item of slice) {
        const ref = doc(db, 'employees', item.docId);
        if (item.mode === 'update') {
          batch.update(ref, item.payload);
        } else {
          batch.set(ref, item.payload);
        }
      }
      await batch.commit();
      processed += slice.length;
      onProgress?.({
        processed,
        total: queued.length,
        batchIndex: Math.floor(i / CHUNK_SIZE) + 1,
        totalBatches,
      });
    }

    // Sync public stats & consolidated activity log once
    if (updatedCount > 0 || createdCount > 0) {
      const createdItems = queued.filter((q) => q.mode === 'create').slice(0, 50);
      await Promise.allSettled([
        ...createdItems.map((c) => syncPublicVerification(c.docId, c.verifySnapshot)),
        syncPublicStats(),
        logActivity({
          action: createdCount > 0 ? 'CREATE' : 'UPDATE',
          entityType: 'employee',
          entityId: 'bulk_spreadsheet_import',
          entityName: `Impor Excel/CSV (${updatedCount + createdCount} Pegawai)`,
          description: `Input massal pegawai via Excel/CSV selesai: ${createdCount} pegawai baru ditambahkan & ${updatedCount} pegawai diperbarui.`,
        }),
      ]);
    }

    return {
      updatedCount,
      createdCount,
      skippedCount,
      errors,
      rowResults,
    };
  };

  return {
    employees,
    loading,
    stats,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    importEmployeesFromCsv,
  };
};

