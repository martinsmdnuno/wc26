import { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import BottomNav from './components/BottomNav';
import Schedule from './pages/Schedule';
import MyMatches from './pages/MyMatches';
import Teams from './pages/Teams';
import Bets from './pages/Bets';
import HamburgerMenu from './components/HamburgerMenu';
import NotificationCenter from './components/NotificationCenter';
import PoolSelector from './components/PoolSelector';
import PoolManager from './components/PoolManager';
import AuthScreen from './components/AuthScreen';
import InstallBanner from './components/InstallBanner';
import { useFavorites } from './hooks/useFavorites';
import { useLanguage } from './i18n/LanguageContext';
import { useAuth } from './hooks/useAuth';
import lazyWithReload from './utils/lazyWithReload';
import logo from './assets/logo.png';
import './App.css';

// Lazy-loaded pages — TeamProfile + Admin pull in the 48 team files / player
// index, so deferring them (and the rarely-first Rules/Missing) keeps the
// initial bundle light. lazyWithReload recovers from stale chunks after a deploy.
const TeamProfile = lazyWithReload(() => import('./pages/TeamProfile'));
const Admin = lazyWithReload(() => import('./pages/Admin'));
const Rules = lazyWithReload(() => import('./pages/Rules'));
const Missing = lazyWithReload(() => import('./pages/Missing'));

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;

export default function App() {
  const [page, setPage] = useState('schedule');
  const [animClass, setAnimClass] = useState('page-enter-done');
  const [teamIso, setTeamIso] = useState(null);
  const prevPageRef = useRef('schedule');
  const headerRef = useRef(null);
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { t } = useLanguage();
  const { user, profile, loading } = useAuth();
  const isAdmin = user?.uid && user.uid === ADMIN_UID;

  const navigate = useCallback((newPage) => {
    // Re-tapping the tab you're already on scrolls back to the top.
    if (newPage === page) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // Silent redirect for non-admin trying to access admin
    if (newPage === 'admin' && !isAdmin) {
      return;
    }
    setAnimClass('page-exit');
    setTimeout(() => {
      setPage(newPage);
      setAnimClass('page-enter');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimClass('page-enter-done');
        });
      });
    }, 150);
  }, [page, isAdmin]);

  const navigateToTeam = useCallback((iso) => {
    prevPageRef.current = page;
    setTeamIso(iso);
    setAnimClass('page-exit');
    setTimeout(() => {
      setPage('team');
      setAnimClass('page-enter');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimClass('page-enter-done');
        });
      });
    }, 150);
  }, [page]);

  const navigateBackFromTeam = useCallback(() => {
    navigate(prevPageRef.current);
  }, [navigate]);

  // Publish the (dynamic) header height as a CSS variable so sticky sub-bars
  // — e.g. the Bolão view chips — can stack right below it. The header grows a
  // row when the PoolSelector is shown, so we measure instead of hardcoding.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const apply = () =>
      document.documentElement.style.setProperty(
        '--header-h',
        `${el.offsetHeight}px`
      );
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [profile?.nickname]);

  // Handle #admin hash navigation
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#admin' && isAdmin) {
        setPage('admin');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="app">
        <div className="app-loading">
          <img src={logo} alt="Mundial 2026" className="app-header__logo" />
          <span className="app-loading__text">⚽</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header" ref={headerRef}>
        <div className="app-header__content">
          <div className="app-header__side app-header__side--left">
            {profile?.nickname && <HamburgerMenu onNavigate={navigate} />}
          </div>
          <div className="app-header__brand">
            <img src={logo} alt="Mundial 2026" className="app-header__logo" />
            <h1 className="app-header__title">
              <span className="app-header__mundial">{t('appTitle')}</span>{' '}
              <span className="app-header__year">{t('appYear')}</span>
            </h1>
          </div>
          <div className="app-header__side app-header__side--right">
            {profile?.nickname && <NotificationCenter />}
          </div>
        </div>
        {profile?.nickname && (
          <PoolSelector onManagePools={() => navigate('pools')} />
        )}
      </header>

      {!profile || !profile.nickname ? (
        <AuthScreen />
      ) : (
        <>
          <main className="app-main">
            <div className={`page-wrapper ${animClass}`}>
              <Suspense fallback={<div className="app-loading__text" style={{ textAlign: 'center', padding: 40 }}>⚽</div>}>
                {page === 'schedule' && <Schedule onTeamClick={navigateToTeam} />}
                {page === 'my-matches' && (
                  <MyMatches favorites={favorites} onNavigate={navigate} onTeamClick={navigateToTeam} />
                )}
                {page === 'teams' && (
                  <Teams
                    favorites={favorites}
                    toggleFavorite={toggleFavorite}
                    isFavorite={isFavorite}
                    onTeamClick={navigateToTeam}
                  />
                )}
                {page === 'bets' && <Bets onTeamClick={navigateToTeam} />}
                {page === 'team' && (
                  <TeamProfile
                    iso={teamIso}
                    onBack={navigateBackFromTeam}
                    onTeamClick={navigateToTeam}
                  />
                )}
                {page === 'pools' && <PoolManager />}
                {page === 'rules' && <Rules />}
                {page === 'missing' && <Missing />}
                {page === 'admin' && isAdmin && <Admin />}
              </Suspense>
            </div>
          </main>

          <InstallBanner />

          <BottomNav
            active={page === 'team' ? prevPageRef.current : page}
            onNavigate={navigate}
            favoriteCount={favorites.length}
          />
        </>
      )}
    </div>
  );
}
