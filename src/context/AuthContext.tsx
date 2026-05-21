import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user && user.email) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        // Search for employee record by email
        let employeeId: string | undefined;
        try {
          const empQuery = query(collection(db, 'employees'), where('emailKorporat', '==', user.email));
          const empSnap = await getDocs(empQuery);
          if (!empSnap.empty) {
            employeeId = empSnap.docs[0].id;
          }
        } catch (err) {
          console.error("Error searching for employee:", err);
        }

        if (docSnap.exists()) {
          const profileData = docSnap.data() as UserProfile;
          let updatedData: Partial<UserProfile> = {};
          
          // Auto-upgrade if it's the admin email but role is viewer
          if (user.email === 'rzardiansyah92@gmail.com' && profileData.role === 'viewer') {
            updatedData.role = 'super_admin';
          } 
          
          // Link employeeId if found and not already linked
          if (employeeId && (profileData.employeeId !== employeeId || profileData.role === 'viewer')) {
            updatedData.employeeId = employeeId;
            // If they are an employee but currently viewer, upgrade to employee role
            if (profileData.role === 'viewer') {
              updatedData.role = 'employee';
            }
          }

          if (Object.keys(updatedData).length > 0) {
            const updatedProfile = { ...profileData, ...updatedData };
            await setDoc(docRef, updatedProfile, { merge: true });
            setProfile(updatedProfile as UserProfile);
          } else {
            setProfile(profileData);
          }
        } else {
          // If profile doesn't exist, create a default profile
          const isAdminEmail = user.email === 'rzardiansyah92@gmail.com';
          
          const initialProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            role: isAdminEmail ? 'super_admin' : (employeeId ? 'employee' : 'viewer'),
            unitId: 'UP Kapuas', // Default unit
            employeeId: employeeId,
            createdAt: new Date(),
          };
          try {
            await setDoc(docRef, initialProfile);
            setProfile(initialProfile);
          } catch (error) {
            console.error("Failed to create user profile:", error);
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
