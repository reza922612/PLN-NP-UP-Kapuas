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
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { logActivity } from '../lib/activityLogger';
import {
  BoardRegulationDocument,
  CommunityOfPractice,
  InnovationCategory,
  InnovationRecord,
  KnowledgeSharingForum,
  KsfExecutionMethod,
  RegulationDocument,
  SopDocument,
} from '../types';

const clampStr = (val: string | null | undefined, max: number): string =>
  (val || '').trim().slice(0, max);

const clampNullable = (val: string | null | undefined, max: number): string | null => {
  const trimmed = (val || '').trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

export interface KsfInput {
  pemateriEmployeeId?: string | null;
  namaPemateri: string;
  pemateriNip?: string | null;
  pemateriUnit?: string | null;
  judulMateri: string;
  tanggalPelaksanaan: string;
  lokasiPelaksanaan: string;
  metodePelaksanaan: KsfExecutionMethod;
  evidenceUrl?: string | null;
  evidenceFileName?: string | null;
}

export interface CopInput {
  judulTopik: string;
  leaderEmployeeId?: string | null;
  namaLeader: string;
  bidang: string;
  tanggalPelaksanaan: string;
  lokasi?: string | null;
  ringkasan?: string | null;
  evidenceUrl?: string | null;
  evidenceFileName?: string | null;
}

export interface InnovationInput {
  inovator1: string;
  inovator2: string;
  inovator3: string;
  inovatorEmployeeIds?: string[];
  judulInovasi: string;
  kategoriInovasi: InnovationCategory;
  tanggalPelaksanaan?: string | null;
  ringkasan?: string | null;
  evidenceUrl?: string | null;
  evidenceFileName?: string | null;
}

export interface SopInput {
  nomorDokumen: string;
  judul: string;
  bidang: string;
  tanggalBerlaku: string;
  ringkasan?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
}

export interface RegulationInput {
  nomorDokumen: string;
  judul: string;
  penerbit: string;
  tanggalBerlaku: string;
  ringkasan?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
}

export interface BoardRegulationInput {
  nomorDokumen: string;
  judul: string;
  tanggalBerlaku: string;
  ringkasan?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
}

export const usePublicKnowledgeShowcase = () => {
  const [ksfList, setKsfList] = useState<KnowledgeSharingForum[]>([]);
  const [innovationList, setInnovationList] = useState<InnovationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ksfLoaded = false;
    let inoLoaded = false;

    const finishLoading = () => {
      if (ksfLoaded && inoLoaded) setLoading(false);
    };

    const unsubKsf = onSnapshot(
      query(collection(db, 'knowledge_sharing_forums'), orderBy('tanggalPelaksanaan', 'desc')),
      (snap) => {
        setKsfList(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as KnowledgeSharingForum[]);
        ksfLoaded = true;
        finishLoading();
      },
      (err) => {
        console.warn('Public KSF snapshot warning:', err.message);
        setError('Sebagian data forum belum dapat dimuat.');
        ksfLoaded = true;
        finishLoading();
      }
    );

    const unsubIno = onSnapshot(
      query(collection(db, 'innovations'), orderBy('createdAt', 'desc')),
      (snap) => {
        setInnovationList(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as InnovationRecord[]);
        inoLoaded = true;
        finishLoading();
      },
      (err) => {
        console.warn('Public Innovation snapshot warning:', err.message);
        setError('Sebagian data inovasi belum dapat dimuat.');
        inoLoaded = true;
        finishLoading();
      }
    );

    return () => {
      unsubKsf();
      unsubIno();
    };
  }, []);

  return { ksfList, innovationList, loading, error };
};

export const useKnowledgeGovernance = (enabled: boolean) => {
  const [ksfList, setKsfList] = useState<KnowledgeSharingForum[]>([]);
  const [copList, setCopList] = useState<CommunityOfPractice[]>([]);
  const [innovationList, setInnovationList] = useState<InnovationRecord[]>([]);
  const [sopList, setSopList] = useState<SopDocument[]>([]);
  const [regulationList, setRegulationList] = useState<RegulationDocument[]>([]);
  const [boardRegulationList, setBoardRegulationList] = useState<BoardRegulationDocument[]>([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let loadedCount = 0;
    const markLoaded = () => {
      loadedCount += 1;
      if (loadedCount >= 6) setLoading(false);
    };

    const onErr = (label: string) => (err: Error) => {
      console.warn(`Snapshot warning (${label}):`, err.message);
      markLoaded();
    };

    const unsubs = [
      onSnapshot(
        query(collection(db, 'knowledge_sharing_forums'), orderBy('tanggalPelaksanaan', 'desc')),
        (snap) => {
          setKsfList(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as KnowledgeSharingForum[]);
          markLoaded();
        },
        onErr('knowledge_sharing_forums')
      ),
      onSnapshot(
        query(collection(db, 'community_of_practices'), orderBy('tanggalPelaksanaan', 'desc')),
        (snap) => {
          setCopList(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as CommunityOfPractice[]);
          markLoaded();
        },
        onErr('community_of_practices')
      ),
      onSnapshot(
        query(collection(db, 'innovations'), orderBy('createdAt', 'desc')),
        (snap) => {
          setInnovationList(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as InnovationRecord[]);
          markLoaded();
        },
        onErr('innovations')
      ),
      onSnapshot(
        query(collection(db, 'sop_documents'), orderBy('tanggalBerlaku', 'desc')),
        (snap) => {
          setSopList(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SopDocument[]);
          markLoaded();
        },
        onErr('sop_documents')
      ),
      onSnapshot(
        query(collection(db, 'regulations'), orderBy('tanggalBerlaku', 'desc')),
        (snap) => {
          setRegulationList(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as RegulationDocument[]);
          markLoaded();
        },
        onErr('regulations')
      ),
      onSnapshot(
        query(collection(db, 'board_regulations'), orderBy('tanggalBerlaku', 'desc')),
        (snap) => {
          setBoardRegulationList(
            snap.docs.map((d) => ({ id: d.id, ...d.data() })) as BoardRegulationDocument[]
          );
          markLoaded();
        },
        onErr('board_regulations')
      ),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [enabled]);

  const requireUid = () => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sesi pengguna tidak ditemukan. Silakan masuk ulang.');
    return uid;
  };

  const saveKsf = async (input: KsfInput, existingId?: string) => {
    const uid = requireUid();
    const baseData = {
      pemateriEmployeeId: clampNullable(input.pemateriEmployeeId, 128),
      namaPemateri: clampStr(input.namaPemateri, 256),
      pemateriNip: clampNullable(input.pemateriNip, 64),
      pemateriUnit: clampNullable(input.pemateriUnit, 256),
      judulMateri: clampStr(input.judulMateri, 300),
      tanggalPelaksanaan: clampStr(input.tanggalPelaksanaan, 32),
      lokasiPelaksanaan: clampStr(input.lokasiPelaksanaan, 256),
      metodePelaksanaan: input.metodePelaksanaan,
      evidenceUrl: clampNullable(input.evidenceUrl, 1024),
      evidenceFileName: clampNullable(input.evidenceFileName, 256),
    };

    if (existingId) {
      try {
        await updateDoc(doc(db, 'knowledge_sharing_forums', existingId), {
          ...baseData,
          updatedAt: serverTimestamp(),
        });
        await logActivity({
          action: 'UPDATE',
          entityType: 'knowledge',
          entityId: existingId,
          entityName: baseData.judulMateri,
          description: `Memperbarui Knowledge Sharing Forum "${baseData.judulMateri}" (Pemateri: ${baseData.namaPemateri})`,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `knowledge_sharing_forums/${existingId}`);
      }
      return;
    }

    try {
      const ref = await addDoc(collection(db, 'knowledge_sharing_forums'), {
        ...baseData,
        createdByUid: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await logActivity({
        action: 'CREATE',
        entityType: 'knowledge',
        entityId: ref.id,
        entityName: baseData.judulMateri,
        description: `Menambahkan Knowledge Sharing Forum "${baseData.judulMateri}" (Pemateri: ${baseData.namaPemateri})`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'knowledge_sharing_forums');
    }
  };

  const deleteKsf = async (id: string, title: string) => {
    try {
      await deleteDoc(doc(db, 'knowledge_sharing_forums', id));
      await logActivity({
        action: 'DELETE',
        entityType: 'knowledge',
        entityId: id,
        entityName: title,
        description: `Menghapus Knowledge Sharing Forum "${title}"`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `knowledge_sharing_forums/${id}`);
    }
  };

  const saveCop = async (input: CopInput, existingId?: string) => {
    const uid = requireUid();
    const baseData = {
      judulTopik: clampStr(input.judulTopik, 300),
      leaderEmployeeId: clampNullable(input.leaderEmployeeId, 128),
      namaLeader: clampStr(input.namaLeader, 256),
      bidang: clampStr(input.bidang, 128),
      tanggalPelaksanaan: clampStr(input.tanggalPelaksanaan, 32),
      lokasi: clampNullable(input.lokasi, 256),
      ringkasan: clampNullable(input.ringkasan, 1000),
      evidenceUrl: clampNullable(input.evidenceUrl, 1024),
      evidenceFileName: clampNullable(input.evidenceFileName, 256),
    };

    if (existingId) {
      try {
        await updateDoc(doc(db, 'community_of_practices', existingId), {
          ...baseData,
          updatedAt: serverTimestamp(),
        });
        await logActivity({
          action: 'UPDATE',
          entityType: 'knowledge',
          entityId: existingId,
          entityName: baseData.judulTopik,
          description: `Memperbarui Community Of Practice "${baseData.judulTopik}"`,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `community_of_practices/${existingId}`);
      }
      return;
    }

    try {
      const ref = await addDoc(collection(db, 'community_of_practices'), {
        ...baseData,
        createdByUid: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await logActivity({
        action: 'CREATE',
        entityType: 'knowledge',
        entityId: ref.id,
        entityName: baseData.judulTopik,
        description: `Menambahkan Community Of Practice "${baseData.judulTopik}"`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'community_of_practices');
    }
  };

  const deleteCop = async (id: string, title: string) => {
    try {
      await deleteDoc(doc(db, 'community_of_practices', id));
      await logActivity({
        action: 'DELETE',
        entityType: 'knowledge',
        entityId: id,
        entityName: title,
        description: `Menghapus Community Of Practice "${title}"`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `community_of_practices/${id}`);
    }
  };

  const saveInnovation = async (input: InnovationInput, existingId?: string) => {
    const uid = requireUid();
    const baseData = {
      inovator1: clampStr(input.inovator1, 256),
      inovator2: clampStr(input.inovator2, 256),
      inovator3: clampStr(input.inovator3, 256),
      inovatorEmployeeIds: (input.inovatorEmployeeIds || []).filter(Boolean).slice(0, 3),
      judulInovasi: clampStr(input.judulInovasi, 300),
      kategoriInovasi: input.kategoriInovasi,
      tanggalPelaksanaan: clampNullable(input.tanggalPelaksanaan, 32),
      ringkasan: clampNullable(input.ringkasan, 1000),
      evidenceUrl: clampNullable(input.evidenceUrl, 1024),
      evidenceFileName: clampNullable(input.evidenceFileName, 256),
    };

    if (existingId) {
      try {
        await updateDoc(doc(db, 'innovations', existingId), {
          ...baseData,
          updatedAt: serverTimestamp(),
        });
        await logActivity({
          action: 'UPDATE',
          entityType: 'knowledge',
          entityId: existingId,
          entityName: baseData.judulInovasi,
          description: `Memperbarui data Inovasi "${baseData.judulInovasi}" (${baseData.kategoriInovasi})`,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `innovations/${existingId}`);
      }
      return;
    }

    try {
      const ref = await addDoc(collection(db, 'innovations'), {
        ...baseData,
        createdByUid: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await logActivity({
        action: 'CREATE',
        entityType: 'knowledge',
        entityId: ref.id,
        entityName: baseData.judulInovasi,
        description: `Menambahkan data Inovasi "${baseData.judulInovasi}" (${baseData.kategoriInovasi})`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'innovations');
    }
  };

  const deleteInnovation = async (id: string, title: string) => {
    try {
      await deleteDoc(doc(db, 'innovations', id));
      await logActivity({
        action: 'DELETE',
        entityType: 'knowledge',
        entityId: id,
        entityName: title,
        description: `Menghapus data Inovasi "${title}"`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `innovations/${id}`);
    }
  };

  const saveSop = async (input: SopInput, existingId?: string) => {
    const uid = requireUid();
    const baseData = {
      nomorDokumen: clampStr(input.nomorDokumen, 100),
      judul: clampStr(input.judul, 300),
      bidang: clampStr(input.bidang, 128),
      tanggalBerlaku: clampStr(input.tanggalBerlaku, 32),
      ringkasan: clampNullable(input.ringkasan, 1000),
      fileUrl: clampNullable(input.fileUrl, 1024),
      fileName: clampNullable(input.fileName, 256),
    };

    if (existingId) {
      try {
        await updateDoc(doc(db, 'sop_documents', existingId), {
          ...baseData,
          updatedAt: serverTimestamp(),
        });
        await logActivity({
          action: 'UPDATE',
          entityType: 'knowledge',
          entityId: existingId,
          entityName: `${baseData.nomorDokumen} · ${baseData.judul}`,
          description: `Memperbarui Data SOP "${baseData.judul}"`,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `sop_documents/${existingId}`);
      }
      return;
    }

    try {
      const ref = await addDoc(collection(db, 'sop_documents'), {
        ...baseData,
        createdByUid: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await logActivity({
        action: 'CREATE',
        entityType: 'knowledge',
        entityId: ref.id,
        entityName: `${baseData.nomorDokumen} · ${baseData.judul}`,
        description: `Menambahkan Data SOP "${baseData.judul}"`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'sop_documents');
    }
  };

  const deleteSop = async (id: string, title: string) => {
    try {
      await deleteDoc(doc(db, 'sop_documents', id));
      await logActivity({
        action: 'DELETE',
        entityType: 'knowledge',
        entityId: id,
        entityName: title,
        description: `Menghapus Data SOP "${title}"`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `sop_documents/${id}`);
    }
  };

  const saveRegulation = async (input: RegulationInput, existingId?: string) => {
    const uid = requireUid();
    const baseData = {
      nomorDokumen: clampStr(input.nomorDokumen, 100),
      judul: clampStr(input.judul, 300),
      penerbit: clampStr(input.penerbit, 200),
      tanggalBerlaku: clampStr(input.tanggalBerlaku, 32),
      ringkasan: clampNullable(input.ringkasan, 1000),
      fileUrl: clampNullable(input.fileUrl, 1024),
      fileName: clampNullable(input.fileName, 256),
    };

    if (existingId) {
      try {
        await updateDoc(doc(db, 'regulations', existingId), {
          ...baseData,
          updatedAt: serverTimestamp(),
        });
        await logActivity({
          action: 'UPDATE',
          entityType: 'knowledge',
          entityId: existingId,
          entityName: `${baseData.nomorDokumen} · ${baseData.judul}`,
          description: `Memperbarui Data Regulasi "${baseData.judul}"`,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `regulations/${existingId}`);
      }
      return;
    }

    try {
      const ref = await addDoc(collection(db, 'regulations'), {
        ...baseData,
        createdByUid: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await logActivity({
        action: 'CREATE',
        entityType: 'knowledge',
        entityId: ref.id,
        entityName: `${baseData.nomorDokumen} · ${baseData.judul}`,
        description: `Menambahkan Data Regulasi "${baseData.judul}"`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'regulations');
    }
  };

  const deleteRegulation = async (id: string, title: string) => {
    try {
      await deleteDoc(doc(db, 'regulations', id));
      await logActivity({
        action: 'DELETE',
        entityType: 'knowledge',
        entityId: id,
        entityName: title,
        description: `Menghapus Data Regulasi "${title}"`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `regulations/${id}`);
    }
  };

  const saveBoardRegulation = async (input: BoardRegulationInput, existingId?: string) => {
    const uid = requireUid();
    const baseData = {
      nomorDokumen: clampStr(input.nomorDokumen, 100),
      judul: clampStr(input.judul, 300),
      tanggalBerlaku: clampStr(input.tanggalBerlaku, 32),
      ringkasan: clampNullable(input.ringkasan, 1000),
      fileUrl: clampNullable(input.fileUrl, 1024),
      fileName: clampNullable(input.fileName, 256),
    };

    if (existingId) {
      try {
        await updateDoc(doc(db, 'board_regulations', existingId), {
          ...baseData,
          updatedAt: serverTimestamp(),
        });
        await logActivity({
          action: 'UPDATE',
          entityType: 'knowledge',
          entityId: existingId,
          entityName: `${baseData.nomorDokumen} · ${baseData.judul}`,
          description: `Memperbarui Peraturan Direksi "${baseData.judul}"`,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `board_regulations/${existingId}`);
      }
      return;
    }

    try {
      const ref = await addDoc(collection(db, 'board_regulations'), {
        ...baseData,
        createdByUid: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await logActivity({
        action: 'CREATE',
        entityType: 'knowledge',
        entityId: ref.id,
        entityName: `${baseData.nomorDokumen} · ${baseData.judul}`,
        description: `Menambahkan Peraturan Direksi "${baseData.judul}"`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'board_regulations');
    }
  };

  const deleteBoardRegulation = async (id: string, title: string) => {
    try {
      await deleteDoc(doc(db, 'board_regulations', id));
      await logActivity({
        action: 'DELETE',
        entityType: 'knowledge',
        entityId: id,
        entityName: title,
        description: `Menghapus Peraturan Direksi "${title}"`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `board_regulations/${id}`);
    }
  };

  return {
    ksfList,
    copList,
    innovationList,
    sopList,
    regulationList,
    boardRegulationList,
    loading,
    saveKsf,
    deleteKsf,
    saveCop,
    deleteCop,
    saveInnovation,
    deleteInnovation,
    saveSop,
    deleteSop,
    saveRegulation,
    deleteRegulation,
    saveBoardRegulation,
    deleteBoardRegulation,
  };
};
