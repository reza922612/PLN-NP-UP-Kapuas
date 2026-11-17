import { collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Employee, PublicUnitSummary, Unit } from '../types';

export const PUBLIC_STATS_DOC_ID = 'up_kapuas';

export async function syncPublicStats(
  employeesInput?: Employee[],
  unitsInput?: Unit[]
): Promise<void> {
  try {
    let employees = employeesInput;
    let units = unitsInput;

    if (!employees) {
      const empSnap = await getDocs(collection(db, 'employees'));
      employees = empSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Employee));
    }

    if (!units) {
      const unitSnap = await getDocs(collection(db, 'units'));
      units = unitSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Unit));
    }

    const totalEmployees = employees.length;
    const organicCount = employees.filter((e) => e.status === 'Pegawai Organik').length;
    const taskForceCount = employees.filter((e) => e.status === 'Pegawai Tugas Khusus').length;
    const subcontractCount = employees.filter((e) => e.status === 'Tenaga Alih Daya').length;

    let totalMachines = 0;
    let totalCapacityKW = 0;
    let totalPeakLoadKW = 0;
    const systemBreakdown: Record<string, { machines: number; capacityKW: number; peakLoadKW: number }> = {};
    const machineTypeBreakdown: Record<string, { machines: number; capacityKW: number }> = {};

    const unitSummaries: PublicUnitSummary[] = units.slice(0, 50).map((unit) => {
      const machines = Array.isArray(unit.mesin) ? unit.mesin : [];
      let cap = 0;
      let peak = 0;
      const systemsSet = new Set<string>();
      const typesSet = new Set<string>();

      machines.forEach((m) => {
        const dmn = Number(m.dayaMampuNominal) || 0;
        const bp = Number(m.bebanPuncak) || 0;
        cap += dmn;
        peak += bp;
        totalMachines += 1;
        totalCapacityKW += dmn;
        totalPeakLoadKW += bp;

        const sys = (m.sistem || 'Lainnya').trim();
        systemsSet.add(sys);
        if (!systemBreakdown[sys]) {
          systemBreakdown[sys] = { machines: 0, capacityKW: 0, peakLoadKW: 0 };
        }
        systemBreakdown[sys].machines += 1;
        systemBreakdown[sys].capacityKW += dmn;
        systemBreakdown[sys].peakLoadKW += bp;

        const jenis = (m.jenisMesin || 'Lainnya').trim();
        typesSet.add(jenis);
        if (!machineTypeBreakdown[jenis]) {
          machineTypeBreakdown[jenis] = { machines: 0, capacityKW: 0 };
        }
        machineTypeBreakdown[jenis].machines += 1;
        machineTypeBreakdown[jenis].capacityKW += dmn;
      });

      const rawAddress = (unit as any).alamatLengkap || unit.alamat || '';

      return {
        id: unit.id || unit.namaUnitLayananPusatListrik,
        name: (unit.namaUnitLayananPusatListrik || 'Unit Layanan').slice(0, 256),
        address: String(rawAddress).slice(0, 512),
        machinesCount: machines.length,
        capacityKW: Math.round(cap * 100) / 100,
        peakLoadKW: Math.round(peak * 100) / 100,
        systems: Array.from(systemsSet),
        machineTypes: Array.from(typesSet),
      };
    });

    await setDoc(doc(db, 'public_stats', PUBLIC_STATS_DOC_ID), {
      statId: PUBLIC_STATS_DOC_ID,
      totalEmployees,
      organicCount,
      taskForceCount,
      subcontractCount,
      totalUnits: units.length,
      totalMachines,
      totalCapacityKW: Math.round(totalCapacityKW * 100) / 100,
      totalPeakLoadKW: Math.round(totalPeakLoadKW * 100) / 100,
      systemBreakdown,
      machineTypeBreakdown,
      unitSummaries,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, `public_stats/${PUBLIC_STATS_DOC_ID}`);
    } catch (wrappedErr) {
      console.warn('Public stats sync skipped:', wrappedErr);
    }
  }
}
