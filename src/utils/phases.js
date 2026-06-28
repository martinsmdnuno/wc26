// Single source of truth for which tournament segment a match belongs to.
// Group stage (phase id "group") vs knockout (everything else: r32 → final).
// Used by the scoring write-path, the backfill script, and any per-segment UI,
// so the classification can never drift between them.
import schedule from '../data/schedule.json';

const groupPhase = schedule.phases.find((p) => p.id === 'group');
export const GROUP_MATCH_IDS = new Set((groupPhase?.matches || []).map((m) => m.id));

// Returns 'group' for group-stage matches, 'knockout' otherwise.
export function matchSegment(matchId) {
  return GROUP_MATCH_IDS.has(Number(matchId)) ? 'group' : 'knockout';
}

// Kickoff in epoch ms. schedule stores Portugal time (UTC+1 during the
// tournament), so subtract one hour — mirrors scripts/sync-results.mjs.
function kickoffMs(m) {
  const [y, mo, d] = m.date.split('-').map(Number);
  const [h, mi] = m.kickoff_bst.split(':').map(Number);
  return Date.UTC(y, mo - 1, d, h - 1, mi);
}

const KNOCKOUT_MATCHES = schedule.phases.filter((p) => p.id !== 'group').flatMap((p) => p.matches);
const FIRST_KNOCKOUT_MS = KNOCKOUT_MATCHES.reduce((min, m) => Math.min(min, kickoffMs(m)), Infinity);

// Last group kickoff + ~2h: the moment the group stage is, for all practical
// purposes, finished. Gates the "Oráculo da Circunvalação" certificate so we
// never crown a leader mid-stage.
const LAST_GROUP_MS = (groupPhase?.matches || []).reduce((max, m) => Math.max(max, kickoffMs(m)), 0);
const GROUP_STAGE_END_MS = LAST_GROUP_MS ? LAST_GROUP_MS + 2 * 60 * 60 * 1000 : Infinity;

// True once the group stage is over (all group matches have been played).
export function groupStageComplete(now = Date.now()) {
  return now >= GROUP_STAGE_END_MS;
}
const finalMatch = schedule.phases.find((p) => p.id === 'final')?.matches[0];
// Tournament is "over" ~3h after the final kicks off.
const TOURNAMENT_END_MS = finalMatch ? kickoffMs(finalMatch) + 3 * 60 * 60 * 1000 : Infinity;

// Which leaderboard tab to open on, following the tournament's current phase:
// group stage → 'group'; once knockouts begin → 'knockout'; after the final
// ends → 'total'. The per-segment tabs always stay available regardless.
export function defaultLeaderboardTab(now = Date.now()) {
  if (now >= TOURNAMENT_END_MS) return 'total';
  if (now >= FIRST_KNOCKOUT_MS) return 'knockout';
  return 'group';
}
