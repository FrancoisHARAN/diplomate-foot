import { Link } from 'react-router-dom';
import type { CurrentPlayer } from '../utils/appState';
import type { FlashChallenge, FlashPrediction } from '../types';
import { calculateFlashPredictionPoints, getFlashOption, isFlashChallengeOpen } from '../utils/flashChallenges';

interface FlashChallengeCardProps {
  challenge: FlashChallenge;
  player: CurrentPlayer | null;
  prediction?: FlashPrediction;
  onAnswer?: (challenge: FlashChallenge, optionId: string) => void | Promise<void>;
  compact?: boolean;
}

const formatFlashDeadline = (iso: string): string =>
  new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

const FlashChallengeCard = ({ challenge, player, prediction, onAnswer, compact = false }: FlashChallengeCardProps) => {
  const open = isFlashChallengeOpen(challenge);
  const selectedOption = getFlashOption(challenge, prediction?.optionId);
  const flashPoints = calculateFlashPredictionPoints(challenge, prediction);

  return (
    <article className={`flash-card ${compact ? 'compact' : ''} ${challenge.status}`}>
      <div className="flash-card-header">
        <span className="flash-badge">⚡ Flash</span>
        <small>{open ? `Ferme ${formatFlashDeadline(challenge.closesAt)}` : challenge.status === 'resolved' ? 'Résolu' : 'Fermé'}</small>
      </div>

      <div className="flash-card-copy">
        <h3>{challenge.title}</h3>
        {challenge.matchLabel ? <strong>{challenge.matchLabel}</strong> : null}
        {challenge.description ? <p>{challenge.description}</p> : null}
      </div>

      {!player ? (
        <div className="flash-card-login">
          <p>Connecte-toi pour répondre.</p>
          <Link className="btn primary" to="/connexion">Connexion</Link>
        </div>
      ) : (
        <>
          <div className="flash-options" role="group" aria-label={challenge.title}>
            {challenge.options.map((option) => {
              const selected = prediction?.optionId === option.id;
              const winner = challenge.resultOptionId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`flash-option ${selected ? 'selected' : ''} ${winner && challenge.status === 'resolved' ? 'winner' : ''}`}
                  disabled={!open || !onAnswer}
                  onClick={() => void onAnswer?.(challenge, option.id)}
                >
                  <span>{option.label}</span>
                  <strong>+{option.pointsIfCorrect} pts</strong>
                </button>
              );
            })}
          </div>

          {prediction ? (
            <p className="flash-response">
              Réponse enregistrée : <strong>{selectedOption?.label ?? 'Option'}</strong>
              {flashPoints === null ? ' · points en attente' : flashPoints > 0 ? ` · +${flashPoints} pts` : ' · perdu'}
            </p>
          ) : open ? (
            <p className="flash-response muted">Choisis une réponse avant la fermeture du flash.</p>
          ) : (
            <p className="flash-response muted">Flash fermé.</p>
          )}
        </>
      )}
    </article>
  );
};

export default FlashChallengeCard;
