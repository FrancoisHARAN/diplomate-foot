import { useMemo } from 'react';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { mockMatches } from '../data/mockMatches';
import { mockPlayers } from '../data/mockPlayers';
import { buildStandings, getStoredPredictions } from '../utils/appState';

const LeaderboardPage = () => {
  const { player } = usePlayerSession();
  const standings = useMemo(() => buildStandings(mockPlayers, getStoredPredictions(), mockMatches), []);
  const me = standings.find((row) => row.playerId === player?.id);

  return (
    <div className="screen-stack">
      <section className="page-hero">
        <p className="eyebrow">En direct</p>
        <h1>Classement</h1>
        <p>Le premier à la fin de la Coupe du Monde gagne 50 € de consommation au Diplomate.</p>
      </section>

      <section className="podium">
        {standings.slice(0, 3).map((row) => (
          <article key={row.playerId} className={`podium-card rank-${row.position}`}>
            <span>#{row.position}</span>
            <strong>{row.nickname}</strong>
            <p>{row.points} pts</p>
          </article>
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
          <article key={row.playerId} className={`ranking-row ${row.playerId === player?.id ? 'is-me' : ''}`}>
            <span className="rank-number">{row.position}</span>
            <span>
              <strong>{row.nickname}</strong>
              <small>{row.exactScores} exacts · {row.correctResults} bons résultats</small>
            </span>
            <strong>{row.points} pts</strong>
          </article>
        ))}
      </section>
    </div>
  );
};

export default LeaderboardPage;
