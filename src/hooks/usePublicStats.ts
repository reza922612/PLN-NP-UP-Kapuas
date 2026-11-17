import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PUBLIC_STATS_DOC_ID } from '../lib/publicStats';
import { PublicStats } from '../types';

export function usePublicStats() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDoc(doc(db, 'public_stats', PUBLIC_STATS_DOC_ID));
      if (snap.exists()) {
        setStats(snap.data() as PublicStats);
      } else {
        setStats(null);
      }
    } catch (err) {
      console.warn('Unable to load public stats snapshot:', err);
      setError('Gagal memuat ringkasan statistik publik.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
}
