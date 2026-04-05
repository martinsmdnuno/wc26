import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  signInAnonymously,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  linkWithPopup,
  linkWithRedirect,
  linkWithCredential,
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  signOut,
  GoogleAuthProvider,
} from 'firebase/auth';
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
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import * as Sentry from '@sentry/react';
import { increment } from 'firebase/firestore';

const AuthContext = createContext(null);

const isMobileSafari = () => {
  const ua = navigator.userAgent;
  return /iP(ad|hone|od)/.test(ua) && /WebKit/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua);
};

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

async function mergeAnonymousData(oldUid, newUid) {
  const oldUserSnap = await getDoc(doc(db, 'users', oldUid));
  if (!oldUserSnap.exists()) return;

  const oldData = oldUserSnap.data();
  const poolIds = oldData.pools || [];

  for (const poolId of poolIds) {
    const betsSnap = await getDocs(
      query(collection(db, 'pools', poolId, 'bets'), where('userId', '==', oldUid))
    );

    const batch = writeBatch(db);
    for (const betDoc of betsSnap.docs) {
      const betData = betDoc.data();
      const newDocId = `${newUid}_${betData.matchId}`;
      const newBetRef = doc(db, 'pools', poolId, 'bets', newDocId);
      const existingBet = await getDoc(newBetRef);
      if (!existingBet.exists()) {
        batch.set(newBetRef, { ...betData, userId: newUid });
      }
      batch.delete(betDoc.ref);
    }
    await batch.commit();

    const oldLbRef = doc(db, 'pools', poolId, 'leaderboard', oldUid);
    const oldLbSnap = await getDoc(oldLbRef);
    if (oldLbSnap.exists()) {
      const newLbRef = doc(db, 'pools', poolId, 'leaderboard', newUid);
      const newLbSnap = await getDoc(newLbRef);
      if (!newLbSnap.exists()) {
        await setDoc(newLbRef, oldLbSnap.data());
      }
      await deleteDoc(oldLbRef);
    }

    // Update pool members
    const poolSnap = await getDoc(doc(db, 'pools', poolId));
    if (poolSnap.exists()) {
      const members = poolSnap.data().members || [];
      const updated = members.filter((m) => m !== oldUid);
      if (!updated.includes(newUid)) updated.push(newUid);
      await updateDoc(doc(db, 'pools', poolId), { members: updated });
    }

    // Add pool to new user
    await updateDoc(doc(db, 'users', newUid), {
      pools: arrayUnion(poolId),
    });
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let handled = false;

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          Sentry.setUser({ id: firebaseUser.uid, email: firebaseUser.email || undefined });
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

            // Analytics: track login
            try {
              await updateDoc(doc(db, 'users', firebaseUser.uid), {
                lastLoginAt: serverTimestamp(),
                loginCount: increment(1),
                appVersion: import.meta.env.VITE_APP_VERSION || '0.0.0',
              });
            } catch {}
          } else if (!firebaseUser.isAnonymous) {
            // New user via Google/Email — create profile stub with email
            const data = {
              nickname: firebaseUser.displayName || '',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || '',
              pools: [],
              createdAt: serverTimestamp(),
              lastLoginAt: serverTimestamp(),
              loginCount: 1,
              appVersion: import.meta.env.VITE_APP_VERSION || '0.0.0',
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), data);
            // Always set profile — AuthScreen will handle empty nickname
            setProfile(data);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Auth error:', err);
      }
      setLoading(false);
    });

    // Handle redirect result (for mobile Safari)
    getRedirectResult(auth).then(async (result) => {
      if (result && !handled) {
        handled = true;
      }
    }).catch((err) => {
      console.error('Redirect result error:', err);
    });

    return unsub;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const currentUser = auth.currentUser;
    const wasAnonymous = currentUser?.isAnonymous;
    const oldUid = currentUser?.uid;

    try {
      if (wasAnonymous) {
        if (isMobileSafari()) {
          await linkWithRedirect(currentUser, googleProvider);
          return; // page will reload
        }
        const result = await linkWithPopup(currentUser, googleProvider);
        setUser(result.user);

        // Ensure user doc exists and has email
        const snap = await getDoc(doc(db, 'users', result.user.uid));
        if (snap.exists()) {
          await updateDoc(doc(db, 'users', result.user.uid), {
            email: result.user.email || '',
            photoURL: result.user.photoURL || '',
          });
          setProfile({ ...snap.data(), email: result.user.email || '' });
        } else {
          // Anonymous user had no profile yet — create one now
          const data = {
            nickname: result.user.displayName || '',
            email: result.user.email || '',
            photoURL: result.user.photoURL || '',
            pools: [],
            createdAt: serverTimestamp(),
          };
          await setDoc(doc(db, 'users', result.user.uid), data);
          setProfile(data);
        }
        return result.user;
      } else {
        if (isMobileSafari()) {
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        const result = await signInWithPopup(auth, googleProvider);
        setUser(result.user);
        return result.user;
      }
    } catch (err) {
      if (err.code === 'auth/credential-already-in-use') {
        // Google account already linked to different uid — sign in and merge
        const credential = GoogleAuthProvider.credentialFromError(err);
        if (credential) {
          const result = await signInWithCredential(auth, credential);
          if (wasAnonymous && oldUid && oldUid !== result.user.uid) {
            await mergeAnonymousData(oldUid, result.user.uid);
          }
          setUser(result.user);
          return result.user;
        }
      }
      throw err;
    }
  }, []);

  const signInWithEmail = useCallback(async (email, password, isSignUp) => {
    const currentUser = auth.currentUser;
    const wasAnonymous = currentUser?.isAnonymous;
    const oldUid = currentUser?.uid;

    try {
      if (wasAnonymous) {
        const credential = EmailAuthProvider.credential(email, password);
        const result = await linkWithCredential(currentUser, credential);
        setUser(result.user);

        const snap = await getDoc(doc(db, 'users', result.user.uid));
        if (snap.exists()) {
          await updateDoc(doc(db, 'users', result.user.uid), { email });
          setProfile({ ...snap.data(), email });
        }
        return result.user;
      } else if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        setUser(result.user);
        return result.user;
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        setUser(result.user);
        return result.user;
      }
    } catch (err) {
      if (err.code === 'auth/credential-already-in-use' || err.code === 'auth/email-already-in-use') {
        // Email already linked — try signing in
        const result = await signInWithEmailAndPassword(auth, email, password);
        if (wasAnonymous && oldUid && oldUid !== result.user.uid) {
          await mergeAnonymousData(oldUid, result.user.uid);
        }
        setUser(result.user);
        return result.user;
      }
      throw err;
    }
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
    try {
      localStorage.removeItem('wc26-active-pool');
    } catch {}
    // Re-create anonymous session
    await signInAnonymously(auth);
  }, []);

  const saveProfile = useCallback(async (nickname) => {
    if (!user) return;
    const data = {
      nickname,
      pools: [],
      createdAt: serverTimestamp(),
    };
    if (user.email) data.email = user.email;
    await setDoc(doc(db, 'users', user.uid), data, { merge: true });
    setProfile((prev) => ({ ...prev, ...data }));
  }, [user]);

  const isAnonymous = user?.isAnonymous ?? true;

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      isAnonymous,
      saveProfile,
      signInWithGoogle,
      signInWithEmail,
      signOutUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
