import { Link } from 'react-router-dom';
import type { Match, Prediction } from '../types';
import { formatKickoff } from '../utils/date';
import { getPredictionUiStatus } from '../utils/appState';
import { predictionService } from '../services/predictionService';

interface Props {
  match: Match;
  prediction?: Prediction;
}

const MatchCard = ({ match, prediction }: Props) => {
  const predictionStatus = getPredictionUiStatus(match, prediction);

  const statusLabel =
    match.status === 'finished'
      ? 'Terminé'
      : prediction
        ? 'Déjà pronostiqué'
        : predictionStatus === 'closed'
          ? 'Fermé'
          : 'Prono ouvert';

  const actionLabel =
    match.status === 'finished'
      ? 'Voir'
      : prediction
        ? 'Modifier'
        : predictionStatus === 'closed'
          ? 'Voir'
          : 'Pronostiquer';

  const points =
    match.status === 'finished' && prediction
      ? predictionService.calculatePointsForPrediction(prediction, match)
      : undefined;

  return (
    <Link to={`/matchs/${match.id}`} className="match-card card">
      <p className="match-time">{match.status === 'finished' ? 'Terminé' : formatKickoff(match.kickoff)}</p>

      <div className="teams-row">
        <strong>{match.homeTeam.name}</strong>
        <span>VS</span>
        <strong>{match.awayTeam.name}</strong>
      </div>

      {match.status === 'finished' ? (
        <p className="match-note">Score final : {match.homeScore} - {match.awayScore}</p>
      ) : null}
      {prediction ? <p className="match-note">Ton prono : {prediction.homeScore} - {prediction.awayScore}</p> : null}
      {typeof points === 'number' ? <p className="match-note">Tes points : {points} pts</p> : null}

      <div className="card-footer">
        <span className={`status-pill ${statusLabel === 'Prono ouvert' ? 'open' : statusLabel === 'Déjà pronostiqué' ? 'done' : 'closed'}`}>
          {statusLabel}
        </span>
        <span className="cta-arrow">{actionLabel} →</span>
      </div>
    </Link>
  );
};

export default MatchCard;
