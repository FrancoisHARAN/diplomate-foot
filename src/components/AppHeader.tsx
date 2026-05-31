import { Link } from 'react-router-dom';
import PlayerAvatar from './PlayerAvatar';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { useLiveMatches } from '../hooks/useLiveMatches';
import { getUserPointsMock } from '../utils/appState';
import { formatLastUpdated } from '../utils/date';

const AppHeader = () => {
  const { player } = usePlayerSession();
  const { matches, lastDataChangedAt, isFallback } = useLiveMatches();
  const points = player ? getUserPointsMock(matches) : 0;
  const updatedAt = formatLastUpdated(lastDataChangedAt);

  return (
    <header className="app-header">
      <Link to="/" className="brand-wrap" aria-label="Accueil Le Diplomate">
        <img className="header-logo" src={`${import.meta.env.BASE_URL}brand/logo-diplomate.png`} alt="" />
        <span>
          <strong>Le Diplomate</strong>
          <small>Dernière actu : {isFallback ? 'Coupe du Monde' : updatedAt ?? '--:--'}</small>
        </span>
      </Link>

      <Link className="account-chip" to={player ? '/mon-compte' : '/connexion'} aria-label={player ? 'Ouvrir mon compte' : 'Se connecter'}>
        <PlayerAvatar nickname={player?.nickname ?? '?'} avatarUrl={player?.avatarUrl} />
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
