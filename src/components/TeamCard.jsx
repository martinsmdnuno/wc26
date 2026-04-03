function getFlagUrl(iso) {
  return `https://flagcdn.com/w80/${iso}.png`;
}

export default function TeamCard({ team, isFav, onToggle }) {
  return (
    <div className="team-card">
      <img
        src={getFlagUrl(team.iso)}
        alt={team.name}
        className="team-card__flag"
        loading="lazy"
      />
      <span className="team-card__name">{team.name}</span>
      <span className="team-card__group">Grupo {team.group}</span>
      <button
        className={`team-card__fav ${isFav ? 'team-card__fav--active' : ''}`}
        onClick={() => onToggle(team.iso)}
        aria-label={isFav ? 'Remover favorito' : 'Adicionar favorito'}
      >
        {isFav ? '★' : '☆'}
      </button>
    </div>
  );
}
