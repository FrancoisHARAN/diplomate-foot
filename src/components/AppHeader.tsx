import { Link } from 'react-router-dom';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { getUserPointsMock } from '../utils/appState';

const AppHeader = () => {
  const { player } = usePlayerSession();
  const points = player ? getUserPointsMock() : 0;
  const initial = player?.nickname.charAt(0).toUpperCase() ?? '?';

  return (
    <header className="app-header">
      <Link to="/" className="brand-wrap" aria-label="Accueil Le Diplomate">
        <span className="brand-mark">LD</span>
        <span>
          <strong>Le Diplomate</strong>
          <small>Pronos 2026</small>
        </span>
      </Link>

      <Link className="account-chip" to={player ? '/mon-compte' : '/connexion'} aria-label={player ? 'Ouvrir mon compte' : 'Se connecter'}>
        <span className="avatar-dot">{initial}</span>
        <span className="account-text">
          {player ? (
            <>
              <strong>{player.nickname}</strong>
              <small>{points} pts</small>
            </>
          ) : (
            <>
              <strong>Compte</strong>
              <small>Connexion</small>
            </>
          )}
        </span>
      </Link>
    </header>
  );
};

export default AppHeader;
