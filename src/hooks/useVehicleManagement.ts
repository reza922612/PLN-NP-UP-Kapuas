import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { logActivity } from '../lib/activityLogger';
import {
  PerintahJalanData,
  VehicleDriver,
  VehicleLoanRequest,
  VehicleLoanStatus,
  VehicleTrackingPoint,
  VehicleUnit,
} from '../types';

export function calculateTimeDurationLabel(startHHMM: string, endHHMM: string): string {
  if (!startHHMM || !endHHMM) return '-';
  const [sh, sm] = startHHMM.split(':').map(Number);
  const [eh, em] = endHHMM.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return '-';

  const startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin < startMin) {
    endMin += 24 * 60; // overnight wrap
  }
  const diffMin = endMin - startMin;
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  const decimalHours = (diffMin / 60).toFixed(1).replace(/\.0$/, '');

  if (diffMin === 0) return '0 Jam';
  if (mins === 0) return `${hours} Jam`;
  if (hours === 0) return `${mins} Menit (${decimalHours} Jam)`;
  return `${hours} Jam ${mins} Menit (${decimalHours} Jam)`;
}

const clampStr = (val: string | null | undefined, maxLen: number): string => {
  const s = (val || '').trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
};

const safeNonNegativeInt = (val: unknown, fallback = 0): number => {
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.round(num);
};

export interface SaveVehicleLoanInput {
  existingId?: string;
  existingLoanNumber?: string;
  existingStatus?: VehicleLoanStatus;
  nama: string;
  jumlahPenumpang: number;
  tujuan: string;
  tanggalDipergunakan: string;
  bidang: string;
  keperluan: string;
  jamMulai: string;
  jamSelesai: string;
  pemohonEmployeeId?: string | null;
  pemohonNama: string;
  pemohonNip?: string | null;
  pemohonJabatan?: string | null;
  atasanLangsungEmployeeId?: string | null;
  atasanLangsungNama: string;
  atasanLangsungJabatan?: string | null;
  asmanBisnisSupportEmployeeId?: string | null;
  asmanBisnisSupportNama: string;
  asmanBisnisSupportJabatan?: string | null;
}

export interface SavePerintahJalanInput {
  tanggal: string;
  driverId?: string | null;
  driverNama: string;
  berangkatJam: string;
  kembaliJam: string;
  vehicleId?: string | null;
  kendaraanNoPol: string;
  kendaraanNama: string;
  keperluan: string;
  standKmAwal: number;
  standKmAkhir: number;
  targetStatus?: VehicleLoanStatus;
}

export const useVehicleManagement = (enabled: boolean = true) => {
  const { user, profile } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleUnit[]>([]);
  const [drivers, setDrivers] = useState<VehicleDriver[]>([]);
  const [loans, setLoans] = useState<VehicleLoanRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !user) {
      setLoading(false);
      return;
    }

    let vehiclesReady = false;
    let driversReady = false;
    let loansReady = false;

    const markReady = () => {
      if (vehiclesReady && driversReady && loansReady) {
        setLoading(false);
      }
    };

    const unsubVehicles = onSnapshot(
      query(collection(db, 'vehicles'), orderBy('noPol', 'asc')),
      (snap) => {
        setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as VehicleUnit[]);
        vehiclesReady = true;
        markReady();
      },
      (err) => {
        console.warn('Vehicles listener error:', err);
        vehiclesReady = true;
        markReady();
      }
    );

    const unsubDrivers = onSnapshot(
      query(collection(db, 'vehicle_drivers'), orderBy('namaDriver', 'asc')),
      (snap) => {
        setDrivers(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as VehicleDriver[]);
        driversReady = true;
        markReady();
      },
      (err) => {
        console.warn('Drivers listener error:', err);
        driversReady = true;
        markReady();
      }
    );

    const unsubLoans = onSnapshot(
      query(collection(db, 'vehicle_loans'), orderBy('createdAt', 'desc')),
      (snap) => {
        setLoans(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as VehicleLoanRequest[]);
        loansReady = true;
        markReady();
      },
      (err) => {
        console.warn('Vehicle loans listener error:', err);
        loansReady = true;
        markReady();
      }
    );

    return () => {
      unsubVehicles();
      unsubDrivers();
      unsubLoans();
    };
  }, [enabled, user?.uid]);

  const vehicleStats = useMemo(() => {
    return {
      totalVehicles: vehicles.length,
      availableVehicles: vehicles.filter((v) => v.status === 'Tersedia').length,
      activeDrivers: drivers.filter((d) => d.status === 'Aktif').length,
      pendingLoans: loans.filter((l) => l.status === 'Menunggu Persetujuan').length,
      activeTrips: loans.filter(
        (l) => l.status === 'Sedang Berpergian' || l.isTrackingActive === true
      ).length,
      completedTrips: loans.filter((l) => l.status === 'Selesai').length,
    };
  }, [vehicles, drivers, loans]);

  // --- Vehicles Master CRUD ---
  const saveVehicle = async (
    input: Omit<VehicleUnit, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    try {
      const payload = {
        noPol: clampStr(input.noPol, 32).toUpperCase(),
        namaKendaraan: clampStr(input.namaKendaraan, 150),
        jenisKendaraan: clampStr(input.jenisKendaraan, 64) || 'MPV',
        kapasitasPenumpang: Math.min(100, Math.max(1, safeNonNegativeInt(input.kapasitasPenumpang, 4))),
        unitKerja: clampStr(input.unitKerja, 128) || 'UP Kapuas',
        status: input.status || 'Tersedia',
        tahun: clampStr(input.tahun, 8) || null,
        kmTerakhir: safeNonNegativeInt(input.kmTerakhir, 0),
        updatedAt: serverTimestamp(),
      };

      if (existingId) {
        await updateDoc(doc(db, 'vehicles', existingId), payload);
        await logActivity({
          action: 'UPDATE',
          entityType: 'vehicle',
          entityId: existingId,
          entityName: `${payload.noPol} · ${payload.namaKendaraan}`,
          description: `Memperbarui data kendaraan dinas ${payload.namaKendaraan} (${payload.noPol})`,
        });
      } else {
        const ref = await addDoc(collection(db, 'vehicles'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        await logActivity({
          action: 'CREATE',
          entityType: 'vehicle',
          entityId: ref.id,
          entityName: `${payload.noPol} · ${payload.namaKendaraan}`,
          description: `Menambahkan kendaraan dinas baru ${payload.namaKendaraan} (${payload.noPol})`,
        });
      }
    } catch (error) {
      handleFirestoreError(error, existingId ? OperationType.UPDATE : OperationType.CREATE, 'vehicles');
    }
  };

  const deleteVehicle = async (vehicle: VehicleUnit) => {
    if (!vehicle.id) return;
    try {
      await deleteDoc(doc(db, 'vehicles', vehicle.id));
      await logActivity({
        action: 'DELETE',
        entityType: 'vehicle',
        entityId: vehicle.id,
        entityName: `${vehicle.noPol} · ${vehicle.namaKendaraan}`,
        description: `Menghapus kendaraan dinas ${vehicle.namaKendaraan} (${vehicle.noPol})`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `vehicles/${vehicle.id}`);
    }
  };

  // --- Drivers Master CRUD ---
  const saveDriver = async (
    input: Omit<VehicleDriver, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    try {
      const payload = {
        namaDriver: clampStr(input.namaDriver, 200),
        noHp: clampStr(input.noHp, 32),
        noSim: clampStr(input.noSim, 64),
        employeeId: clampStr(input.employeeId, 128) || null,
        unitKerja: clampStr(input.unitKerja, 128) || 'UP Kapuas',
        status: input.status || 'Aktif',
        updatedAt: serverTimestamp(),
      };

      if (existingId) {
        await updateDoc(doc(db, 'vehicle_drivers', existingId), payload);
        await logActivity({
          action: 'UPDATE',
          entityType: 'vehicle',
          entityId: existingId,
          entityName: payload.namaDriver,
          description: `Memperbarui data pengemudi ${payload.namaDriver}`,
        });
      } else {
        const ref = await addDoc(collection(db, 'vehicle_drivers'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        await logActivity({
          action: 'CREATE',
          entityType: 'vehicle',
          entityId: ref.id,
          entityName: payload.namaDriver,
          description: `Menambahkan pengemudi/driver baru ${payload.namaDriver}`,
        });
      }
    } catch (error) {
      handleFirestoreError(
        error,
        existingId ? OperationType.UPDATE : OperationType.CREATE,
        'vehicle_drivers'
      );
    }
  };

  const deleteDriver = async (driver: VehicleDriver) => {
    if (!driver.id) return;
    try {
      await deleteDoc(doc(db, 'vehicle_drivers', driver.id));
      await logActivity({
        action: 'DELETE',
        entityType: 'vehicle',
        entityId: driver.id,
        entityName: driver.namaDriver,
        description: `Menghapus data pengemudi ${driver.namaDriver}`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `vehicle_drivers/${driver.id}`);
    }
  };

  // --- Vehicle Loans & Perintah Jalan ---
  const saveVehicleLoan = async (input: SaveVehicleLoanInput): Promise<string> => {
    if (!user) throw new Error('Pengguna belum terautentikasi.');

    const durasiJam = clampStr(calculateTimeDurationLabel(input.jamMulai, input.jamSelesai), 64);
    const loanNumber = clampStr(
      input.existingLoanNumber ||
        `PKD-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`,
      64
    );

    const nextEditStatus: VehicleLoanStatus =
      input.existingId &&
      input.existingStatus &&
      input.existingStatus !== 'Ditolak'
        ? input.existingStatus
        : 'Menunggu Persetujuan';

    const basePayload = {
      loanNumber,
      nama: clampStr(input.nama, 256),
      jumlahPenumpang: Math.min(100, Math.max(1, safeNonNegativeInt(input.jumlahPenumpang, 1))),
      tujuan: clampStr(input.tujuan, 300),
      tanggalDipergunakan: clampStr(input.tanggalDipergunakan, 32),
      bidang: clampStr(input.bidang, 128),
      keperluan: clampStr(input.keperluan, 500),
      jamMulai: clampStr(input.jamMulai, 16),
      jamSelesai: clampStr(input.jamSelesai, 16),
      durasiJam,
      pemohonEmployeeId: clampStr(input.pemohonEmployeeId, 128) || null,
      pemohonNama: clampStr(input.pemohonNama, 256),
      pemohonNip: clampStr(input.pemohonNip, 64) || null,
      pemohonJabatan: clampStr(input.pemohonJabatan, 256) || null,
      atasanLangsungEmployeeId: clampStr(input.atasanLangsungEmployeeId, 128) || null,
      atasanLangsungNama: clampStr(input.atasanLangsungNama, 256),
      atasanLangsungJabatan: clampStr(input.atasanLangsungJabatan, 256) || null,
      asmanBisnisSupportEmployeeId: clampStr(input.asmanBisnisSupportEmployeeId, 128) || null,
      asmanBisnisSupportNama: clampStr(input.asmanBisnisSupportNama, 256),
      asmanBisnisSupportJabatan: clampStr(input.asmanBisnisSupportJabatan, 256) || null,
      status: nextEditStatus,
      rejectionReason: null,
      updatedAt: serverTimestamp(),
    };

    try {
      if (input.existingId) {
        await updateDoc(doc(db, 'vehicle_loans', input.existingId), basePayload);
        await logActivity({
          action: 'UPDATE',
          entityType: 'vehicle',
          entityId: input.existingId,
          entityName: `${loanNumber} · ${basePayload.tujuan}`,
          description: `Memperbarui pengajuan peminjaman kendaraan oleh ${basePayload.pemohonNama}`,
        });
        return input.existingId;
      } else {
        const ref = await addDoc(collection(db, 'vehicle_loans'), {
          ...basePayload,
          perintahJalan: null,
          isTrackingActive: false,
          currentLat: null,
          currentLng: null,
          currentSpeedKmh: null,
          lastLocationLabel: null,
          trackingUpdatedAt: null,
          trackingHistory: [],
          createdByUid: user.uid,
          createdByEmail: clampStr(user.email || 'user@plnnusantarapower.co.id', 256),
          createdAt: serverTimestamp(),
        });
        await logActivity({
          action: 'CREATE',
          entityType: 'vehicle',
          entityId: ref.id,
          entityName: `${loanNumber} · ${basePayload.tujuan}`,
          description: `Pengajuan peminjaman kendaraan baru oleh ${basePayload.pemohonNama} tujuan ${basePayload.tujuan}`,
        });
        return ref.id;
      }
    } catch (error) {
      handleFirestoreError(
        error,
        input.existingId ? OperationType.UPDATE : OperationType.CREATE,
        input.existingId ? `vehicle_loans/${input.existingId}` : 'vehicle_loans'
      );
      throw error;
    }
  };

  const approveOrRejectLoan = async (
    loan: VehicleLoanRequest,
    approve: boolean,
    reason?: string
  ) => {
    if (!loan.id) return;
    try {
      const nextStatus: VehicleLoanStatus = approve ? 'Disetujui' : 'Ditolak';
      await updateDoc(doc(db, 'vehicle_loans', loan.id), {
        status: nextStatus,
        rejectionReason: approve ? null : clampStr(reason || 'Pengajuan ditolak oleh admin.', 512),
        updatedAt: serverTimestamp(),
      });
      await logActivity({
        action: 'UPDATE',
        entityType: 'vehicle',
        entityId: loan.id,
        entityName: `${loan.loanNumber} · ${loan.pemohonNama}`,
        description: `${approve ? 'Menyetujui' : 'Menolak'} pengajuan kendaraan dinas ${loan.loanNumber}`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `vehicle_loans/${loan.id}`);
    }
  };

  const savePerintahJalan = async (loan: VehicleLoanRequest, input: SavePerintahJalanInput) => {
    if (!loan.id || !user) return;
    const lamaDipergunakan = clampStr(
      calculateTimeDurationLabel(input.berangkatJam, input.kembaliJam),
      64
    );
    const kmAwal = safeNonNegativeInt(input.standKmAwal, 0);
    const kmAkhir = safeNonNegativeInt(input.standKmAkhir, 0);
    const jarakTempuh = kmAkhir >= kmAwal ? kmAkhir - kmAwal : 0;

    const perintahJalan: PerintahJalanData = {
      tanggal: clampStr(input.tanggal, 32),
      driverId: clampStr(input.driverId, 128) || null,
      driverNama: clampStr(input.driverNama, 200),
      berangkatJam: clampStr(input.berangkatJam, 16),
      kembaliJam: clampStr(input.kembaliJam, 16),
      lamaDipergunakan: input.kembaliJam ? lamaDipergunakan : 'Sedang berlangsung',
      vehicleId: clampStr(input.vehicleId, 128) || null,
      kendaraanNoPol: clampStr(input.kendaraanNoPol, 32).toUpperCase(),
      kendaraanNama: clampStr(input.kendaraanNama, 150),
      keperluan: clampStr(input.keperluan, 500),
      standKmAwal: kmAwal,
      standKmAkhir: kmAkhir,
      jarakTempuh,
      picUid: user.uid,
      picNama: clampStr(profile?.displayName || user.email || 'PIC Administrasi Kendaraan', 256),
      issuedAt: new Date().toISOString(),
    };

    const nextStatus: VehicleLoanStatus =
      input.targetStatus ||
      (loan.status === 'Sedang Berpergian' || loan.status === 'Selesai'
        ? loan.status
        : 'Perintah Jalan Terbit');

    try {
      await updateDoc(doc(db, 'vehicle_loans', loan.id), {
        perintahJalan,
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      let liveRole = profile?.role || 'unknown';
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          liveRole = String(userSnap.data()?.role || liveRole);
        } else {
          liveRole = 'not_found';
        }
      } catch {
        // Ignore diagnostic lookup error
      }
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.toLowerCase().includes('permission')) {
        handleFirestoreError(
          new Error(`${errMsg} (role: ${liveRole})`),
          OperationType.UPDATE,
          `vehicle_loans/${loan.id}`
        );
      } else {
        handleFirestoreError(error, OperationType.UPDATE, `vehicle_loans/${loan.id}`);
      }
    }

    // Sync vehicle operational status & last KM independently so a non-critical fleet sync error
    // never masks or falsely reports a failure on an already-saved Perintah Jalan.
    if (input.vehicleId) {
      try {
        const vRef = doc(db, 'vehicles', input.vehicleId);
        const vSnap = await getDoc(vRef);
        if (vSnap.exists()) {
          const vData = vSnap.data() as VehicleUnit;
          const vStatus =
            nextStatus === 'Selesai'
              ? 'Tersedia'
              : nextStatus === 'Sedang Berpergian' || nextStatus === 'Perintah Jalan Terbit'
              ? 'Sedang Dipinjam'
              : vData.status;
          const existingKm = safeNonNegativeInt(vData.kmTerakhir, 0);
          const nextKm = Math.max(existingKm, kmAkhir, kmAwal);
          await updateDoc(vRef, {
            status: vStatus,
            kmTerakhir: nextKm,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (vehicleSyncErr) {
        console.warn(`Non-blocking vehicle sync warning for vehicles/${input.vehicleId}:`, vehicleSyncErr);
      }
    }

    await logActivity({
      action: 'UPDATE',
      entityType: 'vehicle',
      entityId: loan.id,
      entityName: `Perintah Jalan ${loan.loanNumber} (${perintahJalan.kendaraanNoPol})`,
      description: `Menerbitkan/memperbarui Perintah Jalan untuk ${loan.pemohonNama} · Driver: ${perintahJalan.driverNama} · Jarak: ${jarakTempuh} km`,
    });
  };

  const deleteVehicleLoan = async (loan: VehicleLoanRequest) => {
    if (!loan.id) return;
    try {
      await deleteDoc(doc(db, 'vehicle_loans', loan.id));
      await logActivity({
        action: 'DELETE',
        entityType: 'vehicle',
        entityId: loan.id,
        entityName: `${loan.loanNumber} · ${loan.pemohonNama}`,
        description: `Menghapus data pengajuan peminjaman kendaraan ${loan.loanNumber}`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `vehicle_loans/${loan.id}`);
    }
  };

  // --- Live GPS Tracking ---
  const pushLiveTracking = async (
    loan: VehicleLoanRequest,
    coords: {
      lat: number;
      lng: number;
      speedKmh?: number | null;
      heading?: number | null;
      accuracy?: number | null;
      label?: string | null;
    }
  ) => {
    if (!loan.id) return;
    const nowIso = new Date().toISOString();
    const point: VehicleTrackingPoint = {
      lat: Number(coords.lat.toFixed(6)),
      lng: Number(coords.lng.toFixed(6)),
      speedKmh: coords.speedKmh != null ? Math.round(coords.speedKmh) : null,
      heading: coords.heading ?? null,
      accuracy: coords.accuracy != null ? Math.round(coords.accuracy) : null,
      recordedAt: nowIso,
      note: coords.label || null,
    };

    const existingHistory = Array.isArray(loan.trackingHistory) ? loan.trackingHistory : [];
    const nextHistory = [...existingHistory, point].slice(-50);

    try {
      await updateDoc(doc(db, 'vehicle_loans', loan.id), {
        status: 'Sedang Berpergian',
        isTrackingActive: true,
        currentLat: point.lat,
        currentLng: point.lng,
        currentSpeedKmh: point.speedKmh ?? 0,
        lastLocationLabel: coords.label || loan.lastLocationLabel || loan.tujuan,
        trackingUpdatedAt: nowIso,
        trackingHistory: nextHistory,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to push live tracking:', error);
      throw error;
    }
  };

  const stopLiveTracking = async (loan: VehicleLoanRequest, markCompleted: boolean = false) => {
    if (!loan.id) return;
    const nowIso = new Date().toISOString();
    try {
      await updateDoc(doc(db, 'vehicle_loans', loan.id), {
        status: markCompleted ? 'Selesai' : loan.status,
        isTrackingActive: false,
        trackingUpdatedAt: nowIso,
        updatedAt: serverTimestamp(),
      });

      if (
        markCompleted &&
        (profile?.role === 'admin' || profile?.role === 'super_admin') &&
        loan.perintahJalan?.vehicleId
      ) {
        const vRef = doc(db, 'vehicles', loan.perintahJalan.vehicleId);
        const vSnap = await getDoc(vRef);
        if (vSnap.exists()) {
          await updateDoc(vRef, {
            status: 'Tersedia',
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `vehicle_loans/${loan.id}`);
    }
  };

  return {
    vehicles,
    drivers,
    loans,
    loading,
    vehicleStats,
    saveVehicle,
    deleteVehicle,
    saveDriver,
    deleteDriver,
    saveVehicleLoan,
    approveOrRejectLoan,
    savePerintahJalan,
    deleteVehicleLoan,
    pushLiveTracking,
    stopLiveTracking,
  };
};
