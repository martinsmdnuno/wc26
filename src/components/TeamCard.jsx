import { useLanguage } from '../i18n/LanguageContext';

function getFlagUrl(iso) {
  return `https://flagcdn.com/w80/${iso}.png`;
}

export default function TeamCard({ team, isFav, onToggle }) {
  const { t } = useLanguage();
  const teamName = t(`team.${team.iso}`);

  return (
    <div className="team-card">
      <img
        src={getFlagUrl(team.iso)}
        alt={teamName}
        className="team-card__flag"
        loading="lazy"
      />
      <span className="team-card__name">{teamName}</span>
      <span className="team-card__group">{t('group')} {team.group}</span>
      <button
        className={`team-card__fav ${isFav ? 'team-card__fav--active' : ''}`}
        onClick={() => onToggle(team.iso)}
        aria-label={isFav ? t('removeFavourite') : t('addFavourite')}
      >
        {isFav ? '★' : '☆'}
      </button>
    </div>
  );
}
