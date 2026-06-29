// One-off: fix the already-stored game-73 result notification (it shows the
// slot placeholders "2A 0-1 2B") and stamp the resolved isos on matchResults/73.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) { console.log('FIREBASE_SERVICE_ACCOUNT not set — nothing to do.'); process.exit(0); }
initializeApp({ credential: cert(JSON.parse(raw)) });
const db = getFirestore();

await db.collection('matchResults').doc('73').set({ homeIso: 'za', awayIso: 'ca' }, { merge: true });

const r = await db.collection('matchResults').doc('73').get();
const d = r.data() || {};
const title = `📊 Resultado: South Africa ${d.scoreA}-${d.scoreB} Canada`;
await db.collection('notifications').doc('result_73').set(
  { title, url: '/#match-73' },
  { merge: true }
);
console.log('updated notifications/result_73 ->', title);
console.log('done');
