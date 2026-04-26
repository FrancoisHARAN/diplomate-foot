import type { Standing } from '../types';

const RankingList = ({ standings, currentPlayerId }: { standings: Standing[]; currentPlayerId?: string }) => (
  <section className="stack">
    {standings.map((entry) => (
      <article key={entry.playerId} className={`card ${currentPlayerId === entry.playerId ? 'highlight' : ''}`}>
        <strong>{entry.position}. {entry.nickname}</strong>
        <p>{entry.points} pts · {entry.exactScores} scores exacts · {entry.correctResults} bons résultats</p>
      </article>
    ))}
  </section>
);

export default RankingList;
