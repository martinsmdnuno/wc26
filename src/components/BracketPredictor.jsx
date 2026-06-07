import { useState, useMemo } from 'react';
import Autocomplete from './Autocomplete';
import { useLanguage } from '../i18n/LanguageContext';
import { useBracket } from '../hooks/useBracket';
import { isSpecialLocked } from '../data/specialBets';
import {
  BRACKET, BRACKET_PHASES, PHASE_POINTS,
  matchTeams, candidatesFor, predictedAdvancers, scoreBracket, normalizePrediction,
} from '../data/bracket';

const PHASE_FEEDS = { r32: 'r16', r16: 'qf', qf: 'sf', sf: 'final', final: 'champion' };

function flag(iso) {
  return `https://flagcdn.com/w40/${iso}.png`;
}

export default function BracketPredictor() {
  const { t } = useLanguage();
  const { pred, results, loading, save } = useBracket();
  const [round, setRound] = useState('r32');

  const locked = isSpecialLocked();
  const resolved = !!results?.resolved;
  const teamName = (iso) => (iso ? t(`team.${iso}`) : null);

  const advancers = useMemo(() => predictedAdvancers(pred), [pred]);
  const score = useMemo(
    () => (resolved ? scoreBracket(pred, results.advancers) : null),
    [pred, results, resolved]
  );

  const phase = BRACKET.find((p) => p.id === round);

  const assignSlot = (matchId, key, iso) => {
    if (locked) return;
    const next = normalizePrediction({
      slots: { ...pred.slots, [`${matchId}${key}`]: iso || undefined },
      picks: pred.picks,
    });
    save(next);
  };

  const pickWinner = (matchId, iso) => {
    if (locked || !iso) return;
    const next = normalizePrediction({
      slots: pred.slots,
      picks: { ...pred.picks, [matchId]: iso },
    });
    save(next);
  };

  // Did a winner pick actually advance? (phase-based, matches the scoring.)
  const isCorrect = (phaseId, iso) => {
    if (!resolved || !iso) return false;
    const feed = PHASE_FEEDS[phaseId];
    if (feed === 'champion') return results.advancers?.champion === iso;
    return (results.advancers?.[feed] || []).includes(iso);
  };

  if (loading) return <div className="bets__loading">{t('loading')}</div>;

  const champion = advancers.champion;

  return (
    <div className="bracket">
      <p className="special__intro">{t('bracketIntro')}</p>
      <p className={`special__deadline ${locked ? 'special__deadline--locked' : ''}`}>
        {locked ? `🔒 ${t('specialLocked')}` : `⏳ ${t('specialDeadlineNote')}`}
      </p>

      <div className="bracket__champion">
        <span className="bracket__champion-label">🏆 {t('bracketChampion')}</span>
        {champion ? (
          <span className="bracket__champion-team">
            <img src={flag(champion)} alt="" className="bracket__flag" />
            {teamName(champion)}
            {resolved && (
              isCorrect('final', champion)
                ? <span className="bracket__pts">+{PHASE_POINTS.champion}</span>
                : <span className="bracket__pts bracket__pts--miss">✗</span>
            )}
          </span>
        ) : (
          <span className="bracket__champion-empty">{t('bracketPickToFinal')}</span>
        )}
      </div>

      {resolved && (
        <div className="bracket__score">{t('bracketYourScore')}: <strong>{score.points} {t('pts')}</strong></div>
      )}

      <div className="bracket__rounds">
        {BRACKET_PHASES.map((pid) => (
          <button
            key={pid}
            className={`bracket__round-chip ${round === pid ? 'bracket__round-chip--active' : ''}`}
            onClick={() => setRound(pid)}
          >
            {t(`bracket.round.${pid}`)}
          </button>
        ))}
      </div>

      <div className="bracket__matches">
        {phase.matches.map((m) => {
          const { home, away } = matchTeams(m, pred);
          const winner = pred.picks?.[m.id];

          const renderSide = (iso, source, key) => {
            // R32 empty group slot → picker.
            if (!iso && source?.type === 'group' && !locked) {
              return (
                <Autocomplete
                  options={candidatesFor(source)}
                  value={null}
                  onChange={(opt) => assignSlot(m.id, key, opt)}
                  placeholder={t('bracketPickTeam')}
                  emptyText="—"
                />
              );
            }
            if (!iso) {
              const wait = source?.type === 'winner' ? `${t('bracketWinnerOf')} ${source.match}` : '—';
              return <span className="bracket__slot-empty">{wait}</span>;
            }
            const isWinner = winner === iso;
            const correct = isCorrect(m.phase, iso);
            return (
              <button
                className={`bracket__team ${isWinner ? 'bracket__team--win' : ''} ${resolved && isWinner ? (correct ? 'bracket__team--ok' : 'bracket__team--bad') : ''}`}
                disabled={locked || !home || !away}
                onClick={() => pickWinner(m.id, iso)}
              >
                <img src={flag(iso)} alt="" className="bracket__flag" />
                <span className="bracket__team-name">{teamName(iso)}</span>
                {source?.type === 'group' && !locked && iso && (
                  <span
                    className="bracket__clear"
                    role="button"
                    aria-label="clear"
                    onClick={(e) => { e.stopPropagation(); assignSlot(m.id, key, null); }}
                  >✕</span>
                )}
                {isWinner && <span className="bracket__check">→</span>}
              </button>
            );
          };

          return (
            <div key={m.id} className="bracket__match">
              {renderSide(home, m.home, 'H')}
              <span className="bracket__vs">{t('vs')}</span>
              {renderSide(away, m.away, 'A')}
            </div>
          );
        })}
      </div>

      {!locked && <p className="bracket__hint">{t('bracketHint')}</p>}
    </div>
  );
}
