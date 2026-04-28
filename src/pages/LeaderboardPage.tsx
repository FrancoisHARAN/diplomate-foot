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
    <div className="stack">
      <section className="card stack-sm">
        <h1>Classement</h1>
        <p>Le 1er remporte 50 € de consommation.</p>
      </section>

      <section className="podium">
        {standings.slice(0, 3).map((row) => (
          <article key={row.playerId} className={`card ${row.position === 1 ? 'podium-1' : ''}`}>
            <p>#{row.position}</p>
            <strong>{row.nickname}</strong>
            <p>{row.points} pts</p>
          </article>
        ))}
      </section>

      {me ? <section className="card">Tu es actuellement {me.position}ème avec {me.points} points.</section> : null}

      <section className="stack-sm">
        {standings.map((row) => (
          <article key={row.playerId} className={`card ${row.playerId === player?.id ? 'highlight' : ''}`}>
            <div className="row-between">
              <strong>{row.position}. {row.nickname}</strong>
              <strong>{row.points} pts</strong>
            </div>
            <p>Scores exacts : {row.exactScores} · Bons résultats : {row.correctResults}</p>
          </article>
        ))}
      </section>
    </div>
  );
};

export default LeaderboardPage;
