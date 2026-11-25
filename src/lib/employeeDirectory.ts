import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Employee } from '../types';

export const EMPLOYEE_DIRECTORY_DOC_ID = 'up_kapuas';

export interface EmployeeDirectoryItem {
  id: string;
  fullName: string;
  nip: string;
  jabatanLengkap: string;
  unitPelaksana: string;
  atasanId?: string | null;
  atasanNama?: string;
}

export async function syncEmployeeDirectory(employees: Employee[]): Promise<void> {
  if (!Array.isArray(employees)) return;

  try {
    const items: EmployeeDirectoryItem[] = employees
      .filter((e) => e.id && e.fullName && e.nip)
      .slice(0, 5000)
      .map((e) => ({
        id: String(e.id),
        fullName: String(e.fullName).slice(0, 150),
        nip: String(e.nip).slice(0, 40),
        jabatanLengkap: String(e.jabatanLengkap || '-').slice(0, 150),
        unitPelaksana: String(e.unitPelaksana || 'UP Kapuas').slice(0, 100),
        atasanId: e.atasanId ? String(e.atasanId) : null,
        atasanNama: e.atasanNama ? String(e.atasanNama).slice(0, 150) : '',
      }));

    // Ensure document stays well below Firestore's 1 MiB limit
    const estimatedBytes = JSON.stringify(items).length;
    if (estimatedBytes > 850_000) {
      console.warn('Employee directory payload too large to store in single doc:', estimatedBytes);
      return;
    }

    await setDoc(doc(db, 'employee_directory', EMPLOYEE_DIRECTORY_DOC_ID), {
      dirId: EMPLOYEE_DIRECTORY_DOC_ID,
      items,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Employee directory sync skipped:', err);
  }
}

export async function fetchEmployeeDirectory(): Promise<Employee[]> {
  try {
    const snap = await getDoc(doc(db, 'employee_directory', EMPLOYEE_DIRECTORY_DOC_ID));
    if (!snap.exists()) return [];
    const data = snap.data();
    const items = Array.isArray(data?.items) ? (data.items as EmployeeDirectoryItem[]) : [];
    return items.map((item) => ({
      id: item.id,
      fullName: item.fullName,
      nip: item.nip,
      jabatanLengkap: item.jabatanLengkap,
      unitPelaksana: item.unitPelaksana,
      atasanId: item.atasanId || null,
      atasanNama: item.atasanNama || '',
      subUnit: '',
      personGrade: '',
      positionGrade: '',
      tanggalMasuk: '',
      tanggalCalonPegawai: '',
      emailKorporat: '',
      alamatLengkap: '',
      tanggalLahir: '',
      tanggalMulaiJabatan: '',
      tanggalPengangkatan: '',
      tanggalPensiunNormal: '',
      jenisKelamin: 'Laki-laki',
      agama: '',
      noTelepon: '',
      noNPWP: '',
      noKTP: '',
      noBPJSKesehatan: '',
      noBPJSKetenagakerjaan: '',
      pendidikanTerakhir: '',
      status: 'Pegawai Organik',
      perusahaan: 'PT PLN Nusantara Power',
      createdAt: null,
      updatedAt: null,
    }));
  } catch {
    return [];
  }
}
