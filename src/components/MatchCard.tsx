import type { Match } from '../types';
import { canEditPrediction, formatKickoff, getMatchStatusLabel } from '../utils/date';

interface MatchCardProps {
  match: Match;
  onPredict?: (match: Match) => void;
}

const MatchCard = ({ match, onPredict }: MatchCardProps) => {
  const editable = canEditPrediction(match);

  return (
    <article className="card match-card">
      <div className="match-teams">
        <strong>{match.homeTeam.name}</strong>
        <span>vs</span>
        <strong>{match.awayTeam.name}</strong>
      </div>
      <p>{formatKickoff(match.kickoff)}</p>
      <p className="status">Statut : {getMatchStatusLabel(match.status)}</p>
      {match.status === 'finished' ? (
        <p className="score">Score final : {match.homeScore} - {match.awayScore}</p>
      ) : null}

      {match.status === 'upcoming' ? (
        editable ? (
          <button type="button" className="btn" onClick={() => onPredict?.(match)}>
            Pronostiquer
          </button>
        ) : (
          <span className="locked">Pronostic fermé</span>
        )
      ) : (
        <span className="locked">Pronostic fermé</span>
      )}
    </article>
  );
};

export default MatchCard;
