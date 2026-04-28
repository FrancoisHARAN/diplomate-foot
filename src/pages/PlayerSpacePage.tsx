import { Link, useNavigate } from 'react-router-dom';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { mockMatches } from '../data/mockMatches';
import { mockPlayers } from '../data/mockPlayers';
import { countUserPredictions, getStoredPredictions, getUserPointsMock, getUserRankMock } from '../utils/appState';

const PlayerSpacePage = () => {
  const navigate = useNavigate();
  const { player, logout } = usePlayerSession();

  if (!player) {
    return (
      <section className="empty-state">
        <strong>Mon compte</strong>
        <p>Connecte-toi pour voir ton score, ton rang et tes pronostics.</p>
        <Link className="btn primary" to="/connexion">Connexion</Link>
      </section>
    );
  }

  const playerData = mockPlayers.find((item) => item.id === player.id);
  const predictionByMatch = new Set(getStoredPredictions().filter((prediction) => prediction.playerId === player.id).map((prediction) => prediction.matchId));
  const toPredict = mockMatches.filter((match) => match.status !== 'finished' && !predictionByMatch.has(match.id)).length;

  return (
    <div className="screen-stack">
      <section className="profile-panel">
        <span className="avatar-dot xlarge">{player.nickname.charAt(0).toUpperCase()}</span>
        <div>
          <p className="eyebrow">Compte joueur</p>
          <h1>{player.nickname}</h1>
          <p>{getUserPointsMock()} pts · rang #{getUserRankMock()}</p>
        </div>
      </section>

      <section className="quick-stats">
        <article>
          <small>Pronos</small>
          <strong>{countUserPredictions()}</strong>
        </article>
        <article>
          <small>À faire</small>
          <strong>{toPredict}</strong>
        </article>
        <article>
          <small>Exacts</small>
          <strong>{playerData?.exactScores ?? 0}</strong>
        </article>
        <article>
          <small>Bons</small>
          <strong>{playerData?.correctResults ?? 0}</strong>
        </article>
      </section>

      <section className="action-list">
        <Link className="action-row" to="/mes-pronos">
          <span>Mes pronos</span>
          <strong>Ouvrir</strong>
        </Link>
        <Link className="action-row" to="/matchs">
          <span>Faire un prono</span>
          <strong>Matchs</strong>
        </Link>
        <Link className="action-row" to="/classement">
          <span>Classement du bar</span>
          <strong>Voir</strong>
        </Link>
        <Link className="action-row" to="/reglement">
          <span>Règlement</span>
          <strong>Lire</strong>
        </Link>
      </section>

      <button
        className="btn ghost danger"
        onClick={() => {
          logout();
          navigate('/');
        }}
        type="button"
      >
        Déconnexion
      </button>
    </div>
  );
};

export default PlayerSpacePage;
