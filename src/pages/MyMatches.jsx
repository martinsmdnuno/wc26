import { useState, useMemo } from 'react';
import schedule from '../data/schedule.json';
import PhaseFilter from '../components/PhaseFilter';
import MatchCard from '../components/MatchCard';
import { useLanguage } from '../i18n/LanguageContext';

export default function MyMatches({ favorites, onNavigate }) {
  const [activePhase, setActivePhase] = useState('group');
  const { t } = useLanguage();

  const translatedPhases = useMemo(
    () => schedule.phases.map((p) => ({ ...p, name: t(`phase.${p.id}`) })),
    [t]
  );

  const filteredMatches = useMemo(() => {
    if (favorites.length === 0) return [];
    const phase = schedule.phases.find((p) => p.id === activePhase);
    if (!phase) return [];
    return phase.matches.filter(
      (m) =>
        favorites.includes(m.home_iso) || favorites.includes(m.away_iso)
    );
  }, [favorites, activePhase]);

  if (favorites.length === 0) {
    return (
      <div className="my-matches__empty">
        <span className="my-matches__empty-icon">⭐</span>
        <h2>{t('emptyTitle')}</h2>
        <p>{t('emptyDescription')}</p>
        <button
          className="my-matches__empty-cta"
          onClick={() => onNavigate('teams')}
        >
          {t('emptyCta')}
        </button>
      </div>
    );
  }

  const matchesByDate = {};
  for (const match of filteredMatches) {
    if (!matchesByDate[match.date]) matchesByDate[match.date] = [];
    matchesByDate[match.date].push(match);
  }

  return (
    <div className="my-matches">
      <PhaseFilter
        phases={translatedPhases}
        active={activePhase}
        onSelect={setActivePhase}
      />

      {filteredMatches.length === 0 ? (
        <div className="my-matches__no-results">
          <p>{t('noMatchesInPhase')}</p>
        </div>
      ) : (
        <div className="schedule__list">
          {Object.entries(matchesByDate).map(([date, matches]) => {
            const d = new Date(date + 'T00:00:00');
            const label = d.toLocaleDateString(t('dateLocale'), {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            });
            return (
              <div key={date} className="schedule__day">
                <h3 className="schedule__day-label">{label}</h3>
                {matches.map((match, i) => (
                  <MatchCard key={match.id} match={match} index={i} />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
