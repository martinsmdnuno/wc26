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

// Only auto-scroll once per app load, so returning to the tab doesn't yank the
// view back to today after the user has scrolled away.
let didInitialScroll = false;

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

  // Land on today's fixtures when the app opens. Day keys are chronological, so
  // the target is the first day that is today-or-later (falling back to the last
  // day once the phase is over). Skips when today is before the first day so we
  // don't jump past the header needlessly.
  const dayRefs = useRef({});
  useEffect(() => {
    if (didInitialScroll || activePhase !== 'group') return;
    const dayKeys = Object.keys(matchesByDate);
    if (dayKeys.length === 0) return;

    const today = todayKey();
    const idx = dayKeys.findIndex((k) => k >= today);
    const target = idx === -1 ? dayKeys[dayKeys.length - 1] : dayKeys[idx];

    didInitialScroll = true;
    if (idx === 0) return; // already at/near the top
    const el = dayRefs.current[target];
    if (el) {
      requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
    }
  }, [matchesByDate, activePhase]);

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
