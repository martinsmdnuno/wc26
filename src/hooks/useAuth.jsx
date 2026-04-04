import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (snap.exists()) {
          setProfile(snap.data());
        }
      } else {
        await signInAnonymously(auth);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const saveProfile = useCallback(async (nickname, groupCode) => {
    if (!user) return;
    const data = {
      nickname,
      groupCode,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', user.uid), data);

    const groupRef = doc(db, 'groups', groupCode);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) {
      await setDoc(groupRef, {
        name: groupCode,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
    }

    await setDoc(doc(db, 'groups', groupCode, 'leaderboard', user.uid), {
      nickname,
      totalPoints: 0,
      exactResultsCount: 0,
      correctOutcomeCount: 0,
    });

    setProfile(data);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, saveProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
