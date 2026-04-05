import { useState, useEffect } from 'react';
import {
  collection, getDocs, doc, deleteDoc, updateDoc, arrayRemove, writeBatch,
} from 'firebase/firestore';
import { db } from '../../firebase';
import ConfirmModal from '../../components/ConfirmModal';

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;

export default function UsersAdmin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          nickname: data.nickname || '—',
          email: data.email || '—',
          photoURL: data.photoURL || '',
          pools: data.pools || [],
          createdAt: data.createdAt,
          lastLoginAt: data.lastLoginAt,
          loginCount: data.loginCount || 0,
        };
      });
      setUsers(list.sort((a, b) => (b.loginCount || 0) - (a.loginCount || 0)));
      setLoading(false);
    })();
  }, []);

  const handleDelete = async (uid) => {
    setConfirm(null);
    setDeleting(true);
    try {
      const userDoc = users.find((u) => u.uid === uid);
      const poolIds = userDoc?.pools || [];

      // Remove user from all pools (members, leaderboard, bets)
      for (const poolId of poolIds) {
        await updateDoc(doc(db, 'pools', poolId), {
          members: arrayRemove(uid),
        });

        // Delete leaderboard entry
        try { await deleteDoc(doc(db, 'pools', poolId, 'leaderboard', uid)); } catch {}

        // Delete user's bets in this pool
        const betsSnap = await getDocs(collection(db, 'pools', poolId, 'bets'));
        const batch = writeBatch(db);
        let count = 0;
        betsSnap.docs.forEach((d) => {
          if (d.data().userId === uid) {
            batch.delete(d.ref);
            count++;
          }
        });
        if (count > 0) await batch.commit();
      }

      // Delete user doc
      await deleteDoc(doc(db, 'users', uid));
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
    setDeleting(false);
  };

  if (loading) return <div className="admin__section"><p className="admin__empty">A carregar...</p></div>;

  return (
    <div className="admin__section">
      <h3>Utilizadores ({users.length})</h3>
      <table className="admin__table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Bolões</th>
            <th>Logins</th>
            <th>Primeiro login</th>
            <th>Último login</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.uid}>
              <td style={{ fontWeight: 600 }}>
                {u.photoURL && (
                  <img
                    src={u.photoURL}
                    alt=""
                    style={{ width: 20, height: 20, borderRadius: '50%', verticalAlign: 'middle', marginRight: 6 }}
                  />
                )}
                {u.nickname}
              </td>
              <td>{u.email}</td>
              <td>{u.pools.length}</td>
              <td>{u.loginCount}</td>
              <td>{u.createdAt?.toDate?.()?.toLocaleDateString('pt-PT') || '—'}</td>
              <td>{u.lastLoginAt?.toDate?.()?.toLocaleDateString('pt-PT') || '—'}</td>
              <td>
                {u.uid !== ADMIN_UID && (
                  <button
                    className="admin__btn admin__btn--danger admin__btn--small"
                    onClick={() => setConfirm(u)}
                    disabled={deleting}
                  >
                    Apagar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {confirm && (
        <ConfirmModal
          title="Apagar utilizador"
          message={`Apagar "${confirm.nickname}" (${confirm.email})? Remove o utilizador de todos os bolões e apaga as suas apostas. Não pode ser desfeito.`}
          confirmLabel="Apagar"
          onConfirm={() => handleDelete(confirm.uid)}
          onCancel={() => setConfirm(null)}
          danger
        />
      )}
    </div>
  );
}
