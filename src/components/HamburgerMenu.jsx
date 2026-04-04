import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../hooks/useAuth';

export default function HamburgerMenu({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();
  const { profile } = useAuth();

  const handleNav = (page) => {
    setOpen(false);
    onNavigate(page);
  };

  const handleShare = async () => {
    const code = profile?.groupCode;
    if (!code) return;

    const appUrl = window.location.origin + window.location.pathname;
    const text = t('shareMessage').replace('{code}', code).replace('{url}', appUrl);

    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // user cancelled share
      }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <button
        className="hamburger-btn"
        onClick={() => setOpen(!open)}
        aria-label="Menu"
      >
        <span className={`hamburger-icon ${open ? 'hamburger-icon--open' : ''}`}>
          <span />
          <span />
          <span />
        </span>
      </button>

      {open && <div className="hamburger-overlay" onClick={() => setOpen(false)} />}

      <div className={`hamburger-menu ${open ? 'hamburger-menu--open' : ''}`}>
        <button className="hamburger-menu__close" onClick={() => setOpen(false)} aria-label="Close menu">
          ✕
        </button>
        {profile && (
          <div className="hamburger-menu__profile">
            <span className="hamburger-menu__avatar">{profile.nickname?.charAt(0).toUpperCase()}</span>
            <div>
              <span className="hamburger-menu__nick">{profile.nickname}</span>
              <span className="hamburger-menu__group">{profile.groupCode}</span>
            </div>
          </div>
        )}

        <nav className="hamburger-menu__nav">
          <button className="hamburger-menu__item hamburger-menu__item--share" onClick={handleShare}>
            <span>📩</span> {copied ? t('copiedToClipboard') : t('inviteFriends')}
          </button>
          <button className="hamburger-menu__item" onClick={() => handleNav('missing')}>
            <span>👻</span> {t('navMissing')}
          </button>
        </nav>
      </div>
    </>
  );
}
