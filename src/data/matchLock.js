// Per-match reveal/lock time. A match's bets become readable by other players
// (and the prediction editor closes) at kickoff. Kickoff in the schedule is
// stored as `kickoff_bst` (British Summer Time = UTC+1 in June/July), so the
// UTC instant is that time minus one hour.
import schedule from './schedule.json';

const BST_OFFSET_HOURS = 1;

function computeLockMs(dateStr, kickoffBst) {
  if (!dateStr || !kickoffBst) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = kickoffBst.split(':').map(Number);
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return null;
  return Date.UTC(y, m - 1, d, hh - BST_OFFSET_HOURS, mm);
}

export const MATCH_LOCK = {};
for (const phase of schedule.phases) {
  for (const match of phase.matches) {
    const ms = computeLockMs(match.date, match.kickoff_bst);
    if (ms != null) MATCH_LOCK[match.id] = ms;
  }
}

export function matchLockAt(matchId) {
  return MATCH_LOCK[matchId] ?? null;
}

export function isMatchLocked(matchId, now = Date.now()) {
  const t = MATCH_LOCK[matchId];
  return t != null && now >= t;
}
