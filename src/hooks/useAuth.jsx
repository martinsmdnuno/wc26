import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

async function migrateGroupToPool(uid, groupCode, nickname) {
  const q = query(collection(db, 'pools'), where('inviteCode', '==', groupCode));
  const snap = await getDocs(q);

  let poolId;
  if (!snap.empty) {
    poolId = snap.docs[0].id;
    const poolData = snap.docs[0].data();
    if (!poolData.members?.includes(uid)) {
      await updateDoc(doc(db, 'pools', poolId), {
        members: arrayUnion(uid),
      });
    }
  } else {
    const poolRef = doc(collection(db, 'pools'));
    poolId = poolRef.id;

    const groupSnap = await getDoc(doc(db, 'groups', groupCode));
    const groupData = groupSnap.exists() ? groupSnap.data() : {};

    await setDoc(poolRef, {
      name: groupCode,
      createdBy: groupData.createdBy || uid,
      createdAt: groupData.createdAt || serverTimestamp(),
      inviteCode: groupCode,
      members: [uid],
    });

    // Copy bets, leaderboard, matches from old group
    const subs = ['bets', 'leaderboard', 'matches'];
    for (const sub of subs) {
      const subSnap = await getDocs(collection(db, 'groups', groupCode, sub));
      for (const d of subSnap.docs) {
        await setDoc(doc(db, 'pools', poolId, sub, d.id), d.data());
      }
    }
  }

  const lbRef = doc(db, 'pools', poolId, 'leaderboard', uid);
  const lbSnap = await getDoc(lbRef);
  if (!lbSnap.exists()) {
    await setDoc(lbRef, {
      nickname: nickname || '',
      totalPoints: 0,
      exactResultsCount: 0,
      correctOutcomeCount: 0,
    });
  }

  await updateDoc(doc(db, 'users', uid), {
    pools: arrayUnion(poolId),
  });

  return poolId;
}

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
          const data = snap.data();

          if (data.groupCode && (!data.pools || data.pools.length === 0)) {
            await migrateGroupToPool(firebaseUser.uid, data.groupCode, data.nickname);
            const updated = await getDoc(doc(db, 'users', firebaseUser.uid));
            setProfile(updated.data());
          } else {
            setProfile(data);
          }
        }
      } else {
        await signInAnonymously(auth);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const saveProfile = useCallback(async (nickname) => {
    if (!user) return;
    const data = {
      nickname,
      pools: [],
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', user.uid), data, { merge: true });
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
