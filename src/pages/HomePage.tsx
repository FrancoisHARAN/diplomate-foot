import { Link } from 'react-router-dom';
import MatchCard from '../components/MatchCard';
import PlayerAvatar from '../components/PlayerAvatar';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { mockPlayers } from '../data/mockPlayers';
import { useLiveMatches } from '../hooks/useLiveMatches';
import { buildStandings, countUserPredictions, getStoredPredictions, getUserPointsMock, getUserRankMock } from '../utils/appState';

const HomePage = () => {
  const { player } = usePlayerSession();
  const { matches } = useLiveMatches();
  const predictions = getStoredPredictions();
  const standings = buildStandings(mockPlayers, predictions, matches);
  const nextMatches = matches.filter((match) => match.status !== 'finished').slice(0, 3);
  const myMap = new Map(predictions.filter((prediction) => prediction.playerId === player?.id).map((prediction) => [prediction.matchId, prediction]));
  const openMatches = matches.filter((match) => match.status === 'upcoming').length;
  const liveMatches = matches.filter((match) => match.status === 'live').length;

  return (
    <div className="screen-stack">
      <section className="hero-panel">
        <div className="hero-content">
          <p className="eyebrow">Le Diplomate</p>
          <h1>Prono foot</h1>
          <p className="hero-copy">Classement du bar, vrais matchs à venir et boosters sur les affiches chaudes.</p>
          <div className="hero-actions">
            <Link className="btn primary" to={player ? '/matchs' : '/connexion'}>{player ? 'Faire mes pronos' : 'Se connecter'}</Link>
            <Link className="btn ghost" to="/classement">Classement</Link>
          </div>
        </div>
        <div className="hero-players" aria-hidden="true">
          <img className="hero-player mbappe" src={`${import.meta.env.BASE_URL}players/mbappe.png`} alt="" />
          <img className="hero-player dembele" src={`${import.meta.env.BASE_URL}players/dembele.jpg`} alt="" />
          <img className="hero-player olise" src={`${import.meta.env.BASE_URL}players/olise.png`} alt="" />
        </div>
      </section>

      <section className="prize-panel">
        <article>
          <span>1</span>
          <strong>20 €</strong>
          <small>conso au bar</small>
        </article>
        <article>
          <span>2</span>
          <strong>Pizza</strong>
          <small>au Diplomate</small>
        </article>
        <article>
          <span>3</span>
          <strong>Saucisson</strong>
          <small>à partager</small>
        </article>
      </section>

      <section className="quick-stats" aria-label="Résumé de la compétition">
        <article>
          <small>Mon score</small>
          <strong>{player ? `${getUserPointsMock(matches)} pts` : 'Invité'}</strong>
        </article>
        <article>
          <small>Mon rang</small>
          <strong>{player ? `#${getUserRankMock(matches)}` : '-'}</strong>
        </article>
        <article>
          <small>Ouverts</small>
          <strong>{openMatches}</strong>
        </article>
        <article>
          <small>Live</small>
          <strong>{liveMatches}</strong>
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
            <Link key={row.playerId} to={`/joueurs/${row.playerId}`} className={`ranking-row ${row.playerId === player?.id ? 'is-me' : ''}`}>
              <span className="rank-number">{row.position}</span>
              <PlayerAvatar nickname={row.nickname} avatarUrl={row.avatarUrl} />
              <span>
                <strong>{row.nickname}</strong>
                <small>{row.exactScores} scores exacts</small>
              </span>
              <strong>{row.points} pts</strong>
            </Link>
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
        <div className="match-list">
          {nextMatches.map((match) => <MatchCard key={match.id} match={match} prediction={myMap.get(match.id)} />)}
        </div>
      </section>

      <section className="account-panel">
        {player ? (
          <>
            <PlayerAvatar nickname={player.nickname} avatarUrl={player.avatarUrl} size="large" />
            <div>
              <h2>{player.nickname}</h2>
              <p>{countUserPredictions()} pronostics enregistrés · {getUserPointsMock(matches)} pts</p>
            </div>
            <Link className="btn secondary" to="/mes-pronos">Mes pronos</Link>
          </>
        ) : (
          <>
            <PlayerAvatar nickname="?" size="large" />
            <div>
              <h2>Prêt à jouer ?</h2>
              <p>Connecte-toi avec le pseudo et le code donnés au comptoir.</p>
            </div>
            <Link className="btn secondary" to="/connexion">Connexion</Link>
          </>
        )}
      </section>
    </div>
  );
};

export default HomePage;
