import { Link, useNavigate } from 'react-router-dom';
import { usePlayerSession } from '../context/PlayerSessionContext';

const Header = () => {
  const navigate = useNavigate();
  const { player, logout } = usePlayerSession();

  return (
    <header className="app-header">
      <p className="brand">Le Diplomate</p>
      <h1>Pronos Coupe du Monde 2026</h1>

      <div className="card auth-banner">
        {!player ? (
          <Link to="/connexion" className="btn">
            Connexion
          </Link>
        ) : (
          <>
            <p>
              Connecté : <strong>{player.nickname}</strong>
            </p>
            <div className="auth-actions">
              <Link to="/mes-pronos" className="btn secondary">
                Mes pronos
              </Link>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  logout();
                  navigate('/connexion');
                }}
              >
                Déconnexion
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
