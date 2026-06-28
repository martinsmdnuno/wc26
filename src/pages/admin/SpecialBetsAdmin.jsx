import { useState, useEffect } from 'react';
import {
  collection, getDocs, doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, query, where,
} from 'firebase/firestore';
import { db } from '../../firebase';
import Autocomplete from '../../components/Autocomplete';
import { SPECIAL_CATEGORIES, SPECIAL_POINTS, SPECIAL_EXCEPTION } from '../../data/specialBets';
import { optionsFor } from '../../data/playerIndex';
import { SPECIAL_RESULTS_DOC } from '../../hooks/useSpecialBets';
import { logError } from '../../utils/logError';

const CATEGORY_LABELS = {
  topScorer: 'Melhor Marcador',
  mvp: 'MVP do Torneio',
  youngPlayer: 'Melhor Jovem',
  surpriseTeam: 'Seleção Surpresa',
};

export default function SpecialBetsAdmin() {
  const [results, setResults] = useState({ picks: {}, resolved: {} });
  const [drafts, setDrafts] = useState({}); // { catId: optionId }
  const [busy, setBusy] = useState(null); // catId being resolved
  const [done, setDone] = useState({}); // { catId: '<n> pts atribuídos' }
  const [loaded, setLoaded] = useState(false);
  const [exBusy, setExBusy] = useState(false);
  const [exNote, setExNote] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'specialResults', SPECIAL_RESULTS_DOC));
        if (snap.exists()) {
          const data = snap.data();
          setResults({ picks: data.picks || {}, resolved: data.resolved || {} });
          setDrafts(data.picks || {});
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const resolve = async (cat) => {
    const correctId = drafts[cat.id] || null;
    if (!correctId) return;
    setBusy(cat.id);
    setDone((d) => ({ ...d, [cat.id]: '' }));

    try {
      // 1. Persist the global correct answer for this category.
      const nextPicks = { ...results.picks, [cat.id]: correctId };
      const nextResolved = { ...results.resolved, [cat.id]: true };
      await setDoc(
        doc(db, 'specialResults', SPECIAL_RESULTS_DOC),
        { picks: nextPicks, resolved: nextResolved, updatedAt: serverTimestamp() },
        { merge: true }
      );

      // One-off exception: special points of these users (in the exception pool)
      // are kept in `specialPoints` but EXCLUDED from `totalPoints`, and logged in
      // the adjustments history. Resolve their uids by e-mail.
      let excludedUids = new Set();
      try {
        const us = await getDocs(query(collection(db, 'users'), where('email', 'in', SPECIAL_EXCEPTION.emails)));
        excludedUids = new Set(us.docs.map((d) => d.id));
      } catch { /* best-effort; exclusion just won't apply if this fails */ }

      // 2. Recalculate this category across every pool, crediting the delta so
      //    re-resolving with a corrected answer stays idempotent.
      let credited = 0;
      const poolsSnap = await getDocs(collection(db, 'pools'));
      for (const poolDoc of poolsSnap.docs) {
        const poolId = poolDoc.id;
        const betsSnap = await getDocs(collection(db, 'pools', poolId, 'specialBets'));
        for (const betDoc of betsSnap.docs) {
          const bet = betDoc.data();
          const prevAward = bet.pointsAwarded?.[cat.id] || 0;
          const isHit = bet.picks?.[cat.id] && bet.picks[cat.id] === correctId;
          const newAward = isHit ? SPECIAL_POINTS : 0;
          const delta = newAward - prevAward;
          // Excluded = the exception users, only in the exception pool.
          const isExcluded = poolDoc.data().inviteCode === SPECIAL_EXCEPTION.poolCode
            && excludedUids.has(bet.userId);

          if (delta !== 0 || prevAward !== newAward) {
            await setDoc(
              betDoc.ref,
              { pointsAwarded: { ...(bet.pointsAwarded || {}), [cat.id]: newAward } },
              { merge: true }
            );
          }
          if (delta !== 0) {
            const lbRef = doc(db, 'pools', poolId, 'leaderboard', bet.userId);
            const lbSnap = await getDoc(lbRef);
            if (lbSnap.exists()) {
              // Excluded users: track specialPoints but keep it OUT of the total.
              await updateDoc(lbRef, isExcluded
                ? { specialPoints: increment(delta) }
                : { totalPoints: increment(delta), specialPoints: increment(delta) });
            } else {
              let nickname = '';
              try {
                const us = await getDoc(doc(db, 'users', bet.userId));
                if (us.exists()) nickname = us.data().nickname || '';
              } catch { /* nickname is best-effort */ }
              await setDoc(lbRef, {
                nickname,
                totalPoints: isExcluded ? 0 : Math.max(0, delta),
                exactResultsCount: 0,
                correctOutcomeCount: 0,
                specialPoints: Math.max(0, delta),
              });
            }
          }
          // Log the exception in the adjustments history (idempotent per user).
          if (isExcluded) {
            let nickname = '';
            try {
              const us = await getDoc(doc(db, 'users', bet.userId));
              if (us.exists()) nickname = us.data().nickname || '';
            } catch { /* nickname is best-effort */ }
            await setDoc(
              doc(db, 'pools', poolId, 'adjustments', `special-exception-${bet.userId}`),
              {
                uid: bet.userId,
                nickname,
                at: serverTimestamp(),
                reason: 'Exceção: palpites especiais reabertos por extensão de prazo (até 29/jun); os pontos especiais deste utilizador NÃO entram na contabilização final (total).',
                before: {},
                after: {},
              },
              { merge: true }
            );
          }
          if (newAward > 0) credited += 1;
        }
      }

      setResults({ picks: nextPicks, resolved: nextResolved });
      setDone((d) => ({ ...d, [cat.id]: `${credited} acerto(s) creditado(s)` }));
    } catch (err) {
      logError('SPECIAL_RESOLVE_FAILED', `Falha a resolver ${cat.id}`, { e: String(err) });
      setDone((d) => ({ ...d, [cat.id]: 'Erro ao resolver' }));
    }
    setBusy(null);
  };

  // Register the WC26-GXFD special-bets exception in that pool's adjustments
  // history NOW (idempotent), without waiting for the special resolution.
  const registerException = async () => {
    setExBusy(true);
    setExNote('');
    try {
      const poolsSnap = await getDocs(
        query(collection(db, 'pools'), where('inviteCode', '==', SPECIAL_EXCEPTION.poolCode))
      );
      const poolDoc = poolsSnap.docs[0];
      if (!poolDoc) { setExNote(`Bolão ${SPECIAL_EXCEPTION.poolCode} não encontrado.`); setExBusy(false); return; }
      const usersSnap = await getDocs(
        query(collection(db, 'users'), where('email', 'in', SPECIAL_EXCEPTION.emails))
      );
      if (usersSnap.empty) { setExNote('Utilizadores não encontrados por email.'); setExBusy(false); return; }
      let n = 0;
      for (const u of usersSnap.docs) {
        await setDoc(
          doc(db, 'pools', poolDoc.id, 'adjustments', `special-exception-${u.id}`),
          {
            uid: u.id,
            nickname: u.data().nickname || '',
            at: serverTimestamp(),
            reason: 'Exceção: palpites especiais reabertos por extensão de prazo (até 29/jun); os pontos especiais deste utilizador NÃO entram na contabilização final (total).',
            before: {},
            after: {},
          },
          { merge: true }
        );
        n += 1;
      }
      setExNote(`Registado no histórico (${n} utilizador(es)).`);
    } catch (err) {
      logError('SPECIAL_EXCEPTION_LOG_FAILED', 'Falha a registar exceção no histórico', { e: String(err) });
      setExNote('Erro ao registar.');
    }
    setExBusy(false);
  };

  if (!loaded) return <div className="admin__section"><p className="admin__empty">A carregar...</p></div>;

  return (
    <div className="admin__section">
      <h3>Apostas Especiais</h3>
      <p style={{ color: 'var(--muted, #888)', fontSize: 14, marginTop: -4 }}>
        Define a resposta certa de cada categoria e atribui {SPECIAL_POINTS} pts a quem acertou.
        Podes recalcular se corrigires a resposta.
      </p>

      <div style={{ margin: '4px 0 16px' }}>
        <button
          className="admin__btn admin__btn--ghost admin__btn--small"
          disabled={exBusy}
          onClick={registerException}
        >
          {exBusy ? '...' : `Registar exceção ${SPECIAL_EXCEPTION.poolCode} no histórico`}
        </button>
        {exNote && (
          <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted, #888)' }}>{exNote}</span>
        )}
      </div>

      <table className="admin__table">
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Resposta correta</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {SPECIAL_CATEGORIES.map((cat) => {
            const isResolved = !!results.resolved?.[cat.id];
            return (
              <tr key={cat.id}>
                <td style={{ fontWeight: 600 }}>{cat.icon} {CATEGORY_LABELS[cat.id]}</td>
                <td style={{ minWidth: 220 }}>
                  <Autocomplete
                    options={optionsFor(cat.kind)}
                    value={drafts[cat.id] || null}
                    onChange={(optId) => setDrafts((d) => ({ ...d, [cat.id]: optId }))}
                    placeholder={cat.kind === 'team' ? 'Escolher equipa...' : 'Escolher jogador...'}
                    emptyText="—"
                  />
                </td>
                <td>
                  {isResolved ? (
                    <span className="admin__badge admin__badge--finished">Resolvido</span>
                  ) : (
                    <span className="admin__badge admin__badge--pending">Pendente</span>
                  )}
                  {done[cat.id] && (
                    <div style={{ fontSize: 12, color: 'var(--muted, #888)', marginTop: 4 }}>{done[cat.id]}</div>
                  )}
                </td>
                <td>
                  <button
                    className="admin__btn admin__btn--primary admin__btn--small"
                    disabled={busy === cat.id || !drafts[cat.id]}
                    onClick={() => resolve(cat)}
                  >
                    {busy === cat.id ? '...' : isResolved ? 'Recalcular' : 'Resolver'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
