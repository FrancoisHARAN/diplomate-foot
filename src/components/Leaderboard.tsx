import type { Standing } from '../types';

interface LeaderboardProps {
  standings: Standing[];
}

const Leaderboard = ({ standings }: LeaderboardProps) => (
  <section className="card">
    <h2>Classement</h2>
    <div className="leaderboard">
      {standings.map((row) => (
        <article key={row.playerId} className={row.position === 1 ? 'leader first' : 'leader'}>
          <p>#{row.position} — <strong>{row.nickname}</strong></p>
          <p>{row.points} pts</p>
          <small>{row.exactScores} scores exacts • {row.correctResults} bons résultats</small>
        </article>
      ))}
    </div>
  </section>
);

export default Leaderboard;
