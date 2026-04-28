import { Link } from 'react-router-dom';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { getUserPointsMock } from '../utils/appState';

const AppHeader = () => {
  const { player } = usePlayerSession();
  const points = player ? getUserPointsMock() : 0;

  return (
    <header className="app-header">
      <Link to="/" className="brand-wrap" aria-label="Accueil Le Diplomate">
        <p className="brand">Le Diplomate</p>
        <p className="subtitle">Pronos 2026</p>
      </Link>

      <Link className="account-chip" to={player ? '/mon-compte' : '/connexion'}>
        <span className="account-icon">👤</span>
        {!player ? <span>Connexion</span> : <span>{player.nickname} · {points} pts</span>}
      </Link>
    </header>
  );
};

export default AppHeader;
