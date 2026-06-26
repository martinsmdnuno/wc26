// Resolves knockout fixtures to REAL teams as the tournament unfolds, filling in
// only slots that are already certain (the user's rule: "só as que já são
// certas"). It is purely reactive to the `matchResults`-backed scores map, so it
// updates by itself every time a new result lands — no manual maintenance.
//
// What is "certain":
//   - 1st / 2nd of a group  -> only once that group has played all its matches
//     (the final table order, incl. tiebreakers, is then settled).
//   - Winner / loser feeders (W73 / L101) -> once that match is finished and both
//     of its teams are already resolved.
//   - The 8 best third-placed slots (e.g. "3C/E/F/H/I") are NEVER auto-filled:
//     which third goes to which match comes from FIFA's official allocation
//     table and isn't derivable from the pools, so those stay as placeholders.
import schedule from '../data/schedule.json';
import { computeStandings } from './standings';

const phaseById = Object.fromEntries(schedule.phases.map((p) => [p.id, p]));
const GROUP_MATCHES = phaseById.group?.matches || [];
// All knockout phases in bracket order so winner feeders resolve front-to-back.
const KNOCKOUT_PHASES = ['r32', 'r16', 'qf', 'sf', '3rd', 'final'];

// Parse a slot string into a structured source.
//   'W73' -> winner of match 73    'L101' -> loser of match 101
//   '1C'  -> 1st of group C        '3C/E/F/H/I' -> a best-third pool
export function parseSlot(str) {
  if (!str) return null;
  const w = /^W(\d+)$/.exec(str);
  if (w) return { type: 'winner', match: Number(w[1]) };
  const l = /^L(\d+)$/.exec(str);
  if (l) return { type: 'loser', match: Number(l[1]) };
  return { type: 'group', pos: str[0], groups: str.match(/[A-L]/g) || [] };
}

const POS_INDEX = { 1: 0, 2: 1, 3: 2 };

// Decide the winner/loser of a finished knockout match. Needs both teams known
// and a decisive result; a knockout draw with no shootout data stays unresolved.
function outcome(matchId, resolved, results) {
  const r = results?.[String(matchId)];
  if (!r || (r.status && r.status !== 'finished')) return null;
  if (r.scoreHome == null || r.scoreAway == null) return null;
  const teams = resolved[matchId];
  if (!teams || !teams.home || !teams.away) return null;
  let winner;
  if (r.scoreHome > r.scoreAway) winner = 'home';
  else if (r.scoreAway > r.scoreHome) winner = 'away';
  else if (r.penHome != null && r.penAway != null) winner = r.penHome > r.penAway ? 'home' : 'away';
  else return null; // drew, no shootout recorded — can't be certain
  const loser = winner === 'home' ? 'away' : 'home';
  return { winner: teams[winner], loser: teams[loser] };
}

// Returns { [matchId]: { home: iso|null, away: iso|null } } for every knockout
// match, with isos only where the team is already certain.
export function resolveKnockout(results) {
  const { groups } = computeStandings(results || {});
  const groupComplete = (g) => {
    const rows = groups[g] || [];
    return rows.length > 0 && rows.every((r) => r.played === rows.length - 1);
  };

  const resolved = {};
  const resolveSide = (slot) => {
    const src = parseSlot(slot);
    if (!src) return null;
    if (src.type === 'group') {
      // Best-third pools (more than one group) are never auto-resolvable.
      if (src.groups.length !== 1) return null;
      const g = src.groups[0];
      if (!groupComplete(g)) return null;
      return groups[g]?.[POS_INDEX[src.pos]]?.iso || null;
    }
    if (src.type === 'winner') return outcome(src.match, resolved, results)?.winner || null;
    if (src.type === 'loser') return outcome(src.match, resolved, results)?.loser || null;
    return null;
  };

  for (const pid of KNOCKOUT_PHASES) {
    for (const m of phaseById[pid]?.matches || []) {
      resolved[m.id] = { home: resolveSide(m.home), away: resolveSide(m.away) };
    }
  }
  return resolved;
}

// Like resolveKnockout, but also derives the certain winner of each knockout
// match and the champion (winner of the final). Used by the read-only bracket.
export function resolveWinners(results) {
  const teams = resolveKnockout(results);
  const winners = {};
  for (const pid of KNOCKOUT_PHASES) {
    for (const m of phaseById[pid]?.matches || []) {
      winners[m.id] = outcome(m.id, teams, results)?.winner || null;
    }
  }
  const finalMatch = phaseById.final?.matches?.[0];
  return { teams, winners, champion: finalMatch ? winners[finalMatch.id] || null : null };
}

// Human-friendly label for an unresolved slot, e.g. "1.º Grupo A",
// "Melhor 3.º (C/E/F/H/I)", "Venc. jogo 73". Needs the i18n `t`.
export function slotLabel(str, t) {
  const src = parseSlot(str);
  if (!src) return str || '';
  if (src.type === 'winner') return `${t('slotWinnerOf')} ${src.match}`;
  if (src.type === 'loser') return `${t('slotLoserOf')} ${src.match}`;
  if (src.groups.length === 1) {
    const pos = src.pos === '1' ? t('slotFirst') : src.pos === '2' ? t('slotSecond') : t('slotThird');
    return `${pos} ${t('group')} ${src.groups[0]}`;
  }
  return `${t('slotBestThird')} (${src.groups.join('/')})`;
}
