import { useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useCachedScores } from '../hooks/useLiveScores';
import { resolveWinners, slotLabel, matchSlots, BRACKET_SIDES } from '../utils/knockout';

// Read-only ACTUAL tournament bracket, laid out as a classic two-sided knockout
// tree converging on the centre (final + champion). Teams fill in as group
// standings / knockout results become certain (reusing the same resolver as the
// calendar); undecided slots show a readable placeholder. Prediction bracket
// (points) stays in the Bolão. Layout/CSS validated as a prototype before port.
const OUTER_TO_INNER = ['r32', 'r16', 'qf', 'sf'];

const flag = (iso) => `https://flagcdn.com/w40/${iso}.png`;

export default function Bracket({ onTeamClick }) {
  const { t } = useLanguage();
  const scores = useCachedScores();
  const { teams, winners, champion } = useMemo(() => resolveWinners(scores), [scores]);

  const teamRow = (iso, raw, win, key) => {
    if (!iso) {
      return (
        <span key={key} className="kbr-t kbr-t--ph">
          <span className="kbr-fl" />
          <span className="kbr-name">{slotLabel(raw, t)}</span>
        </span>
      );
    }
    const isWin = win === iso;
    return (
      <button
        key={key}
        type="button"
        className={`kbr-t ${isWin ? 'kbr-t--win' : win ? 'kbr-t--out' : ''}`}
        onClick={() => onTeamClick?.(iso)}
        disabled={!onTeamClick}
      >
        <img src={flag(iso)} alt="" className="kbr-fl" />
        <span className="kbr-name">{t(`team.${iso}`)}</span>
      </button>
    );
  };

  const matchBox = (id) => {
    const [rawH, rawA] = matchSlots(id);
    const tt = teams[id] || {};
    const win = winners[id];
    return (
      <div className="kbr-box">
        {teamRow(tt.home, rawH, win, 'h')}
        {teamRow(tt.away, rawA, win, 'a')}
      </div>
    );
  };

  const renderSide = (sideKey) => {
    const half = BRACKET_SIDES[sideKey];
    let cols = OUTER_TO_INNER.map((ph) => ({ ph, ids: half[ph] || [] }));
    if (sideKey === 'right') cols = [...cols].reverse();
    return (
      <div className={`kbr-side kbr-side--${sideKey}`}>
        {cols.map(({ ph, ids }) => (
          <div key={ph} className="kbr-col">
            <div className="kbr-col-head">{t(`bracket.round.${ph}`)}</div>
            {ids.map((id, i) => (
              <div
                key={id}
                className={`kbr-m ${i % 2 === 0 ? 'kbr-m--top' : 'kbr-m--bot'}`
                  + `${ph !== 'sf' ? ' kbr-m--merge' : ''}${ph !== 'r32' ? ' kbr-m--recv' : ''}`}
              >
                {matchBox(id)}
                {ph !== 'sf' && <span className="kbr-lnk" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bracket">
      <p className="special__intro">{t('bracketActualIntro')}</p>

      <div className="kbr-board">
        {renderSide('left')}

        <div className="kbr-center">
          <div className="kbr-col-head kbr-final-head">{t('bracket.round.final')}</div>
          <div className="kbr-m kbr-final">{matchBox(BRACKET_SIDES.finalId)}</div>
          <div className={`kbr-champ ${champion ? '' : 'kbr-champ--empty'}`}>
            {champion ? (
              <>
                <img src={flag(champion)} alt="" className="kbr-fl" />
                <span className="kbr-name">{t(`team.${champion}`)}</span>
              </>
            ) : `🏆 ${t('bracketChampion')}`}
          </div>
        </div>

        {renderSide('right')}
      </div>
    </div>
  );
}
