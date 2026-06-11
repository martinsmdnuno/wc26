// One-off read-only diagnostic for "ranking não atualiza": dumps what the
// scoring pipeline depends on. Run manually via the Diagnose workflow.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  console.log('FIREBASE_SERVICE_ACCOUNT not set — nothing to do.');
  process.exit(0);
}

initializeApp({ credential: cert(JSON.parse(raw)) });
const db = getFirestore();

// 1) Posted results
const results = await db.collection('matchResults').get();
console.log(`\n== matchResults: ${results.size} doc(s)`);
results.forEach((d) => {
  const r = d.data();
  console.log(`  match ${d.id}: ${r.scoreA}-${r.scoreB} status=${r.status} updatedAt=${r.updatedAt?.toDate?.()?.toISOString?.() ?? r.updatedAt}`);
});

// 2) Pools, their bets for match 1, and leaderboards
const pools = await db.collection('pools').get();
console.log(`\n== pools: ${pools.size}`);
for (const p of pools.docs) {
  const pool = p.data();
  console.log(`\npool ${p.id} "${pool.name ?? ''}" members=${pool.members?.length ?? 0}`);

  const bets = await db.collection('pools').doc(p.id).collection('bets')
    .where('matchId', '==', 1).get();
  console.log(`  bets for match 1: ${bets.size}`);
  bets.forEach((b) => {
    const v = b.data();
    console.log(`    ${b.id}: pred=${v.predictedScoreA}-${v.predictedScoreB} pointsAwarded=${v.pointsAwarded ?? 'null'} lockAt=${v.lockAt ?? 'null'}`);
  });

  const lb = await db.collection('pools').doc(p.id).collection('leaderboard').get();
  console.log(`  leaderboard entries: ${lb.size}`);
  lb.forEach((e) => {
    const v = e.data();
    console.log(`    ${e.id} (${v.nickname ?? '?'}): pts=${v.totalPoints} exact=${v.exactResultsCount} outcome=${v.correctOutcomeCount}`);
  });
}

// 3) Recent admin error logs (scoring failures land here)
const logs = await db.collection('adminLogs').orderBy('timestamp', 'desc').limit(15).get().catch(() => null);
console.log(`\n== adminLogs (latest ${logs?.size ?? 0})`);
logs?.forEach((l) => {
  const v = l.data();
  console.log(`  ${v.timestamp?.toDate?.()?.toISOString?.() ?? '?'} ${v.code ?? v.type ?? '?'}: ${v.message ?? ''} ${JSON.stringify(v.context ?? v.meta ?? {})}`);
});
