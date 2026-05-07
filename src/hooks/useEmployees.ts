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
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
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
      await addDoc(collection(db, 'employees'), {
        ...employeeData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'employees');
    }
  };

  const updateEmployee = async (id: string, employeeData: Partial<Employee>) => {
    try {
      const docRef = doc(db, 'employees', id);
      await updateDoc(docRef, {
        ...employeeData,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `employees/${id}`);
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'employees', id));
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
