import { useState, useCallback } from 'react';
import BottomNav from './components/BottomNav';
import Schedule from './pages/Schedule';
import MyMatches from './pages/MyMatches';
import Teams from './pages/Teams';
import Missing from './pages/Missing';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useFavorites } from './hooks/useFavorites';
import { useLanguage } from './i18n/LanguageContext';
import logo from './assets/logo.png';
import './App.css';

export default function App() {
  const [page, setPage] = useState('schedule');
  const [animClass, setAnimClass] = useState('page-enter-done');
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { t } = useLanguage();

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

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__content">
          <img src={logo} alt="Mundial 2026" className="app-header__logo" />
          <h1 className="app-header__title">
            <span className="app-header__mundial">{t('appTitle')}</span>{' '}
            <span className="app-header__year">{t('appYear')}</span>
          </h1>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="app-main">
        <div className={`page-wrapper ${animClass}`}>
          {page === 'schedule' && <Schedule />}
          {page === 'my-matches' && (
            <MyMatches favorites={favorites} onNavigate={navigate} />
          )}
          {page === 'teams' && (
            <Teams
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
            />
          )}
          {page === 'missing' && <Missing />}
        </div>
      </main>

      <BottomNav
        active={page}
        onNavigate={navigate}
        favoriteCount={favorites.length}
      />
    </div>
  );
}
