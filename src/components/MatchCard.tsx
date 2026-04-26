import { Link, useNavigate } from 'react-router-dom';
import type { Match, Prediction } from '../types';
import { canEditPrediction, formatKickoff, getMatchStatusLabel } from '../utils/date';
import { predictionService } from '../services/predictionService';

interface Props {
  match: Match;
  prediction?: Prediction;
}

const MatchCard = ({ match, prediction }: Props) => {
  const navigate = useNavigate();
  const editable = canEditPrediction(match);

  const actionLabel =
    match.status === 'finished'
      ? 'Voir le détail'
      : prediction
        ? 'Voir mon pronostic'
        : editable
          ? 'Pronostiquer'
          : 'Pronostic clôturé';

  const points =
    match.status === 'finished' && prediction
      ? predictionService.calculatePointsForPrediction(prediction, match)
      : undefined;

  return (
    <article className="match-card card">
      <Link to={`/matchs/${match.id}`} className="match-card-main">
        <p className="match-time">{formatKickoff(match.kickoff)}</p>
        <p className="match-note">Statut : {getMatchStatusLabel(match.status)}</p>

        <div className="teams-row">
          <strong>{match.homeTeam.name}</strong>
          <span>VS</span>
          <strong>{match.awayTeam.name}</strong>
        </div>

        {!editable && match.status === 'upcoming' ? <p className="match-note">Deadline dépassée · pronostic verrouillé</p> : null}
        {match.status === 'finished' ? (
          <p className="match-note">Score final : {match.homeScore} - {match.awayScore}</p>
        ) : null}
        {prediction ? <p className="match-note">Ton prono : {prediction.homeScore} - {prediction.awayScore}</p> : null}
        {typeof points === 'number' ? <p className="match-note">Tes points : {points} pts</p> : null}
      </Link>

      <div className="card-footer">
        <span className={`status-pill ${editable ? 'open' : prediction ? 'done' : 'closed'}`}>
          {prediction ? 'Déjà pronostiqué' : editable ? 'À faire' : 'Verrouillé'}
        </span>
        <button
          className="btn small"
          type="button"
          disabled={!editable && !prediction && match.status !== 'finished'}
          onClick={() => navigate(match.status === 'finished' ? `/matchs/${match.id}` : `/matchs/${match.id}/pronostic`)}
        >
          {actionLabel}
        </button>
      </div>
    </article>
  );
};

export default MatchCard;
