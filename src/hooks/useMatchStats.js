import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { usePools } from './usePools';
import { isMatchLocked } from '../data/matchLock';
import { logError } from '../utils/logError';

// Loads every member's prediction (+ nicknames) for one match. Only runs once
// the match has kicked off — before that the rules forbid reading other
// players' bets, which would make the whole collection query fail.
export function useMatchStats(matchId, enabled) {
  const { activePoolId } = usePools();
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !activePoolId || !isMatchLocked(matchId)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [betsSnap, lbSnap] = await Promise.all([
          getDocs(query(collection(db, 'pools', activePoolId, 'bets'), where('matchId', '==', matchId))),
          getDocs(collection(db, 'pools', activePoolId, 'leaderboard')),
        ]);
        if (cancelled) return;
        const names = {};
        lbSnap.docs.forEach((d) => { names[d.id] = d.data().nickname || ''; });
        const list = betsSnap.docs
          .map((d) => {
            const data = d.data();
            return {
              uid: data.userId,
              nickname: names[data.userId] || '—',
              a: data.predictedScoreA,
              b: data.predictedScoreB,
              points: data.pointsAwarded,
            };
          })
          .filter((x) => x.a != null && x.b != null);
        setBets(list);
      } catch (e) {
        if (!cancelled) logError('MATCH_STATS_FAILED', `Falha ao carregar palpites do jogo ${matchId}`, { e: String(e) });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [enabled, activePoolId, matchId]);

  return { bets, loading };
}
