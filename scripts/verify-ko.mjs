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

const POOL = 'OFMzULHb6f8pvpEcTV8d'; // "Tacho de Sexta"
const pref = db.collection('pools').doc(POOL);

console.log(`\n== leaderboard for pool ${POOL} ==`);
const lb = await pref.collection('leaderboard').get();
for (const d of lb.docs) {
  const x = d.data();
  console.log(`  ${x.nickname || d.id}: ko=${x.knockoutPoints ?? 0} group=${x.groupPoints ?? 0} total=${x.totalPoints ?? 0}`);
}

console.log('\n== match 73 bets in that pool ==');
const bets = await pref.collection('bets').where('matchId', '==', 73).get();
for (const d of bets.docs) {
  const b = d.data();
  console.log(`  uid=${b.userId?.slice(0, 6)} pred=${b.predictedScoreA}-${b.predictedScoreB} pointsAwarded=${b.pointsAwarded ?? 'null'} scoredType=${b.scoredType ?? '-'}`);
}
console.log('done');
