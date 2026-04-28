import { Link, useNavigate } from 'react-router-dom';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { mockMatches } from '../data/mockMatches';
import { mockPlayers } from '../data/mockPlayers';
import { countUserPredictions, getUserPointsMock, getUserRankMock } from '../utils/appState';

const PlayerSpacePage = () => {
  const navigate = useNavigate();
  const { player, logout } = usePlayerSession();

  if (!player) {
    return (
      <section className="card stack-sm">
        <h1>Mon compte</h1>
        <p>Tu n’es pas connecté.</p>
        <Link className="btn full" to="/connexion">Connexion</Link>
      </section>
    );
  }

  const playerData = mockPlayers.find((p) => p.id === player.id);
  const done = countUserPredictions();
  const toPredict = mockMatches.filter((m) => m.status !== 'finished').length - done;

  return (
    <div className="stack">
      <section className="card stack-sm">
        <h1>👤 {player.nickname}</h1>
        <p>{getUserPointsMock()} pts · Rang actuel : {getUserRankMock()}ème</p>
      </section>

      <section className="card stack-sm">
        <p>Pronostics faits : {done}</p>
        <p>Scores exacts : {playerData?.exactScores ?? 0}</p>
        <p>Bons résultats : {playerData?.correctResults ?? 0}</p>
        <p>Matchs à pronostiquer : {Math.max(toPredict, 0)}</p>
      </section>

      <section className="stack-sm">
        <Link className="btn full" to="/mes-pronos">Mes pronos</Link>
        <Link className="btn secondary full" to="/classement">Classement</Link>
        <Link className="btn secondary full" to="/reglement">Règlement</Link>
        <button
          className="btn secondary full"
          onClick={() => {
            logout();
            navigate('/');
          }}
          type="button"
        >
          Déconnexion
        </button>
      </section>
    </div>
  );
};

export default PlayerSpacePage;
