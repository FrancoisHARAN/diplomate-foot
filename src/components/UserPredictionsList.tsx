import type { Match, Prediction } from '../types';
import { formatKickoff } from '../utils/date';
import { Link } from 'react-router-dom';

const UserPredictionsList = ({ title, items }: { title: string; items: Array<{ match: Match; prediction?: Prediction; points?: number }> }) => (
  <section className="stack-sm">
    <h3>{title}</h3>
    {items.map(({ match, prediction, points }) => (
      <article key={match.id} className="card stack-sm">
        <strong>{match.homeTeam.name} vs {match.awayTeam.name}</strong>
        <p>{formatKickoff(match.kickoff)}</p>
        <p>Ton prono : {prediction ? `${prediction.homeScore} - ${prediction.awayScore}` : 'Aucun'}</p>
        {typeof points === 'number' ? <p>Points : {points}</p> : null}
        <Link className="btn small" to={`/matchs/${match.id}`}>{prediction ? 'Modifier' : 'Voir'}</Link>
      </article>
    ))}
  </section>
);

export default UserPredictionsList;
