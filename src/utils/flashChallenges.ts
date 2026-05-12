import type { FlashChallenge, FlashOption, FlashPrediction } from '../types';

export const isFlashChallengeOpen = (challenge: FlashChallenge, now: Date = new Date()): boolean =>
  challenge.status === 'open' && new Date(challenge.closesAt).getTime() > now.getTime();

export const getFlashOption = (challenge: FlashChallenge, optionId?: string | null): FlashOption | undefined =>
  challenge.options.find((option) => option.id === optionId);

export const calculateFlashPredictionPoints = (
  challenge: FlashChallenge,
  prediction?: Pick<FlashPrediction, 'optionId'> | null,
): number | null => {
  if (challenge.status !== 'resolved') return null;
  if (!prediction || !challenge.resultOptionId) return 0;
  if (prediction.optionId !== challenge.resultOptionId) return 0;
  return getFlashOption(challenge, prediction.optionId)?.pointsIfCorrect ?? 0;
};

export const getFlashPredictionResultType = (
  challenge: FlashChallenge,
  prediction?: Pick<FlashPrediction, 'optionId'> | null,
): 'won' | 'lost' | 'pending' => {
  const points = calculateFlashPredictionPoints(challenge, prediction);
  if (points === null) return 'pending';
  return points > 0 ? 'won' : 'lost';
};
