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
  Timestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Unit } from '../types';

export const useUnits = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitStats, setUnitStats] = useState({
    totalUnits: 0,
    totalMachines: 0,
    totalCapacity: 0,
    systemBreakdown: {} as Record<string, number>,
    typeBreakdown: {} as Record<string, number>,
  });

  useEffect(() => {
    // Note: If namaUnitLayananPusatListrik is empty in old docs, this might be tricky,
    // but assuming new data structure is used.
    const q = query(collection(db, 'units'));
    
    const unsubscribeSnap = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Unit[];
      setUnits(docs);
      
      // Calculate Stats
      const stats = {
        totalUnits: docs.length,
        totalMachines: 0,
        totalCapacity: 0,
        systemBreakdown: {} as Record<string, number>,
        typeBreakdown: {} as Record<string, number>,
      };

      docs.forEach(unit => {
        if (unit.mesin && Array.isArray(unit.mesin)) {
          stats.totalMachines += unit.mesin.length;
          unit.mesin.forEach(m => {
            stats.totalCapacity += (Number(m.dayaMampuNominal) || 0);
            
            // System breakdown
            const s = m.sistem || 'Tidak Diketahui';
            stats.systemBreakdown[s] = (stats.systemBreakdown[s] || 0) + 1;

            // Type breakdown
            const t = m.jenisMesin || 'Tidak Diketahui';
            stats.typeBreakdown[t] = (stats.typeBreakdown[t] || 0) + 1;
          });
        }
      });

      setUnitStats(stats);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error in useUnits:", error);
      setLoading(false);
    });

    return () => unsubscribeSnap();
  }, []);

  const createUnit = async (unitData: Omit<Unit, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'units'), {
        ...unitData,
        createdAt: Timestamp.now(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'units');
    }
  };

  const updateUnit = async (id: string, unitData: Partial<Unit>) => {
    try {
      const docRef = doc(db, 'units', id);
      await updateDoc(docRef, unitData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `units/${id}`);
    }
  };

  const deleteUnit = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'units', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `units/${id}`);
    }
  };

  return { units, loading, unitStats, createUnit, updateUnit, deleteUnit };
};
