import { Link } from 'react-router-dom';
import MatchCard from '../components/MatchCard';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { mockMatches } from '../data/mockMatches';
import { mockPlayers } from '../data/mockPlayers';
import { countUserPredictions, getStoredPredictions, getUserPointsMock, getUserRankMock } from '../utils/appState';

const HomePage = () => {
  const { player } = usePlayerSession();
  const upcoming = mockMatches.filter((match) => match.status !== 'finished').slice(0, 4);
  const predictions = getStoredPredictions();
  const myMap = new Map(predictions.filter((p) => p.playerId === player?.id).map((p) => [p.matchId, p]));

  return (
    <div className="stack">
      <section className="card stack-sm">
        <p className="hero-brand">LE DIPLOMATE</p>
        <h1>Pronos Coupe du Monde 2026</h1>
        <p className="prize-badge">1er prix : 50 €</p>
        {!player ? <Link className="btn full" to="/connexion">Se connecter</Link> : <p>Salut {player.nickname} · {getUserPointsMock()} pts</p>}
      </section>

      <section className="card stack-sm">
        <div className="row-between">
          <h2>Classement en direct</h2>
          <Link className="btn small secondary" to="/classement">Voir tout</Link>
        </div>
        <div className="stack-sm">
          {mockPlayers.slice(0, 3).map((p, idx) => (
            <div key={p.id} className="mini-rank-card">
              <strong>{idx + 1}. {p.nickname}</strong>
              <span>{p.points} pts</span>
            </div>
          ))}
        </div>
        {player ? <p>Ton rang : {getUserRankMock()}ème · {getUserPointsMock()} pts</p> : null}
      </section>

      <section className="stack-sm">
        <h2>Prochains matchs</h2>
        {upcoming.map((match) => <MatchCard key={match.id} match={match} prediction={myMap.get(match.id)} />)}
      </section>

      {!player ? (
        <section className="card stack-sm">
          <h2>Prêt à jouer ?</h2>
          <p>Connecte-toi avec ton pseudo et ton code donné au bar.</p>
          <Link className="btn full" to="/connexion">Connexion</Link>
        </section>
      ) : (
        <section className="card stack-sm">
          <h2>Ton espace</h2>
          <p>{player.nickname} · {getUserPointsMock()} pts</p>
          <p>{countUserPredictions()} pronostics faits</p>
          <Link className="btn full" to="/mes-pronos">Voir mes pronos</Link>
        </section>
      )}

      <section className="card stack-sm">
        <h2>Règles rapides</h2>
        <p>Score exact : 3 pts</p>
        <p>Bon écart : 2 pts</p>
        <p>Bon vainqueur : 1 pt</p>
        <Link className="btn secondary full" to="/reglement">Règlement</Link>
      </section>
    </div>
  );
};

export default HomePage;
