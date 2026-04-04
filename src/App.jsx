import { useState, useCallback, useRef } from 'react';
import BottomNav from './components/BottomNav';
import Schedule from './pages/Schedule';
import MyMatches from './pages/MyMatches';
import Teams from './pages/Teams';
import Missing from './pages/Missing';
import Bets from './pages/Bets';
import Rules from './pages/Rules';
import TeamProfile from './pages/TeamProfile';
import HamburgerMenu from './components/HamburgerMenu';
import PoolSelector from './components/PoolSelector';
import PoolManager from './components/PoolManager';
import NicknameModal from './components/NicknameModal';
import LanguageSwitcher from './components/LanguageSwitcher';
import InstallBanner from './components/InstallBanner';
import { useFavorites } from './hooks/useFavorites';
import { useLanguage } from './i18n/LanguageContext';
import { useAuth } from './hooks/useAuth';
import logo from './assets/logo.png';
import './App.css';

export default function App() {
  const [page, setPage] = useState('schedule');
  const [animClass, setAnimClass] = useState('page-enter-done');
  const [teamIso, setTeamIso] = useState(null);
  const prevPageRef = useRef('schedule');
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { t } = useLanguage();
  const { profile, loading } = useAuth();

  const navigate = useCallback((newPage) => {
    if (newPage === page) return;
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
  }, [page]);

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
      <header className="app-header">
        <div className="app-header__content">
          {profile && <HamburgerMenu onNavigate={navigate} />}
          <img src={logo} alt="Mundial 2026" className="app-header__logo" />
          <h1 className="app-header__title">
            <span className="app-header__mundial">{t('appTitle')}</span>{' '}
            <span className="app-header__year">{t('appYear')}</span>
          </h1>
          <LanguageSwitcher />
        </div>
        {profile && (
          <PoolSelector onManagePools={() => navigate('pools')} />
        )}
      </header>

      {!profile ? (
        <NicknameModal />
      ) : (
        <>
          <main className="app-main">
            <div className={`page-wrapper ${animClass}`}>
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
