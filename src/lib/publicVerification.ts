import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Employee } from '../types';

const clamp = (val: string | undefined | null, max: number, fallback = ''): string => {
  const trimmed = (val || '').trim();
  if (!trimmed) return fallback;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
};

export async function syncPublicVerification(employeeId: string, employee: Partial<Employee>): Promise<void> {
  if (!employeeId || !employee.fullName || !employee.nip) return;

  const payload = {
    employeeId: clamp(employeeId, 128),
    fullName: clamp(employee.fullName, 256, 'Pegawai'),
    nip: clamp(employee.nip, 64, '-'),
    jabatanLengkap: clamp(employee.jabatanLengkap, 256, '-'),
    unitPelaksana: clamp(employee.unitPelaksana, 256, 'UP Kapuas'),
    subUnit: clamp(employee.subUnit, 256, '-'),
    status: employee.status || 'Pegawai Organik',
    perusahaan: clamp(employee.perusahaan, 256, 'PT PLN Nusantara Power'),
    photoUrl: employee.photoUrl ? clamp(employee.photoUrl, 1024) : null,
    verifiedStatus: (employee.placementStatus === 'Mutasi Keluar' ? 'INACTIVE' : 'ACTIVE') as
      | 'ACTIVE'
      | 'INACTIVE',
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'public_verifications', employeeId), payload);
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, `public_verifications/${employeeId}`);
    } catch (wrappedErr) {
      console.warn('Public verification sync skipped:', wrappedErr);
    }
  }
}

export async function deletePublicVerification(employeeId: string): Promise<void> {
  if (!employeeId) return;
  try {
    await deleteDoc(doc(db, 'public_verifications', employeeId));
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.DELETE, `public_verifications/${employeeId}`);
    } catch (wrappedErr) {
      console.warn('Public verification cleanup skipped:', wrappedErr);
    }
  }
}
