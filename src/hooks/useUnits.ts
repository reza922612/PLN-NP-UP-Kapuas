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
  getDoc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { logActivity } from '../lib/activityLogger';
import { syncPublicStats } from '../lib/publicStats';
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
      const docRef = await addDoc(collection(db, 'units'), {
        ...unitData,
        createdAt: serverTimestamp(),
      });
      const machineCount = Array.isArray(unitData.mesin) ? unitData.mesin.length : 0;
      await syncPublicStats();
      await logActivity({
        action: 'CREATE',
        entityType: 'unit',
        entityId: docRef.id,
        entityName: unitData.namaUnitLayananPusatListrik,
        description: `Menambahkan unit pembangkit ${unitData.namaUnitLayananPusatListrik} (${machineCount} mesin)`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'units');
    }
  };

  const updateUnit = async (id: string, unitData: Partial<Unit>) => {
    try {
      const docRef = doc(db, 'units', id);
      let unitName = unitData.namaUnitLayananPusatListrik;
      if (!unitName) {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          unitName = (snap.data() as Unit).namaUnitLayananPusatListrik;
        }
      }
      await updateDoc(docRef, unitData);
      await syncPublicStats();
      const label = unitName || id;
      const machineCount = Array.isArray(unitData.mesin) ? unitData.mesin.length : undefined;
      await logActivity({
        action: 'UPDATE',
        entityType: 'unit',
        entityId: id,
        entityName: label,
        description: machineCount !== undefined
          ? `Memperbarui data unit ${label} (${machineCount} mesin)`
          : `Memperbarui data unit ${label}`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `units/${id}`);
    }
  };

  const deleteUnit = async (id: string) => {
    try {
      const docRef = doc(db, 'units', id);
      let label = id;
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        label = (snap.data() as Unit).namaUnitLayananPusatListrik || id;
      }
      await deleteDoc(docRef);
      await syncPublicStats();
      await logActivity({
        action: 'DELETE',
        entityType: 'unit',
        entityId: id,
        entityName: label,
        description: `Menghapus unit pembangkit ${label} dari sistem`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `units/${id}`);
    }
  };

  return { units, loading, unitStats, createUnit, updateUnit, deleteUnit };
};
