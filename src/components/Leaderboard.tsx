import { Link } from 'react-router-dom';
import type { Standing } from '../types';

interface LeaderboardProps {
  standings: Standing[];
}

const Leaderboard = ({ standings }: LeaderboardProps) => (
  <section className="card">
    <h2>Classement</h2>
    <div className="leaderboard">
      {standings.map((row) => (
        <Link key={row.playerId} to={`/joueurs/${row.playerId}`} className={row.position === 1 ? 'leader first player-link-card' : 'leader player-link-card'}>
          <p>#{row.position} — <strong>{row.nickname}</strong></p>
          <p>{row.points} pts</p>
          <small>{row.exactScores} scores exacts • {row.correctResults} bons résultats</small>
        </Link>
      ))}
    </div>
  </section>
);

export default Leaderboard;
