import { Link } from 'react-router-dom';
import type { Standing } from '../types';

const LiveRankingCard = ({ standings, userRank }: { standings: Standing[]; userRank?: Standing }) => (
  <article className="card stack-sm">
    <h2>Classement en direct</h2>
    <div className="top-three-grid">
      {standings.slice(0, 3).map((entry) => (
        <article key={entry.playerId} className={`mini-rank-card ${entry.position === 1 ? 'first' : ''}`}>
          <p>#{entry.position}</p>
          <strong>{entry.nickname}</strong>
          <p>{entry.points} pts</p>
        </article>
      ))}
    </div>
    {userRank ? <p>Ton rang actuel : {userRank.position} · {userRank.points} pts</p> : null}
    <Link className="btn secondary" to="/classement">Voir le classement</Link>
  </article>
);

export default LiveRankingCard;
