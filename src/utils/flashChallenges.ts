import type { FlashChallenge, FlashOption, FlashPrediction } from '../types';

export const isFlashChallengeOpen = (challenge: FlashChallenge, now: Date = new Date()): boolean =>
  challenge.status === 'open' && new Date(challenge.closesAt).getTime() > now.getTime();

export const canEditFlashPrediction = (challenge: FlashChallenge, now: Date = new Date()): boolean =>
  isFlashChallengeOpen(challenge, now);

export const getFlashOption = (challenge: FlashChallenge, optionId?: string | null): FlashOption | undefined =>
  challenge.options.find((option) => option.id === optionId);

export const getShortFlashAnswerLabel = (option?: Pick<FlashOption, 'label'> | null): string => {
  const label = option?.label?.trim();
  if (!label) return 'Option';
  const normalized = label.toLocaleLowerCase('fr-FR');
  if (normalized.startsWith('oui')) return 'Oui';
  if (normalized.startsWith('non')) return 'Non';
  return label;
};

export const getShortFlashOptionLabel = (option: Pick<FlashOption, 'label' | 'pointsIfCorrect'>): string =>
  `${getShortFlashAnswerLabel(option)} — +${option.pointsIfCorrect} pts`;

export const calculateFlashPredictionPoints = (
  challenge: FlashChallenge,
  prediction?: Pick<FlashPrediction, 'optionId'> | null,
): number | null => {
  if (challenge.status !== 'resolved') return null;
  if (!prediction || !challenge.resultOptionId) return 0;
  if (prediction.optionId !== challenge.resultOptionId) return 0;
  return getFlashOption(challenge, prediction.optionId)?.pointsIfCorrect ?? 0;
};

export const shouldShowFlashOnHome = (
  challenge: FlashChallenge,
  playerId?: string | null,
  prediction?: Pick<FlashPrediction, 'optionId'> | null,
): boolean => Boolean(playerId) && isFlashChallengeOpen(challenge) && !prediction;

export const flashMatchesPredictionFilter = (
  filter: 'all' | 'live' | 'finished' | 'upcoming' | 'won' | 'lost',
  challenge: FlashChallenge,
  prediction?: Pick<FlashPrediction, 'optionId'> | null,
): boolean => {
  if (!prediction) return false;
  if (filter === 'all') return true;

  const open = isFlashChallengeOpen(challenge);
  const points = calculateFlashPredictionPoints(challenge, prediction);

  if (filter === 'upcoming') return open;
  if (filter === 'live') return !open && challenge.status !== 'resolved';
  if (filter === 'finished') return challenge.status === 'resolved';
  if (filter === 'won') return points !== null && points > 0;
  if (filter === 'lost') return points !== null && points === 0;

  return true;
};

export const getFlashPredictionResultType = (
  challenge: FlashChallenge,
  prediction?: Pick<FlashPrediction, 'optionId'> | null,
): 'won' | 'lost' | 'pending' => {
  const points = calculateFlashPredictionPoints(challenge, prediction);
  if (points === null) return 'pending';
  return points > 0 ? 'won' : 'lost';
};
