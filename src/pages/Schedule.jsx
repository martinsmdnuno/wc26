import { useState, useMemo, useRef, useEffect } from 'react';
import schedule from '../data/schedule.json';
import PhaseFilter from '../components/PhaseFilter';
import MatchCard from '../components/MatchCard';
import { useLanguage } from '../i18n/LanguageContext';
import TimezoneNote from '../components/TimezoneNote';
import { compareKickoff, groupMatchesByDate } from '../utils/matchOrder';
import { kickoffMs } from '../utils/matchTime';
import { useCachedScores } from '../hooks/useLiveScores';

function getNextMatchId(matches) {
  const now = Date.now();
  for (const match of [...matches].sort(compareKickoff)) {
    const ms = kickoffMs(match);
    if (ms != null && ms > now) return match.id;
  }
  return null;
}

// YYYY-MM-DD for "now" in the viewer's timezone — matches the day keys from
// groupMatchesByDate so we can scroll to today's fixtures.
function todayKey() {
  const now = new Date();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const da = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mo}-${da}`;
}

export default function Schedule({ onTeamClick }) {
  const [activePhase, setActivePhase] = useState('group');
  const { t } = useLanguage();
  const cachedScores = useCachedScores();

  const translatedPhases = useMemo(
    () => schedule.phases.map((p) => ({ ...p, name: t(`phase.${p.id}`) })),
    [t]
  );

  const phase = schedule.phases.find((p) => p.id === activePhase);
  const allGroupMatches = schedule.phases.find((p) => p.id === 'group')?.matches || [];
  const nextMatchId = useMemo(() => getNextMatchId(allGroupMatches), []);

  const matchesByDate = useMemo(
    () => (phase ? groupMatchesByDate(phase.matches) : {}),
    [phase]
  );

  // Stop auto-pinning the moment the user scrolls/zooms themselves. wheel /
  // touchmove / keydown only fire on real interaction — programmatic
  // scrollIntoView below does not — so this never fights the user.
  const dayRefs = useRef({});
  const userTookOverRef = useRef(false);
  useEffect(() => {
    const takeOver = () => { userTookOverRef.current = true; };
    const opts = { passive: true };
    window.addEventListener('wheel', takeOver, opts);
    window.addEventListener('touchmove', takeOver, opts);
    window.addEventListener('keydown', takeOver);
    return () => {
      window.removeEventListener('wheel', takeOver, opts);
      window.removeEventListener('touchmove', takeOver, opts);
      window.removeEventListener('keydown', takeOver);
    };
  }, []);

  // Land on today's fixtures and keep them pinned to the top. Day keys are
  // chronological, so the target is the first day that is today-or-later
  // (falling back to the last day once the phase is over). This re-runs when
  // cachedScores arrives: those async results add goal-scorer rows to earlier
  // days, growing the content above today and pushing it down — re-pinning
  // after that layout shift keeps today at the top instead of the bottom.
  useEffect(() => {
    if (userTookOverRef.current || activePhase !== 'group') return;
    const dayKeys = Object.keys(matchesByDate);
    if (dayKeys.length === 0) return;

    const today = todayKey();
    const idx = dayKeys.findIndex((k) => k >= today);
    if (idx === 0) return; // first day is today/future → already at the top
    const target = idx === -1 ? dayKeys[dayKeys.length - 1] : dayKeys[idx];

    const el = dayRefs.current[target];
    if (el) {
      requestAnimationFrame(() => {
        if (!userTookOverRef.current) el.scrollIntoView({ block: 'start' });
      });
    }
  }, [matchesByDate, activePhase, cachedScores]);

  return (
    <div className="schedule">
      <PhaseFilter
        phases={translatedPhases}
        active={activePhase}
        onSelect={setActivePhase}
      />

      <TimezoneNote />

      <div className="schedule__list">
        {Object.entries(matchesByDate).map(([date, matches]) => {
          const d = new Date(date + 'T00:00:00');
          const label = d.toLocaleDateString(t('dateLocale'), {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          });

          return (
            <div
              key={date}
              className="schedule__day"
              ref={(el) => {
                if (el) dayRefs.current[date] = el;
                else delete dayRefs.current[date];
              }}
            >
              <h3 className="schedule__day-label">{label}</h3>
              {matches.map((match, i) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  matchScore={cachedScores[String(match.id)]}
                  isNext={match.id === nextMatchId && activePhase === 'group'}
                  showCalButton
                  onTeamClick={onTeamClick}
                  index={i}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
