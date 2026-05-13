import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DeadlineBadge from './DeadlineBadge';
import type { CurrentPlayer } from '../utils/appState';
import type { FlashChallenge, FlashPrediction } from '../types';
import {
  calculateFlashPredictionPoints,
  canEditFlashPrediction,
  getFlashOption,
  getShortFlashAnswerLabel,
  getShortFlashOptionLabel,
} from '../utils/flashChallenges';

interface FlashChallengeCardProps {
  challenge: FlashChallenge;
  player: CurrentPlayer | null;
  prediction?: FlashPrediction;
  onAnswer?: (challenge: FlashChallenge, optionId: string) => void | Promise<void>;
  compact?: boolean;
}

const FlashChallengeCard = ({ challenge, player, prediction, onAnswer, compact = false }: FlashChallengeCardProps) => {
  const open = canEditFlashPrediction(challenge);
  const selectedOption = getFlashOption(challenge, prediction?.optionId);
  const resultOption = getFlashOption(challenge, challenge.resultOptionId);
  const calculatedFlashPoints = calculateFlashPredictionPoints(challenge, prediction);
  const hasAuthoritativePoints = Boolean(prediction && Object.prototype.hasOwnProperty.call(prediction, 'points'));
  const flashPoints = hasAuthoritativePoints ? prediction?.points ?? null : calculatedFlashPoints;
  const [draftOptionId, setDraftOptionId] = useState(prediction?.optionId ?? '');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setDraftOptionId(prediction?.optionId ?? '');
    setSaveError('');
  }, [prediction?.optionId]);

  const canSave = Boolean(player && onAnswer && open && draftOptionId && draftOptionId !== prediction?.optionId);
  const statusLabel = open ? 'Modifiable' : challenge.status === 'resolved' ? 'Terminé' : 'En attente';
  const closedLabel = challenge.status === 'resolved' ? 'Terminé' : 'Fermé';
  const resultLabel = useMemo(() => getShortFlashAnswerLabel(resultOption), [resultOption]);

  const save = async () => {
    if (!canSave) return;
    setSaveState('saving');
    setSaveError('');
    try {
      await onAnswer?.(challenge, draftOptionId);
      setSaveState('saved');
    } catch (error) {
      setSaveState('idle');
      setSaveError(error instanceof Error ? error.message : 'Enregistrement impossible.');
    }
  };

  return (
    <article className={`flash-card ${compact ? 'compact' : ''} ${challenge.status} ${open ? 'is-open' : 'is-locked'}`}>
      <div className="flash-card-header">
        <span className="flash-badge">Flash</span>
        <DeadlineBadge deadline={challenge.closesAt} closed={!open} closedLabel={closedLabel} label="Ferme dans" />
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
          <div className="flash-summary">
            <span className={`flash-state ${open ? 'open' : challenge.status}`}>{statusLabel}</span>
            {prediction ? (
              <p>
                Ta réponse : <strong>{getShortFlashAnswerLabel(selectedOption)}</strong>
              </p>
            ) : (
              <p>Choisis une réponse avant la fermeture.</p>
            )}
            {challenge.status === 'resolved' ? (
              <p>
                Résultat : <strong>{resultLabel}</strong>
              </p>
            ) : !open && prediction ? (
              <p>Résultat en attente.</p>
            ) : null}
            {flashPoints !== null ? (
              flashPoints > 0 ? <strong className="flash-result won">+{flashPoints} pts</strong> : <span className="flash-result lost">Perdu</span>
            ) : null}
          </div>

          {open && onAnswer ? (
            <>
              <div className="flash-options" role="group" aria-label={challenge.title}>
                {challenge.options.map((option) => {
                  const selected = draftOptionId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`flash-option ${selected ? 'selected' : ''}`}
                      onClick={() => {
                        setDraftOptionId(option.id);
                        setSaveState('idle');
                        setSaveError('');
                      }}
                    >
                      <span>{getShortFlashOptionLabel(option)}</span>
                    </button>
                  );
                })}
              </div>
              <p className="flash-hint">Points accordés uniquement si la prédiction est correcte.</p>
              <div className="flash-save-row">
                <button className="btn primary" type="button" disabled={!canSave || saveState === 'saving'} onClick={() => void save()}>
                  {saveState === 'saving' ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                {saveState === 'saved' ? <span className="flash-confirmation">Réponse enregistrée.</span> : null}
              </div>
              {saveError ? <p className="form-error">{saveError}</p> : null}
            </>
          ) : null}
        </>
      )}
    </article>
  );
};

export default FlashChallengeCard;
