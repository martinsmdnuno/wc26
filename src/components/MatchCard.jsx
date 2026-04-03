function getFlagUrl(iso) {
  return `https://flagcdn.com/w80/${iso}.png`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-PT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function MatchCard({ match, isNext }) {
  const hasTeams = !!match.home_iso;
  const isKnockout = !hasTeams;

  return (
    <div className={`match-card ${isNext ? 'match-card--next' : ''}`}>
      {isNext && (
        <div className="match-card__next-badge">
          <span className="match-card__pulse" />
          Proximo Jogo
        </div>
      )}

      {match.group_label && (
        <span className="match-card__group">Grupo {match.group_label}</span>
      )}

      {match.label && isKnockout && (
        <span className="match-card__label">{match.label}</span>
      )}

      <div className="match-card__date">
        {formatDate(match.date)} &middot; {match.kickoff_bst}
      </div>

      <div className="match-card__teams">
        <div className="match-card__team">
          {hasTeams ? (
            <img
              src={getFlagUrl(match.home_iso)}
              alt={match.home}
              className="match-card__flag"
              loading="lazy"
            />
          ) : (
            <div className="match-card__flag-placeholder" />
          )}
          <span className="match-card__name">{match.home}</span>
        </div>

        <span className="match-card__vs">vs</span>

        <div className="match-card__team">
          {hasTeams ? (
            <img
              src={getFlagUrl(match.away_iso)}
              alt={match.away}
              className="match-card__flag"
              loading="lazy"
            />
          ) : (
            <div className="match-card__flag-placeholder" />
          )}
          <span className="match-card__name">{match.away}</span>
        </div>
      </div>
    </div>
  );
}
