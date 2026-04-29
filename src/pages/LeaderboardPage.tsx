import { Link } from 'react-router-dom';
import PlayerAvatar from '../components/PlayerAvatar';
import PrizePanel from '../components/PrizePanel';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { mockPlayers } from '../data/mockPlayers';
import { useLiveMatches } from '../hooks/useLiveMatches';
import { buildStandings, getStoredPredictions, samePlayerId } from '../utils/appState';

const LeaderboardPage = () => {
  const { player } = usePlayerSession();
  const { matches } = useLiveMatches();
  const standings = buildStandings(mockPlayers, getStoredPredictions(), matches);
  const me = standings.find((row) => samePlayerId(row.playerId, player?.id));

  return (
    <div className="screen-stack">
      <section className="page-hero">
        <p className="eyebrow">En direct</p>
        <h1>Classement</h1>
        <p>Le podium final repart avec les lots du Diplomate.</p>
      </section>

      <section className="section-block prize-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">À gagner</p>
            <h2>Lots du podium</h2>
          </div>
        </div>
        <PrizePanel />
      </section>

      <section className="podium">
        {standings.slice(0, 3).map((row) => (
          <Link key={row.playerId} to={`/joueurs/${row.playerId}`} className={`podium-card rank-${row.position}`}>
            <span>#{row.position}</span>
            <PlayerAvatar nickname={row.nickname} avatarUrl={row.avatarUrl} />
            <strong>{row.nickname}</strong>
            <p>{row.points} pts</p>
          </Link>
        ))}
      </section>

      {me ? (
        <section className="notice-panel compact">
          <strong>Ton classement : #{me.position}</strong>
          <p>{me.points} points · {me.exactScores} scores exacts</p>
        </section>
      ) : null}

      <section className="ranking-list">
        {standings.map((row) => (
          <Link key={row.playerId} to={`/joueurs/${row.playerId}`} className={`ranking-row ${samePlayerId(row.playerId, player?.id) ? 'is-me' : ''}`}>
            <span className="rank-number">{row.position}</span>
            <PlayerAvatar nickname={row.nickname} avatarUrl={row.avatarUrl} />
            <span>
              <strong>{row.nickname}</strong>
              <small>{row.exactScores} exacts · {row.correctResults} bons résultats</small>
            </span>
            <strong>{row.points} pts</strong>
          </Link>
        ))}
      </section>
    </div>
  );
};

export default LeaderboardPage;
