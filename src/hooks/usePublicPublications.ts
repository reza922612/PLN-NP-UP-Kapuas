import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { logActivity } from '../lib/activityLogger';
import { PublicPublication, PublicPublicationCategory } from '../types';

const clampStr = (val: string | null | undefined, max: number): string =>
  (val || '').trim().slice(0, max);

const clampNullable = (val: string | null | undefined, max: number): string | null => {
  const trimmed = (val || '').trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

const sortPublicationsNewest = (items: PublicPublication[]): PublicPublication[] =>
  [...items].sort((a, b) => {
    const dateDiff = (b.tanggalKegiatan || '').localeCompare(a.tanggalKegiatan || '');
    if (dateDiff !== 0) return dateDiff;
    const aSec = a.createdAt?.seconds || 0;
    const bSec = b.createdAt?.seconds || 0;
    return bSec - aSec;
  });

export interface PublicPublicationInput {
  kategori: PublicPublicationCategory;
  judul: string;
  tanggalKegiatan: string;
  lokasi: string;
  ringkasan: string;
  konten: string;
  penanggungJawab?: string | null;
  imageUrl?: string | null;
  imageFileName?: string | null;
  attachmentUrl?: string | null;
  attachmentFileName?: string | null;
  isPublished: boolean;
}

export const usePublicPublishedPublications = () => {
  const [publications, setPublications] = useState<PublicPublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'public_publications'),
      where('isPublished', '==', true)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as PublicPublication[];
        setPublications(sortPublicationsNewest(list));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn('Gagal memuat publikasi publik:', err.message);
        setError('Gagal memuat Berita, Pengumuman, dan Agenda Kegiatan TJSL.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { publications, loading, error };
};

export const usePublicPublications = (enabled = true) => {
  const [publications, setPublications] = useState<PublicPublication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'public_publications'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as PublicPublication[];
        setPublications(sortPublicationsNewest(list));
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'public_publications');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [enabled]);

  const savePublication = async (input: PublicPublicationInput, editingId?: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Pengguna belum login.');
    const displayName =
      auth.currentUser?.displayName ||
      auth.currentUser?.email?.split('@')[0] ||
      'Administrator';

    const commonFields = {
      kategori: input.kategori,
      judul: clampStr(input.judul, 300),
      tanggalKegiatan: clampStr(input.tanggalKegiatan, 32),
      lokasi: clampStr(input.lokasi, 256),
      ringkasan: clampStr(input.ringkasan, 600),
      konten: clampStr(input.konten, 5000),
      penanggungJawab: clampNullable(input.penanggungJawab, 256),
      imageUrl: clampNullable(input.imageUrl, 1024),
      imageFileName: clampNullable(input.imageFileName, 256),
      attachmentUrl: clampNullable(input.attachmentUrl, 1024),
      attachmentFileName: clampNullable(input.attachmentFileName, 256),
      isPublished: Boolean(input.isPublished),
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'public_publications', editingId), commonFields);
        await logActivity({
          action: 'UPDATE',
          entityType: 'publikasi',
          entityId: editingId,
          entityName: commonFields.judul,
          description: `Memperbarui ${commonFields.kategori}: ${commonFields.judul}`,
        });
      } else {
        const ref = await addDoc(collection(db, 'public_publications'), {
          ...commonFields,
          createdByUid: uid,
          createdByName: clampNullable(displayName, 256),
          createdAt: serverTimestamp(),
        });
        await logActivity({
          action: 'CREATE',
          entityType: 'publikasi',
          entityId: ref.id,
          entityName: commonFields.judul,
          description: `Menambahkan ${commonFields.kategori}: ${commonFields.judul}`,
        });
      }
    } catch (err) {
      handleFirestoreError(
        err,
        editingId ? OperationType.UPDATE : OperationType.CREATE,
        editingId ? `public_publications/${editingId}` : 'public_publications'
      );
      throw err;
    }
  };

  const deletePublication = async (item: PublicPublication) => {
    if (!item.id) return;
    try {
      await deleteDoc(doc(db, 'public_publications', item.id));
      await logActivity({
        action: 'DELETE',
        entityType: 'publikasi',
        entityId: item.id,
        entityName: item.judul,
        description: `Menghapus ${item.kategori}: ${item.judul}`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `public_publications/${item.id}`);
      throw err;
    }
  };

  return {
    publications,
    loading,
    savePublication,
    deletePublication,
  };
};
