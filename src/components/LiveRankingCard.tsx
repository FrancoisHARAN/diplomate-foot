import { Link } from 'react-router-dom';
import type { Standing } from '../types';

const LiveRankingCard = ({ standings, userRank }: { standings: Standing[]; userRank?: Standing }) => (
  <article className="card">
    <h2>Classement en direct</h2>
    <ol className="stack">
      {standings.slice(0, 3).map((entry) => (
        <li key={entry.playerId} className={entry.position === 1 ? 'top-rank' : ''}>
          {entry.position}. {entry.nickname} — {entry.points} pts
        </li>
      ))}
    </ol>
    {userRank ? <p>Ton rang : {userRank.position}e · {userRank.points} pts</p> : null}
    <Link className="btn secondary" to="/classement">Voir tout le classement</Link>
  </article>
);

export default LiveRankingCard;
