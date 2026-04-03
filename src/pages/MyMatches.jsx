import { useState, useMemo } from 'react';
import schedule from '../data/schedule.json';
import PhaseFilter from '../components/PhaseFilter';
import MatchCard from '../components/MatchCard';

export default function MyMatches({ favorites, onNavigate }) {
  const [activePhase, setActivePhase] = useState('group');

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
        <h2>Ainda nao segues nenhuma equipa</h2>
        <p>Vai a Equipas e escolhe a tua!</p>
        <button
          className="my-matches__empty-cta"
          onClick={() => onNavigate('teams')}
        >
          Escolher Equipas
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
        phases={schedule.phases}
        active={activePhase}
        onSelect={setActivePhase}
      />

      {filteredMatches.length === 0 ? (
        <div className="my-matches__no-results">
          <p>Nenhum jogo nesta fase para as tuas equipas.</p>
        </div>
      ) : (
        <div className="schedule__list">
          {Object.entries(matchesByDate).map(([date, matches]) => {
            const d = new Date(date + 'T00:00:00');
            const label = d.toLocaleDateString('pt-PT', {
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
