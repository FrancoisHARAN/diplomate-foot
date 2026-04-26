import type { Standing } from '../types';

const Podium = ({ top }: { top: Standing[] }) => (
  <section className="podium">
    {top.map((entry) => (
      <article key={entry.playerId} className={`card podium-${entry.position}`}>
        <p>#{entry.position}</p>
        <h3>{entry.nickname}</h3>
        <p>{entry.points} pts</p>
      </article>
    ))}
  </section>
);

export default Podium;
