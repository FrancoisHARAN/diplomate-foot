import { Link } from 'react-router-dom';
import type { Standing } from '../types';

const Podium = ({ top }: { top: Standing[] }) => (
  <section className="podium">
    {top.map((entry) => (
      <Link key={entry.playerId} to={`/joueurs/${entry.playerId}`} className={`card podium-${entry.position} player-link-card`}>
        <p>#{entry.position}</p>
        <h3>{entry.nickname}</h3>
        <p>{entry.points} pts</p>
      </Link>
    ))}
  </section>
);

export default Podium;
