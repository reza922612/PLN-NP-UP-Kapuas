import { useState, useEffect } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ActivityLog } from '../types';

export const useActivityLogs = (shouldFetch: boolean = true, maxItems: number = 100) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldFetch) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'activity_logs'),
      orderBy('createdAt', 'desc'),
      limit(maxItems)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ActivityLog[];
        setLogs(docs);
        setError(null);
        setLoading(false);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'activity_logs');
        } catch (wrappedErr: any) {
          setError(wrappedErr?.message || 'Gagal memuat activity log.');
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [shouldFetch, maxItems]);

  return { logs, loading, error };
};
