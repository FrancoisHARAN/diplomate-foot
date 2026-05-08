import { Link } from 'react-router-dom';
import type { Standing } from '../types';

const RankingList = ({ standings, currentPlayerId }: { standings: Standing[]; currentPlayerId?: string }) => (
  <section className="stack">
    {standings.map((entry) => (
      <Link key={entry.playerId} to={`/joueurs/${entry.playerId}`} className={`card player-link-card ${currentPlayerId === entry.playerId ? 'highlight' : ''}`}>
        <strong>{entry.position}. {entry.nickname}</strong>
        <p>{entry.points} pts · {entry.exactScores} scores exacts · {entry.correctResults} bons résultats</p>
        <small>Voir profil</small>
      </Link>
    ))}
  </section>
);

export default RankingList;
