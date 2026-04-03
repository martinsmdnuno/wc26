import { useState, useCallback } from 'react';
import BottomNav from './components/BottomNav';
import Schedule from './pages/Schedule';
import MyMatches from './pages/MyMatches';
import Teams from './pages/Teams';
import { useFavorites } from './hooks/useFavorites';
import './App.css';

export default function App() {
  const [page, setPage] = useState('schedule');
  const [animClass, setAnimClass] = useState('page-enter-done');
  const { favorites, toggleFavorite, isFavorite } = useFavorites();

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
        <h1 className="app-header__title">
          <span className="app-header__mundial">MUNDIAL</span>{' '}
          <span className="app-header__year">2026</span>
        </h1>
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
