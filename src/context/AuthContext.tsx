import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ThemeMode, UserProfile } from '../types';

export type EditableProfileFields = Partial<Pick<UserProfile, 'displayName' | 'themePreference'>>;

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  updateUserProfile: (updates: EditableProfileFields) => Promise<void>;
  biometricEnrollmentActive: boolean;
  setBiometricEnrollmentActive: (active: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  updateUserProfile: async () => {},
  biometricEnrollmentActive: false,
  setBiometricEnrollmentActive: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricEnrollmentActive, setBiometricEnrollmentActive] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email) {
        const docRef = doc(db, 'users', currentUser.uid);
        let docSnap;
        try {
          docSnap = await getDoc(docRef);
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }

        // Search for employee record by email
        let employeeId: string | undefined;
        try {
          const empQuery = query(
            collection(db, 'employees'),
            where('emailKorporat', '==', currentUser.email)
          );
          const empSnap = await getDocs(empQuery);
          if (!empSnap.empty) {
            employeeId = empSnap.docs[0].id;
          }
        } catch (err) {
          console.error('Error searching for employee:', err);
        }

        if (docSnap && docSnap.exists()) {
          const profileData = docSnap.data() as UserProfile;
          const updatedData: Partial<UserProfile> = {};

          // Auto-upgrade if it's the admin email but role is viewer
          if (currentUser.email === 'rzardiansyah92@gmail.com' && profileData.role === 'viewer') {
            updatedData.role = 'super_admin';
          }

          // Link employeeId if found and not already linked
          if (employeeId && (profileData.employeeId !== employeeId || profileData.role === 'viewer')) {
            updatedData.employeeId = employeeId;
            if (profileData.role === 'viewer') {
              updatedData.role = 'employee';
            }
          }

          if (Object.keys(updatedData).length > 0) {
            const updatedProfile = { ...profileData, ...updatedData };
            try {
              await setDoc(docRef, updatedProfile, { merge: true });
            } catch (err) {
              console.error('Failed to merge profile updates:', err);
            }
            setProfile(updatedProfile as UserProfile);
          } else {
            setProfile(profileData);
          }
        } else {
          // If profile doesn't exist, create a default profile
          const isAdminEmail = currentUser.email === 'rzardiansyah92@gmail.com';
          const savedLocalTheme =
            typeof window !== 'undefined'
              ? (localStorage.getItem('simap_theme_preference') as ThemeMode | null)
              : null;

          const initialProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
            role: isAdminEmail ? 'super_admin' : employeeId ? 'employee' : 'viewer',
            unitId: 'UP Kapuas',
            ...(employeeId ? { employeeId } : {}),
            ...(savedLocalTheme === 'light' || savedLocalTheme === 'dark'
              ? { themePreference: savedLocalTheme }
              : {}),
            createdAt: new Date(),
          };
          try {
            await setDoc(docRef, initialProfile);
            setProfile(initialProfile);
          } catch (error) {
            console.error('Failed to create user profile:', error);
            setProfile(initialProfile);
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateUserProfile = useCallback(
    async (updates: EditableProfileFields) => {
      if (!user) return;
      const cleanUpdates: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };
      if (updates.displayName !== undefined) {
        cleanUpdates.displayName = updates.displayName.trim();
      }
      if (updates.themePreference !== undefined) {
        cleanUpdates.themePreference = updates.themePreference;
      }

      setProfile((prev) => (prev ? { ...prev, ...updates } : prev));

      try {
        await updateDoc(doc(db, 'users', user.uid), cleanUpdates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        updateUserProfile,
        biometricEnrollmentActive,
        setBiometricEnrollmentActive,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
