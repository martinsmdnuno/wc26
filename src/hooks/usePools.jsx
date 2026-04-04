import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';

const PoolContext = createContext(null);

const ACTIVE_POOL_KEY = 'wc26-active-pool';

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'WC26-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function PoolProvider({ children }) {
  const { user, profile } = useAuth();
  const [pools, setPools] = useState([]);
  const [activePoolId, setActivePoolId] = useState(() => {
    try {
      return localStorage.getItem(ACTIVE_POOL_KEY) || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Load user's pools
  useEffect(() => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const poolIds = profile.pools || [];
      if (poolIds.length === 0) {
        setPools([]);
        setActivePoolId(null);
        setLoading(false);
        return;
      }

      const loaded = [];
      for (const pid of poolIds) {
        const snap = await getDoc(doc(db, 'pools', pid));
        if (snap.exists()) {
          loaded.push({ id: snap.id, ...snap.data() });
        }
      }
      if (cancelled) return;

      setPools(loaded);

      // Validate active pool
      const storedActive = localStorage.getItem(ACTIVE_POOL_KEY);
      const validIds = loaded.map((p) => p.id);
      if (storedActive && validIds.includes(storedActive)) {
        setActivePoolId(storedActive);
      } else if (loaded.length > 0) {
        setActivePoolId(loaded[0].id);
        localStorage.setItem(ACTIVE_POOL_KEY, loaded[0].id);
      } else {
        setActivePoolId(null);
        localStorage.removeItem(ACTIVE_POOL_KEY);
      }

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, profile]);

  const selectPool = useCallback((poolId) => {
    setActivePoolId(poolId);
    if (poolId) {
      localStorage.setItem(ACTIVE_POOL_KEY, poolId);
    } else {
      localStorage.removeItem(ACTIVE_POOL_KEY);
    }
  }, []);

  const createPool = useCallback(async (name) => {
    if (!user) return null;

    // Generate unique invite code
    let inviteCode;
    let exists = true;
    while (exists) {
      inviteCode = generateInviteCode();
      const q = query(collection(db, 'pools'), where('inviteCode', '==', inviteCode));
      const snap = await getDocs(q);
      exists = !snap.empty;
    }

    const poolRef = doc(collection(db, 'pools'));
    const poolData = {
      name,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      inviteCode,
      members: [user.uid],
    };

    await setDoc(poolRef, poolData);

    // Init leaderboard entry
    await setDoc(doc(db, 'pools', poolRef.id, 'leaderboard', user.uid), {
      nickname: profile?.nickname || '',
      totalPoints: 0,
      exactResultsCount: 0,
      correctOutcomeCount: 0,
    });

    // Add pool to user's pools array
    await updateDoc(doc(db, 'users', user.uid), {
      pools: arrayUnion(poolRef.id),
    });

    const newPool = { id: poolRef.id, ...poolData };
    setPools((prev) => [...prev, newPool]);
    selectPool(poolRef.id);

    return newPool;
  }, [user, profile, selectPool]);

  const joinPool = useCallback(async (inviteCode) => {
    if (!user) return null;

    const code = inviteCode.trim().toUpperCase();
    const q = query(collection(db, 'pools'), where('inviteCode', '==', code));
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const poolDoc = snap.docs[0];
    const poolData = poolDoc.data();

    // Already a member?
    if (poolData.members?.includes(user.uid)) {
      selectPool(poolDoc.id);
      return { id: poolDoc.id, ...poolData };
    }

    // Add user to pool members
    await updateDoc(doc(db, 'pools', poolDoc.id), {
      members: arrayUnion(user.uid),
    });

    // Init leaderboard entry
    await setDoc(doc(db, 'pools', poolDoc.id, 'leaderboard', user.uid), {
      nickname: profile?.nickname || '',
      totalPoints: 0,
      exactResultsCount: 0,
      correctOutcomeCount: 0,
    });

    // Add pool to user's pools array
    await updateDoc(doc(db, 'users', user.uid), {
      pools: arrayUnion(poolDoc.id),
    });

    const joinedPool = { id: poolDoc.id, ...poolData };
    setPools((prev) => [...prev, joinedPool]);
    selectPool(poolDoc.id);

    return joinedPool;
  }, [user, profile, selectPool]);

  const activePool = pools.find((p) => p.id === activePoolId) || null;

  return (
    <PoolContext.Provider value={{
      pools,
      activePool,
      activePoolId,
      selectPool,
      createPool,
      joinPool,
      loading,
    }}>
      {children}
    </PoolContext.Provider>
  );
}

export function usePools() {
  const ctx = useContext(PoolContext);
  if (!ctx) throw new Error('usePools must be used within PoolProvider');
  return ctx;
}
