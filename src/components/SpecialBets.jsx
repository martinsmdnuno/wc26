import { useState } from 'react';
import Autocomplete from './Autocomplete';
import { useLanguage } from '../i18n/LanguageContext';
import { useSpecialBets } from '../hooks/useSpecialBets';
import { SPECIAL_CATEGORIES, SPECIAL_POINTS, isSpecialLocked } from '../data/specialBets';
import { optionsFor, lookupOption } from '../data/playerIndex';

export default function SpecialBets() {
  const { t } = useLanguage();
  const { picks, results, loading, savePick } = useSpecialBets();
  const [savingId, setSavingId] = useState(null);
  const [savedId, setSavedId] = useState(null);

  const locked = isSpecialLocked();

  const handleChange = async (categoryId, optionId) => {
    setSavingId(categoryId);
    setSavedId(null);
    try {
      await savePick(categoryId, optionId);
      setSavedId(categoryId);
      setTimeout(() => setSavedId((id) => (id === categoryId ? null : id)), 1500);
    } catch {
      // surfaced via logError inside the hook
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <div className="bets__loading">{t('loading')}</div>;
  }

  return (
    <div className="special">
      <p className="special__intro">{t('specialIntro')}</p>
      <p className={`special__deadline ${locked ? 'special__deadline--locked' : ''}`}>
        {locked ? `🔒 ${t('specialLocked')}` : `⏳ ${t('specialDeadlineNote')}`}
      </p>

      <div className="special__list">
        {SPECIAL_CATEGORIES.map((cat) => {
          const options = optionsFor(cat.kind);
          const myPickId = picks[cat.id] || null;
          const correctId = results?.picks?.[cat.id] || null;
          const resolved = !!(results?.resolved?.[cat.id] && correctId);
          const correctOpt = resolved ? lookupOption(cat.kind, correctId) : null;
          const myOpt = lookupOption(cat.kind, myPickId);
          const hit = resolved && myPickId && myPickId === correctId;

          return (
            <div
              key={cat.id}
              className={`special-card ${resolved ? (hit ? 'special-card--hit' : 'special-card--miss') : ''}`}
            >
              <div className="special-card__head">
                <span className="special-card__icon">{cat.icon}</span>
                <div className="special-card__titles">
                  <span className="special-card__label">{t(`special.${cat.id}.label`)}</span>
                  <span className="special-card__desc">{t(`special.${cat.id}.desc`)}</span>
                </div>
                <span className="special-card__points">+{SPECIAL_POINTS}</span>
              </div>

              {resolved ? (
                <div className="special-card__resolved">
                  <div className="special-card__row">
                    <span className="special-card__row-key">{t('specialYourPick')}</span>
                    <span className="special-card__row-val">
                      {myOpt ? myOpt.label : '—'}
                    </span>
                  </div>
                  <div className="special-card__row">
                    <span className="special-card__row-key">{t('specialCorrect')}</span>
                    <span className="special-card__row-val special-card__row-val--correct">
                      {correctOpt ? correctOpt.label : '—'}
                    </span>
                  </div>
                  <span className={`special-card__verdict ${hit ? 'special-card__verdict--hit' : 'special-card__verdict--miss'}`}>
                    {hit ? `✅ +${SPECIAL_POINTS} pts` : '❌ 0 pts'}
                  </span>
                </div>
              ) : (
                <div className="special-card__pick">
                  <Autocomplete
                    options={options}
                    value={myPickId}
                    onChange={(optId) => handleChange(cat.id, optId)}
                    disabled={locked}
                    placeholder={cat.kind === 'team' ? t('specialPickTeam') : t('specialPickPlayer')}
                    emptyText={t('specialNoPick')}
                  />
                  {savingId === cat.id && <span className="special-card__status">…</span>}
                  {savedId === cat.id && <span className="special-card__status special-card__status--ok">✓</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
