import { Link } from 'react-router-dom';
import type { Match, Prediction } from '../types';
import { formatKickoff } from '../utils/date';
import { getPredictionUiStatus } from '../utils/appState';
import MatchStatusBadge from './MatchStatusBadge';
import PredictionStatusBadge from './PredictionStatusBadge';

interface Props {
  match: Match;
  prediction?: Prediction;
}

const MatchCard = ({ match, prediction }: Props) => {
  const predictionStatus = getPredictionUiStatus(match, prediction);
  const actionLabel = match.status === 'finished' ? 'Voir résultat' : prediction ? 'Modifier' : predictionStatus === 'closed' ? 'Voir' : 'Pronostiquer';

  return (
    <Link to={`/matchs/${match.id}`} className="match-card card">
      <div className="teams-row">
        <strong>{match.homeTeam.name}</strong>
        <span>VS</span>
        <strong>{match.awayTeam.name}</strong>
      </div>
      <p>{formatKickoff(match.kickoff)}</p>
      <div className="badge-row">
        <MatchStatusBadge status={match.status} />
        <PredictionStatusBadge status={predictionStatus} />
      </div>
      {prediction ? <p>Ton prono : {prediction.homeScore} - {prediction.awayScore}</p> : null}
      {match.status === 'finished' ? <p>Score final : {match.homeScore} - {match.awayScore}</p> : null}
      <span className="btn small">{actionLabel}</span>
    </Link>
  );
};

export default MatchCard;
