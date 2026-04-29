import { useNavigate } from 'react-router-dom';
import TeamBadge from './TeamBadge';
import type { Match, Prediction } from '../types';
import { canEditPrediction, formatKickoffDay, formatKickoffTime, formatLastUpdated, getMinutesBeforeLock, isLiveDisplayMatch } from '../utils/date';
import { calculatePredictionPointsForMatch, getMatchMultiplier } from '../utils/points';

interface MatchCardProps {
  match: Match;
  prediction?: Prediction;
  variant?: 'compact' | 'full';
  onClick?: () => void;
  linkTo?: string;
}

const getMatchState = (match: Match, editable: boolean) => {
  if (match.status === 'finished') return { label: 'Terminé', tone: 'done' };
  if (isLiveDisplayMatch(match)) return { label: 'Match en live', tone: 'live' };
  if (!editable) return { label: 'Fermé', tone: 'closed' };
  if (getMinutesBeforeLock(match) <= 60) return { label: 'Ferme bientôt', tone: 'warning' };
  return { label: 'Ouvert', tone: 'open' };
};

const getPredictionTone = (prediction: Prediction | undefined, points: number | null) => {
  if (!prediction) return 'empty';
  if (points === null) return 'pending';
  return points > 0 ? 'won' : 'lost';
};

const MatchCard = ({ match, prediction, variant = 'full', onClick, linkTo }: MatchCardProps) => {
  const navigate = useNavigate();
  const editable = canEditPrediction(match);
  const state = getMatchState(match, editable);
  const multiplier = getMatchMultiplier(match);
  const updatedAt = formatLastUpdated(match.lastUpdated);
  const isLiveDisplay = isLiveDisplayMatch(match);
  const hasScore = typeof match.homeScore === 'number' && typeof match.awayScore === 'number';

  const scoreLabel =
    (match.status === 'finished' || isLiveDisplay) && hasScore
      ? `${match.homeScore} - ${match.awayScore}`
      : isLiveDisplay
        ? 'Live'
      : 'VS';
  const actionLabel =
    match.status === 'finished'
      ? 'Voir le résultat'
      : prediction
        ? editable
          ? 'Modifier'
          : 'Voir'
        : editable
          ? 'Pronostiquer'
          : 'Voir';

  const points =
    prediction && match.status === 'finished' && typeof match.homeScore === 'number' && typeof match.awayScore === 'number'
      ? calculatePredictionPointsForMatch(prediction.homeScore, prediction.awayScore, match)
      : null;
  const predictionTone = getPredictionTone(prediction, points);

  const click = () => {
    if (onClick) {
      onClick();
      return;
    }
    navigate(linkTo ?? `/matchs/${match.id}`);
  };

  return (
    <button type="button" className={`match-card ${variant === 'compact' ? 'compact' : ''} ${multiplier > 1 ? 'is-boosted' : ''}`} onClick={click}>
      <div className="match-card-topline">
        <span className={`status-pill ${state.tone}`}>{state.label}</span>
        {multiplier > 1 ? (
          <span className="booster-pill">
            <strong>Boost x{multiplier}</strong>
            <small>Points x{multiplier}</small>
          </span>
        ) : null}
      </div>

      <div className="match-meta">
        <span>{match.competitionName ?? 'Compétition test'}</span>
        <strong>{isLiveDisplay ? 'Score live' : formatKickoffTime(match.kickoff)}</strong>
      </div>

      {isLiveDisplay ? (
        <div className="live-update-alert">
          <span>Live</span>
          <small>Dernière actu : {updatedAt ?? 'en cours'}</small>
        </div>
      ) : null}

      <div className="match-teams">
        <span className="team-block">
          <TeamBadge team={match.homeTeam} competitionCode={match.competitionCode} />
          <strong>{match.homeTeam.name}</strong>
          <small>{match.homeTeam.shortName}</small>
        </span>
        <span className="versus-pill">{scoreLabel}</span>
        <span className="team-block">
          <TeamBadge team={match.awayTeam} competitionCode={match.competitionCode} />
          <strong>{match.awayTeam.name}</strong>
          <small>{match.awayTeam.shortName}</small>
        </span>
      </div>

      <div className="match-card-footer">
        <span>{formatKickoffDay(match.kickoff)}</span>
        <strong>{actionLabel}</strong>
      </div>

      <div className={`match-prediction-card ${predictionTone}`}>
        <span>{prediction ? 'Ton prono' : editable ? 'Aucun prono saisi' : 'Pronostics verrouillés'}</span>
        <strong>{prediction ? `${prediction.homeScore} - ${prediction.awayScore}` : 'À jouer'}</strong>
        {points !== null ? <small>{points} pts</small> : null}
      </div>
    </button>
  );
};

export default MatchCard;
