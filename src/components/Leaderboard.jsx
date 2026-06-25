import { useState, useEffect, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { usePools } from '../hooks/usePools';
import { useLanguage } from '../i18n/LanguageContext';
import { defaultLeaderboardTab } from '../utils/phases';

// Each tab ranks by its own points field. 'total' is the headline ranking;
// 'group'/'knockout' come from match bets bucketed by phase; 'special' from
// tournament-wide special bets. Brackets fold into 'total' only.
const TABS = [
  { id: 'group', labelKey: 'lbTabGroup', field: 'groupPoints' },
  { id: 'knockout', labelKey: 'lbTabKnockout', field: 'knockoutPoints' },
  { id: 'special', labelKey: 'lbTabSpecial', field: 'specialPoints' },
  { id: 'total', labelKey: 'lbTabTotal', field: 'totalPoints' },
];

export default function Leaderboard() {
  const { user } = useAuth();
  const { activePoolId } = usePools();
  const { t } = useLanguage();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(defaultLeaderboardTab);
  const tabRefs = useRef([]);

  useEffect(() => {
    if (!activePoolId) return;
    let cancelled = false;
    (async () => {
      const snap = await getDocs(collection(db, 'pools', activePoolId, 'leaderboard'));
      if (cancelled) return;
      setEntries(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activePoolId]);

  if (loading) {
    return <div className="leaderboard__loading">{t('loading')}</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="leaderboard__empty">
        <span className="leaderboard__empty-icon">🏅</span>
        <p>{t('leaderboardEmpty')}</p>
      </div>
    );
  }

  const activeTab = TABS.find((tb) => tb.id === tab) || TABS[TABS.length - 1];
  const field = activeTab.field;

  // Rank by the active tab's field, falling back to total then accuracy so
  // ties resolve the same way the overall ranking does.
  const ranked = [...entries].sort((a, b) => {
    if ((b[field] || 0) !== (a[field] || 0)) return (b[field] || 0) - (a[field] || 0);
    if ((b.totalPoints || 0) !== (a.totalPoints || 0)) return (b.totalPoints || 0) - (a.totalPoints || 0);
    if ((b.exactResultsCount || 0) !== (a.exactResultsCount || 0)) return (b.exactResultsCount || 0) - (a.exactResultsCount || 0);
    return (b.correctOutcomeCount || 0) - (a.correctOutcomeCount || 0);
  });

  const medals = ['🥇', '🥈', '🥉'];

  // Roving-tabindex arrow navigation across the tab strip.
  const onTabKeyDown = (e, i) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = e.key === 'ArrowRight'
      ? (i + 1) % TABS.length
      : (i - 1 + TABS.length) % TABS.length;
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="leaderboard">
      <div className="leaderboard__tabs" role="tablist" aria-label={t('player')}>
        {TABS.map((tb, i) => (
          <button
            key={tb.id}
            ref={(el) => { tabRefs.current[i] = el; }}
            role="tab"
            id={`lb-tab-${tb.id}`}
            aria-selected={tb.id === tab}
            aria-controls="lb-panel"
            tabIndex={tb.id === tab ? 0 : -1}
            className={`leaderboard__tab ${tb.id === tab ? 'leaderboard__tab--active' : ''}`}
            onClick={() => setTab(tb.id)}
            onKeyDown={(e) => onTabKeyDown(e, i)}
          >
            {t(tb.labelKey)}
          </button>
        ))}
      </div>

      <div id="lb-panel" role="tabpanel" aria-labelledby={`lb-tab-${tab}`}>
        <div className="leaderboard__header">
          <span className="leaderboard__col leaderboard__col--pos">#</span>
          <span className="leaderboard__col leaderboard__col--name">{t('player')}</span>
          <span className="leaderboard__col leaderboard__col--exact">🎯</span>
          <span className="leaderboard__col leaderboard__col--pts">{t('pts')}</span>
        </div>

        {ranked.map((entry, i) => {
          const isMe = entry.uid === user?.uid;
          return (
            <div
              key={entry.uid}
              className={`leaderboard__row ${isMe ? 'leaderboard__row--me' : ''} ${i < 3 ? 'leaderboard__row--top' : ''}`}
            >
              <span className="leaderboard__col leaderboard__col--pos">
                {i < 3 ? medals[i] : i + 1}
              </span>
              <span className="leaderboard__col leaderboard__col--name">
                <span className="leaderboard__avatar">{entry.nickname?.charAt(0).toUpperCase()}</span>
                {entry.nickname}
                {isMe && <span className="leaderboard__me-badge">{t('you')}</span>}
              </span>
              <span className="leaderboard__col leaderboard__col--exact">
                {entry.exactResultsCount || 0}
              </span>
              <span className="leaderboard__col leaderboard__col--pts">
                {entry[field] || 0}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
