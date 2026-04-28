import { useNavigate } from 'react-router-dom';
import type { Match, Prediction } from '../types';
import { formatKickoff } from '../utils/date';
import { canEditPrediction } from '../utils/date';

interface MatchCardProps {
  match: Match;
  prediction?: Prediction;
  variant?: 'compact' | 'full';
  onClick?: () => void;
  linkTo?: string;
}

const MatchCard = ({ match, prediction, variant = 'full', onClick, linkTo }: MatchCardProps) => {
  const navigate = useNavigate();
  const editable = canEditPrediction(match);

  const cta =
    match.status === 'finished' ? 'Résultat' : match.status === 'live' ? 'Voir' : prediction ? (editable ? 'Modifier' : 'Voir') : editable ? 'Pronostiquer' : 'Voir';

  const note =
    match.status === 'finished'
      ? `Score final : ${match.homeScore} - ${match.awayScore}`
      : prediction
        ? `Ton prono : ${prediction.homeScore} - ${prediction.awayScore}`
        : editable
          ? 'Prono ouvert'
          : 'Pronostics fermés';

  const statusBadge =
    match.status === 'finished' ? 'Terminé' : match.status === 'live' ? 'En cours' : editable ? 'Ouvert' : 'Fermé';

  const click = () => {
    if (onClick) return onClick();
    navigate(linkTo ?? `/matchs/${match.id}`);
  };

  return (
    <button type="button" className={`match-card card ${variant === 'compact' ? 'compact' : ''}`} onClick={click}>
      <div className="card-footer">
        <p className="match-time">{match.status === 'finished' ? 'Terminé' : formatKickoff(match.kickoff)}</p>
        <span className={`status-pill ${editable ? 'open' : match.status === 'finished' ? 'done' : 'closed'}`}>{statusBadge}</span>
      </div>

      <div className="teams-row">
        <strong>{match.homeTeam.name}</strong>
        <span>{match.status === 'finished' ? `${match.homeScore} - ${match.awayScore}` : 'VS'}</span>
        <strong>{match.awayTeam.name}</strong>
      </div>

      <div className="card-footer">
        <p className="match-note">{note}</p>
        <p className="cta-arrow">{cta} →</p>
      </div>
    </button>
  );
};

export default MatchCard;
