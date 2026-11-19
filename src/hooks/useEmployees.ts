import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  Timestamp,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { logActivity } from '../lib/activityLogger';
import { deletePublicVerification, syncPublicVerification } from '../lib/publicVerification';
import { syncPublicStats } from '../lib/publicStats';
import { Employee, Training, Certification } from '../types';

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
    
    const unsubscribeSnap = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];
      setEmployees(docs);
      
      // Calculate stats
      const total = docs.length;
      const organic = docs.filter(e => e.status === 'Pegawai Organik').length;
      const taskForce = docs.filter(e => e.status === 'Pegawai Tugas Khusus').length;
      const subcontract = docs.filter(e => e.status === 'Tenaga Alih Daya').length;
      
      setStats({
        total,
        organic,
        taskForce,
        subcontract,
        retirement: 0, 
        activeCerts: 0,
      });
      
      setLoading(false);
    }, (error) => {
      // Graceful error handling for permissions
      if (error.message.includes('permissions')) {
        console.warn("Waiting for correct permissions/profile...");
      } else {
        console.error("Firestore Error in useEmployees:", error);
      }
      setLoading(false);
    });

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

  return { 
    employees, 
    loading, 
    stats, 
    createEmployee, 
    updateEmployee, 
    deleteEmployee 
  };
};
