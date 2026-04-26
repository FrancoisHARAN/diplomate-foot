import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { matchService } from '../services/matchService';
import { playerService } from '../services/playerService';
import { predictionService } from '../services/predictionService';

const AppHeader = () => {
  const { player, refreshPlayer } = usePlayerSession();
  const [points, setPoints] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!player) return setPoints(0);
      const [predictions, matches] = await Promise.all([
        predictionService.getPredictionsForPlayer(player.id),
        matchService.getAll(),
      ]);
      const byId = new Map(matches.map((match) => [match.id, match]));
      const total = predictions.reduce((sum, prediction) => {
        const match = byId.get(prediction.matchId);
        return match ? sum + predictionService.calculatePointsForPrediction(prediction, match) : sum;
      }, 0);
      setPoints(total);
    };
    void load();
  }, [player]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const accountItems = useMemo(
    () => [
      { to: '/mon-compte', label: 'Mon profil' },
      { to: '/mes-pronos', label: 'Mes pronostics' },
      { to: '/aide', label: 'Aide' },
    ],
    [],
  );

  return (
    <header className="app-header">
      <Link to="/" className="brand-wrap" aria-label="Accueil Le Diplomate">
        <p className="brand">Le Diplomate</p>
        <p className="subtitle">Pronos 2026</p>
      </Link>

      <nav className="header-nav" aria-label="Navigation principale">
        {[
          { to: '/', label: 'Accueil' },
          { to: '/matchs', label: 'Matchs' },
          { to: '/classements', label: 'Classements' },
          { to: '/aide', label: 'Aide' },
        ].map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `header-link ${isActive ? 'active' : ''}`}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="header-actions" ref={menuRef}>
        <Link className="btn small secondary" to="/matchs" aria-label="Pronostiquer maintenant">
          Pronostiquer
        </Link>

        {!player ? (
          <div className="guest-actions">
            <Link className="account-chip" to="/connexion">Se connecter</Link>
          </div>
        ) : (
          <div className="avatar-menu-wrap">
            <button type="button" className="avatar-trigger" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen}>
              <span className="account-icon">👤</span>
              <span>{player.nickname} · {points} pts</span>
            </button>
            {menuOpen ? (
              <div className="avatar-menu" role="menu">
                {accountItems.map((item) => (
                  <Link key={item.to} to={item.to} role="menuitem" onClick={() => setMenuOpen(false)}>
                    {item.label}
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={async () => {
                    await playerService.logout();
                    refreshPlayer();
                    setMenuOpen(false);
                  }}
                >
                  Déconnexion
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
