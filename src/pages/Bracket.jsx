import { useMemo } from 'react';
import schedule from '../data/schedule.json';
import { useLanguage } from '../i18n/LanguageContext';
import { useCachedScores } from '../hooks/useLiveScores';
import { resolveWinners, slotLabel } from '../utils/knockout';

// Read-only view of the ACTUAL tournament bracket (distinct from the prediction
// bracket in the Bolão). Teams fill in as group standings / knockout results
// become certain — reusing the same resolver as the calendar. Slots that aren't
// decided yet show a human-readable placeholder ("1.º Grupo A", "Venc. jogo 73").
const PHASES = ['r32', 'r16', 'qf', 'sf', 'final'];
const phaseById = Object.fromEntries(schedule.phases.map((p) => [p.id, p]));

const flag = (iso) => `https://flagcdn.com/w40/${iso}.png`;

export default function Bracket({ onTeamClick }) {
  const { t } = useLanguage();
  const scores = useCachedScores();
  const { teams, winners, champion } = useMemo(() => resolveWinners(scores), [scores]);

  const teamName = (iso) => t(`team.${iso}`);

  const renderSlot = (iso, raw, win) => {
    if (!iso) {
      return <div className="bkt-slot bkt-slot--empty">{slotLabel(raw, t)}</div>;
    }
    const isWin = win === iso;
    const stateCls = isWin ? 'bkt-slot--win' : win ? 'bkt-slot--out' : '';
    return (
      <div className={`bkt-slot ${stateCls}`}>
        <button
          type="button"
          className="bkt-slot-btn"
          onClick={() => onTeamClick?.(iso)}
          disabled={!onTeamClick}
        >
          <img src={flag(iso)} alt="" className="bkt-flag" />
          <span className="bkt-name">{teamName(iso)}</span>
          {isWin && <span className="bkt-adv">→</span>}
        </button>
      </div>
    );
  };

  return (
    <div className="bracket">
      <p className="special__intro">{t('bracketActualIntro')}</p>

      <div className="bkt-board">
        {PHASES.map((pid) => (
          <div key={pid} className="bkt-col">
            <div className="bkt-col-head">{t(`bracket.round.${pid}`)}</div>
            <div className="bkt-col-body">
              {(phaseById[pid]?.matches || []).map((m) => {
                const resolved = teams[m.id] || {};
                const win = winners[m.id];
                return (
                  <div key={m.id} className="bkt-match">
                    {renderSlot(resolved.home, m.home, win)}
                    {renderSlot(resolved.away, m.away, win)}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="bkt-col bkt-col--champ">
          <div className="bkt-col-head">🏆</div>
          <div className="bkt-col-body">
            <div className={`bkt-champ ${champion ? '' : 'bkt-champ--empty'}`}>
              {champion ? (
                <>
                  <img src={flag(champion)} alt="" className="bkt-flag" />
                  <span className="bkt-name">{teamName(champion)}</span>
                </>
              ) : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
