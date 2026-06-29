// One-off verify: dump knockout matchResults (73-88) and the leaderboard
// knockoutPoints, to confirm KO auto-scoring landed.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) { console.log('FIREBASE_SERVICE_ACCOUNT not set — nothing to do.'); process.exit(0); }
initializeApp({ credential: cert(JSON.parse(raw)) });
const db = getFirestore();

console.log('== matchResults 73-88 ==');
for (let id = 73; id <= 88; id++) {
  const d = await db.collection('matchResults').doc(String(id)).get();
  if (!d.exists) { console.log(`  ${id}: (none)`); continue; }
  const r = d.data();
  console.log(`  ${id}: ${r.scoreA}-${r.scoreB} status=${r.status} decidedBy=${r.decidedBy ?? '-'} advancer=${r.advancer ?? '-'} scored=${r.scored} source=${r.source ?? '-'}`);
}

console.log('\n== leaderboard (per pool) knockoutPoints ==');
const pools = await db.collection('pools').get();
for (const p of pools.docs) {
  const lb = await p.ref.collection('leaderboard').get();
  const rows = lb.docs.map((d) => d.data())
    .map((x) => `${x.nickname || '?'}: ko=${x.knockoutPoints ?? 0} total=${x.totalPoints ?? 0}`);
  console.log(`  pool ${p.id}: ${rows.join(' | ')}`);
}
console.log('done');
