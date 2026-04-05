import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

export default function UsersAdmin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
