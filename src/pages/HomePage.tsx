import { Link } from 'react-router-dom';
import MatchCard from '../components/MatchCard';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { mockMatches } from '../data/mockMatches';
import { mockPlayers } from '../data/mockPlayers';
import { buildStandings, countUserPredictions, getStoredPredictions, getUserPointsMock, getUserRankMock } from '../utils/appState';

const HomePage = () => {
  const { player } = usePlayerSession();
  const predictions = getStoredPredictions();
  const standings = buildStandings(mockPlayers, predictions, mockMatches);
  const nextMatches = mockMatches.filter((match) => match.status !== 'finished').slice(0, 3);
  const myMap = new Map(predictions.filter((prediction) => prediction.playerId === player?.id).map((prediction) => [prediction.matchId, prediction]));
  const openMatches = mockMatches.filter((match) => match.status === 'upcoming').length;
  const finishedMatches = mockMatches.filter((match) => match.status === 'finished').length;

  return (
    <div className="screen-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">LE DIPLOMATE</p>
          <h1>Pronos Coupe du Monde 2026</h1>
          <p className="hero-copy">Classement du bar, pronostics match par match, 50 € de conso pour le premier.</p>
        </div>
        <div className="hero-actions">
          <Link className="btn primary" to={player ? '/matchs' : '/connexion'}>{player ? 'Faire mes pronos' : 'Se connecter'}</Link>
          <Link className="btn ghost" to="/classement">Voir le classement</Link>
        </div>
      </section>

      <section className="quick-stats" aria-label="Résumé de la compétition">
        <article>
          <small>Mon score</small>
          <strong>{player ? `${getUserPointsMock()} pts` : 'Invité'}</strong>
        </article>
        <article>
          <small>Mon rang</small>
          <strong>{player ? `#${getUserRankMock()}` : '-'}</strong>
        </article>
        <article>
          <small>Ouverts</small>
          <strong>{openMatches}</strong>
        </article>
        <article>
          <small>Joués</small>
          <strong>{finishedMatches}</strong>
        </article>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">En direct</p>
            <h2>Classement du bar</h2>
          </div>
          <Link className="text-link" to="/classement">Voir tout</Link>
        </div>

        <div className="ranking-list compact">
          {standings.slice(0, 3).map((row) => (
            <article key={row.playerId} className={`ranking-row ${row.playerId === player?.id ? 'is-me' : ''}`}>
              <span className="rank-number">{row.position}</span>
              <span>
                <strong>{row.nickname}</strong>
                <small>{row.exactScores} scores exacts</small>
              </span>
              <strong>{row.points} pts</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">À jouer</p>
            <h2>Prochains matchs</h2>
          </div>
          <Link className="text-link" to="/matchs">Tous</Link>
        </div>
        <p className="helper-text">Clique sur un match pour faire ton prono.</p>
        <div className="match-list">
          {nextMatches.map((match) => <MatchCard key={match.id} match={match} prediction={myMap.get(match.id)} />)}
        </div>
      </section>

      <section className="account-panel">
        {player ? (
          <>
            <span className="avatar-dot large">{player.nickname.charAt(0).toUpperCase()}</span>
            <div>
              <h2>{player.nickname}</h2>
              <p>{countUserPredictions()} pronostics enregistrés · {getUserPointsMock()} pts</p>
            </div>
            <Link className="btn secondary" to="/mes-pronos">Mes pronos</Link>
          </>
        ) : (
          <>
            <span className="avatar-dot large">?</span>
            <div>
              <h2>Prêt à jouer ?</h2>
              <p>Connecte-toi avec le pseudo et le code donnés au comptoir.</p>
            </div>
            <Link className="btn secondary" to="/connexion">Connexion</Link>
          </>
        )}
      </section>

      <section className="rules-strip">
        <span>Score exact <strong>3 pts</strong></span>
        <span>Bon écart <strong>2 pts</strong></span>
        <span>Bon vainqueur <strong>1 pt</strong></span>
      </section>
    </div>
  );
};

export default HomePage;
