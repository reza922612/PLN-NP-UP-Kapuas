import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { ActivityAction, ActivityEntityType } from '../types';

interface LogActivityInput {
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  entityName: string;
  description: string;
}

const clamp = (value: string, max: number, fallback: string): string => {
  const trimmed = (value || '').trim();
  if (!trimmed) return fallback;
  return trimmed.length > max ? `${trimmed.slice(0, max - 3)}...` : trimmed;
};

export async function logActivity(input: LogActivityInput): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  try {
    let actorName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Administrator';
    let actorRole: string | undefined;

    try {
      const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData?.displayName) actorName = String(userData.displayName);
        if (userData?.role) actorRole = String(userData.role);
      }
    } catch {
      // Fall back to auth user info if profile lookup fails
    }

    // Only admins/super_admins are allowed to create administrative audit logs
    if (actorRole && actorRole !== 'super_admin' && actorRole !== 'admin') {
      return;
    }

    const payload: Record<string, any> = {
      action: input.action,
      entityType: input.entityType,
      entityId: clamp(input.entityId, 128, 'unknown'),
      entityName: clamp(input.entityName, 256, 'Item'),
      description: clamp(input.description, 512, 'Aktivitas sistem tercatat'),
      actorUid: currentUser.uid,
      actorEmail: clamp(currentUser.email || 'unknown@plnnusantarapower.co.id', 256, 'unknown@plnnusantarapower.co.id'),
      actorName: clamp(actorName, 256, 'Administrator'),
      createdAt: serverTimestamp(),
    };

    if (actorRole) {
      payload.actorRole = clamp(actorRole, 64, 'admin');
    }

    await addDoc(collection(db, 'activity_logs'), payload);
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.CREATE, 'activity_logs');
    } catch (loggedErr) {
      // Keep primary mutation resilient if audit log fails (e.g. non-admin role)
      console.warn('Audit log skipped:', loggedErr);
    }
  }
}
