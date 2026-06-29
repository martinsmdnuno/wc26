// One-off investigation: count knockout-stage bets (matchId >= 73) already in
// Firestore, broken down by match and pool, so we can decide what to do with
// bets placed BEFORE the R32/R16 bracket pairings were corrected.
// Run via the count-ko-bets workflow (it has FIREBASE_SERVICE_ACCOUNT).
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) { console.log('FIREBASE_SERVICE_ACCOUNT not set — nothing to do.'); process.exit(0); }
initializeApp({ credential: cert(JSON.parse(raw)) });
const db = getFirestore();

// Collection-group query across every pool's bets (index already exists).
const snap = await db.collectionGroup('bets').where('matchId', '>=', 73).get();
console.log(`TOTAL knockout bets (matchId >= 73): ${snap.size}`);

const byMatch = {};
const byPool = {};
let scored = 0;
for (const d of snap.docs) {
  const b = d.data();
  byMatch[b.matchId] = (byMatch[b.matchId] || 0) + 1;
  // path: pools/{poolId}/bets/{id}
  const poolId = d.ref.parent.parent?.id || '?';
  byPool[poolId] = (byPool[poolId] || 0) + 1;
  if (b.pointsAwarded != null) scored += 1;
}

console.log(`Already scored (pointsAwarded != null): ${scored}`);
console.log('\nBy match:');
for (const id of Object.keys(byMatch).map(Number).sort((a, b) => a - b)) {
  console.log(`  match ${id}: ${byMatch[id]} bet(s)`);
}
console.log('\nBy pool:');
for (const [pid, n] of Object.entries(byPool).sort((a, b) => b[1] - a[1])) {
  console.log(`  pool ${pid}: ${n} bet(s)`);
}
console.log('\ndone');
