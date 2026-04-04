import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';
import { getTodayMatches, mapApiStatus, extractScore } from '../utils/footballApi';

const POLL_INTERVAL = 60_000;

export function useLiveScores() {
  const { profile } = useAuth();
  const groupCode = profile?.groupCode;
  const [liveData, setLiveData] = useState({});
  const [hasLive, setHasLive] = useState(false);
  const timerRef = useRef(null);

  const fetchScores = useCallback(async () => {
    try {
      const data = await getTodayMatches();
      if (!data.matches) return;

      const updates = {};
      let anyLive = false;

      for (const m of data.matches) {
        const status = mapApiStatus(m.status);
        const score = extractScore(m);
        updates[m.id] = { status, score, apiMatchId: m.id };
        if (status === 'live') anyLive = true;

        if (status === 'finished' && score && groupCode) {
          await setDoc(
            doc(db, 'groups', groupCode, 'matches', String(m.id)),
            { status, scoreHome: score.home, scoreAway: score.away },
            { merge: true }
          );
        }
      }

      setLiveData(updates);
      setHasLive(anyLive);
    } catch {
      // Silently fail — will retry on next poll
    }
  }, [groupCode]);

  useEffect(() => {
    fetchScores();
    return () => clearInterval(timerRef.current);
  }, [fetchScores]);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (hasLive) {
      timerRef.current = setInterval(fetchScores, POLL_INTERVAL);
    }
    return () => clearInterval(timerRef.current);
  }, [hasLive, fetchScores]);

  return { liveData, hasLive, refetch: fetchScores };
}

export function useCachedScores() {
  const { profile } = useAuth();
  const groupCode = profile?.groupCode;
  const [scores, setScores] = useState({});

  useEffect(() => {
    if (!groupCode) return;
    let cancelled = false;
    (async () => {
      const snap = await getDocs(collection(db, 'groups', groupCode, 'matches'));
      if (cancelled) return;
      const map = {};
      snap.docs.forEach((d) => {
        map[d.id] = d.data();
      });
      setScores(map);
    })();
    return () => { cancelled = true; };
  }, [groupCode]);

  return scores;
}
