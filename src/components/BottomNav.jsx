import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';

// iOS Safari anchors position:fixed elements to the visual viewport, so the
// keyboard pushes the nav to the middle of the screen, over the content.
// While the keyboard is open the nav is useless anyway — hide it.
//
// The hidden state is anchored to whether a text field is actually focused, not
// just to the viewport height. On an installed iOS PWA the visualViewport
// `resize` doesn't fire reliably when the keyboard dismisses (e.g. the focused
// input is unmounted as a modal closes), which used to leave the nav stuck
// hidden forever. Keying off `focusout` guarantees it always comes back.
const isTextField = (el) =>
  !!el && typeof el.matches === 'function' &&
  el.matches('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), textarea, [contenteditable=""], [contenteditable=true]');

function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const focused = isTextField(document.activeElement);
        const vv = window.visualViewport;
        const shrunk = vv ? window.innerHeight - vv.height > 150 : false;
        // Hide only while a text field holds focus AND the viewport shrank.
        // Either condition dropping (notably focus on close) brings the nav back.
        setOpen(focused && shrunk);
      });
    };

    window.visualViewport?.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      cancelAnimationFrame(raf);
      window.visualViewport?.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, []);

  return open;
}

export default function BottomNav({ active, onNavigate, favoriteCount }) {
  const { t } = useLanguage();
  const keyboardOpen = useKeyboardOpen();
  const reduceMotion = useReducedMotion();

  const tabs = [
    { id: 'schedule', label: t('navSchedule'), icon: '🏆' },
    { id: 'teams', label: t('navTeams'), icon: '🌍' },
    { id: 'bets', label: t('navBets'), icon: '🎯' },
    { id: 'my-matches', label: t('navMyMatches'), icon: '⭐' },
  ];

  return (
    <nav className={`bottom-nav ${keyboardOpen ? 'bottom-nav--keyboard-open' : ''}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`bottom-nav__tab ${active === tab.id ? 'bottom-nav__tab--active' : ''}`}
          onClick={() => onNavigate(tab.id)}
        >
          <span className="bottom-nav__icon">{tab.icon}</span>
          {tab.id === 'my-matches' && favoriteCount > 0 && (
            <motion.span
              className="bottom-nav__badge"
              initial={reduceMotion ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              key={favoriteCount}
            >
              {favoriteCount}
            </motion.span>
          )}
          <span className="bottom-nav__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
