import { useState, useMemo } from 'react';
import schedule from '../data/schedule.json';
import TeamCard from '../components/TeamCard';
import { useLanguage } from '../i18n/LanguageContext';

export default function Teams({ favorites, toggleFavorite, isFavorite }) {
  const [search, setSearch] = useState('');
  const { t } = useLanguage();

  const sorted = useMemo(() => {
    let teams = [...schedule.teams];
    if (search) {
      const q = search.toLowerCase();
      teams = teams.filter((team) => {
        const translatedName = t(`team.${team.iso}`);
        return translatedName.toLowerCase().includes(q) ||
               team.name.toLowerCase().includes(q);
      });
    }
    teams.sort((a, b) => {
      const aFav = favorites.includes(a.iso);
      const bFav = favorites.includes(b.iso);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      const aName = t(`team.${a.iso}`);
      const bName = t(`team.${b.iso}`);
      return aName.localeCompare(bName);
    });
    return teams;
  }, [search, favorites, t]);

  return (
    <div className="teams">
      <div className="teams__search-wrap">
        <input
          type="text"
          className="teams__search"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="teams__grid">
        {sorted.map((team, i) => (
          <TeamCard
            key={team.iso}
            team={team}
            isFav={isFavorite(team.iso)}
            onToggle={toggleFavorite}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
