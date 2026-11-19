import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { BroadcastAnnouncement, BroadcastPriority } from '../types';
import { useAuth } from '../context/AuthContext';
import { logActivity } from '../lib/activityLogger';

const STORAGE_KEY_PREFIX = 'simap_dismissed_broadcasts_';

const getTimestampMs = (val: any): number => {
  if (!val) return 0;
  if (typeof val?.toMillis === 'function') return val.toMillis();
  if (typeof val?.seconds === 'number') return val.seconds * 1000;
  const parsed = Date.parse(String(val));
  return Number.isNaN(parsed) ? 0 : parsed;
};

const readLocalDismissed = (uid?: string): Set<string> => {
  if (!uid || typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${uid}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
};

const writeLocalDismissed = (uid: string, ids: Set<string>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${uid}`, JSON.stringify(Array.from(ids)));
  } catch {
    // Ignore localStorage quota/access errors
  }
};

interface UseBroadcastsOptions {
  enabled?: boolean;
  includeInactive?: boolean;
}

export interface CreateBroadcastInput {
  title: string;
  message: string;
  priority: BroadcastPriority;
}

export function useBroadcasts({
  enabled = true,
  includeInactive = false,
}: UseBroadcastsOptions = {}) {
  const { user, profile } = useAuth();
  const [broadcasts, setBroadcasts] = useState<BroadcastAnnouncement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() =>
    readLocalDismissed(user?.uid)
  );
  const [loading, setLoading] = useState<boolean>(enabled);
  const [dismissalsLoaded, setDismissalsLoaded] = useState<boolean>(false);

  useEffect(() => {
    setDismissedIds(readLocalDismissed(user?.uid));
  }, [user?.uid]);

  useEffect(() => {
    if (!enabled || !user) {
      setBroadcasts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const colRef = collection(db, 'broadcast_announcements');
    const q = includeInactive
      ? query(colRef, orderBy('createdAt', 'desc'))
      : query(colRef, where('isActive', '==', true));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map(
          (d) =>
            ({
              id: d.id,
              ...d.data(),
            } as BroadcastAnnouncement)
        );
        rows.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
        setBroadcasts(rows);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        try {
          handleFirestoreError(error, OperationType.LIST, 'broadcast_announcements');
        } catch (err) {
          console.error('Broadcast subscription error:', err);
        }
      }
    );

    return () => unsubscribe();
  }, [enabled, user?.uid, includeInactive]);

  useEffect(() => {
    if (!enabled || !user || includeInactive) {
      setDismissalsLoaded(true);
      return;
    }

    setDismissalsLoaded(false);
    const dismissalsRef = collection(db, 'users', user.uid, 'dismissed_broadcasts');
    const unsubscribe = onSnapshot(
      dismissalsRef,
      (snapshot) => {
        const remoteIds = new Set<string>(readLocalDismissed(user.uid));
        snapshot.docs.forEach((d) => remoteIds.add(d.id));
        writeLocalDismissed(user.uid, remoteIds);
        setDismissedIds(remoteIds);
        setDismissalsLoaded(true);
      },
      (error) => {
        setDismissalsLoaded(true);
        console.warn('Could not sync dismissed broadcasts:', error);
      }
    );

    return () => unsubscribe();
  }, [enabled, user?.uid, includeInactive]);

  const unreadActiveBroadcasts = useMemo(() => {
    if (!dismissalsLoaded) return [];
    return broadcasts.filter((b) => b.isActive && b.id && !dismissedIds.has(b.id));
  }, [broadcasts, dismissedIds, dismissalsLoaded]);

  const createBroadcast = useCallback(
    async (input: CreateBroadcastInput) => {
      if (!user) throw new Error('Pengguna belum terautentikasi.');

      const title = input.title.trim().slice(0, 140);
      const message = input.message.trim().slice(0, 1000);
      if (!title || !message) {
        throw new Error('Judul dan pesan pengumuman wajib diisi.');
      }

      const senderName = (
        profile?.displayName ||
        user.displayName ||
        user.email?.split('@')[0] ||
        'Administrator'
      )
        .trim()
        .slice(0, 256);

      const payload = {
        title,
        message,
        priority: input.priority,
        isActive: true,
        senderUid: user.uid,
        senderName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        const docRef = await addDoc(collection(db, 'broadcast_announcements'), payload);
        await logActivity({
          action: 'CREATE',
          entityType: 'system',
          entityId: docRef.id,
          entityName: title,
          description: `Mengirim pengumuman broadcast (${input.priority}) ke seluruh pengguna terdaftar`,
        });
        return docRef.id;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'broadcast_announcements');
        throw error;
      }
    },
    [user, profile?.displayName]
  );

  const toggleBroadcastActive = useCallback(
    async (announcement: BroadcastAnnouncement) => {
      if (!announcement.id) return;
      const nextState = !announcement.isActive;
      try {
        await updateDoc(doc(db, 'broadcast_announcements', announcement.id), {
          isActive: nextState,
          updatedAt: serverTimestamp(),
        });
        await logActivity({
          action: 'UPDATE',
          entityType: 'system',
          entityId: announcement.id,
          entityName: announcement.title,
          description: `${nextState ? 'Mengaktifkan' : 'Menonaktifkan'} pengumuman broadcast "${announcement.title}"`,
        });
      } catch (error) {
        handleFirestoreError(
          error,
          OperationType.UPDATE,
          `broadcast_announcements/${announcement.id}`
        );
        throw error;
      }
    },
    []
  );

  const deleteBroadcast = useCallback(async (announcement: BroadcastAnnouncement) => {
    if (!announcement.id) return;
    try {
      await deleteDoc(doc(db, 'broadcast_announcements', announcement.id));
      await logActivity({
        action: 'DELETE',
        entityType: 'system',
        entityId: announcement.id,
        entityName: announcement.title,
        description: `Menghapus pengumuman broadcast "${announcement.title}"`,
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `broadcast_announcements/${announcement.id}`
      );
      throw error;
    }
  }, []);

  const dismissBroadcast = useCallback(
    async (announcementId: string) => {
      if (!user || !announcementId) return;

      setDismissedIds((prev) => {
        const next = new Set<string>(prev);
        next.add(announcementId);
        writeLocalDismissed(user.uid, next);
        return next;
      });

      try {
        await setDoc(
          doc(db, 'users', user.uid, 'dismissed_broadcasts', announcementId),
          {
            userId: user.uid,
            announcementId,
            dismissedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.warn('Failed to persist broadcast dismissal:', error);
      }
    },
    [user]
  );

  const dismissAllBroadcasts = useCallback(
    async (ids: string[]) => {
      await Promise.all(ids.map((id) => dismissBroadcast(id)));
    },
    [dismissBroadcast]
  );

  return {
    broadcasts,
    unreadActiveBroadcasts,
    loading,
    createBroadcast,
    toggleBroadcastActive,
    deleteBroadcast,
    dismissBroadcast,
    dismissAllBroadcasts,
  };
}
