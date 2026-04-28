import { useNavigate } from 'react-router-dom';
import type { Match, Prediction } from '../types';
import { canEditPrediction, formatKickoffDay, formatKickoffTime, getLiveMinute, getMinutesBeforeLock } from '../utils/date';
import { getTeamFlagUrl, getTeamInitials } from '../utils/flags';
import { calculatePredictionPoints } from '../utils/points';

interface MatchCardProps {
  match: Match;
  prediction?: Prediction;
  variant?: 'compact' | 'full';
  onClick?: () => void;
  linkTo?: string;
}

const getMatchState = (match: Match, editable: boolean) => {
  if (match.status === 'finished') return { label: 'Terminé', tone: 'done' };
  if (match.status === 'live') return { label: 'En cours', tone: 'live' };
  if (!editable) return { label: 'Fermé', tone: 'closed' };
  if (getMinutesBeforeLock(match) <= 180) return { label: 'Ferme bientôt', tone: 'warning' };
  return { label: 'Ouvert', tone: 'open' };
};

const MatchCard = ({ match, prediction, variant = 'full', onClick, linkTo }: MatchCardProps) => {
  const navigate = useNavigate();
  const editable = canEditPrediction(match);
  const state = getMatchState(match, editable);
  const liveMinute = getLiveMinute(match);
  const homeFlag = getTeamFlagUrl(match.homeTeam.shortName);
  const awayFlag = getTeamFlagUrl(match.awayTeam.shortName);

  const scoreLabel =
    (match.status === 'finished' || match.status === 'live') && typeof match.homeScore === 'number' && typeof match.awayScore === 'number'
      ? `${match.homeScore} - ${match.awayScore}`
      : 'VS';
  const actionLabel =
    match.status === 'finished'
      ? 'Voir le résultat'
      : prediction
        ? editable
          ? 'Modifier mon prono'
          : 'Voir mon prono'
        : editable
          ? 'Pronostiquer'
          : 'Voir le match';

  const points =
    prediction && match.status === 'finished' && typeof match.homeScore === 'number' && typeof match.awayScore === 'number'
      ? calculatePredictionPoints(prediction.homeScore, prediction.awayScore, match.homeScore, match.awayScore)
      : null;

  const click = () => {
    if (onClick) {
      onClick();
      return;
    }
    navigate(linkTo ?? `/matchs/${match.id}`);
  };

  return (
    <button type="button" className={`match-card ${variant === 'compact' ? 'compact' : ''}`} onClick={click}>
      <span className={`status-pill ${state.tone}`}>{state.label}</span>

      <div className="match-meta">
        <span>{match.competitionName ?? 'Compétition test'}</span>
        <strong>{liveMinute ? `${liveMinute}'` : formatKickoffTime(match.kickoff)}</strong>
      </div>

      <div className="match-teams">
        <span className="team-block">
          {homeFlag ? <img src={homeFlag} alt="" /> : <span className="club-badge">{getTeamInitials(match.homeTeam.name, match.homeTeam.shortName)}</span>}
          <strong>{match.homeTeam.name}</strong>
          <small>{match.homeTeam.shortName}</small>
        </span>
        <span className="versus-pill">{scoreLabel}</span>
        <span className="team-block">
          {awayFlag ? <img src={awayFlag} alt="" /> : <span className="club-badge">{getTeamInitials(match.awayTeam.name, match.awayTeam.shortName)}</span>}
          <strong>{match.awayTeam.name}</strong>
          <small>{match.awayTeam.shortName}</small>
        </span>
      </div>

      <div className="match-card-footer">
        <span>
          {formatKickoffDay(match.kickoff)} · {prediction ? `Ton prono : ${prediction.homeScore} - ${prediction.awayScore}` : editable ? 'Aucun prono saisi' : 'Pronostics verrouillés'}
          {points !== null ? ` · ${points} pts` : ''}
        </span>
        <strong>{actionLabel}</strong>
      </div>
    </button>
  );
};

export default MatchCard;
