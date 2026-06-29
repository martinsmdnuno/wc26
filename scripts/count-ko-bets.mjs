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

// Iterate per pool (collection-scoped query uses the automatic single-field
// index — avoids needing a collection-group index for matchId).
const pools = await db.collection('pools').get();
const byMatch = {};
const byPool = {};
let total = 0;
let scored = 0;
for (const poolDoc of pools.docs) {
  const snap = await poolDoc.ref.collection('bets').where('matchId', '>=', 73).get();
  if (snap.empty) continue;
  byPool[poolDoc.id] = snap.size;
  for (const d of snap.docs) {
    const b = d.data();
    total += 1;
    byMatch[b.matchId] = (byMatch[b.matchId] || 0) + 1;
    if (b.pointsAwarded != null) scored += 1;
  }
}

console.log(`TOTAL knockout bets (matchId >= 73): ${total}`);
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
