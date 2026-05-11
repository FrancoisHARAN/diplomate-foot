import type { Match, PredictionResultType } from '../types';
import { isFranceWorldCup2026Match } from './worldCupFilters';

export const calculatePredictionPoints = (
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
): number => {
  if (predictedHome === actualHome && predictedAway === actualAway) return 3;

  const predictedDiff = predictedHome - predictedAway;
  const actualDiff = actualHome - actualAway;
  const predictedOutcome = Math.sign(predictedDiff);
  const actualOutcome = Math.sign(actualDiff);
  const sameOutcome = predictedOutcome === actualOutcome;

  if (sameOutcome && predictedDiff === actualDiff) return 2;

  if (sameOutcome) return 1;

  return 0;
};

export const getPredictionResultType = (
  predictedHome: number,
  predictedAway: number,
  actualHome?: number | null,
  actualAway?: number | null,
): PredictionResultType => {
  if (typeof actualHome !== 'number' || typeof actualAway !== 'number') return 'pending';

  const points = calculatePredictionPoints(predictedHome, predictedAway, actualHome, actualAway);
  if (points === 3) return 'exact';
  if (points === 2) return 'two-point';
  if (points === 1) return 'winner';
  return 'lost';
};

const hasTeam = (match: Match, terms: string[]): boolean => {
  const haystack = `${match.homeTeam.name} ${match.homeTeam.shortName} ${match.awayTeam.name} ${match.awayTeam.shortName}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
};

export const getMatchMultiplier = (match: Match): number => {
  if (typeof match.pointsMultiplier === 'number' && match.pointsMultiplier > 1) return match.pointsMultiplier;

  if (isFranceWorldCup2026Match(match)) return 2;

  const competition = `${match.competitionName ?? ''} ${match.matchday ?? ''}`.toLowerCase();
  if (competition.includes('finale') || competition.includes('final')) return 5;

  if (hasTeam(match, ['psg', 'paris sg', 'paris saint-germain', 'paris saint germain'])) return 2;

  return 1;
};

export const applyMatchMultiplier = (points: number, match: Match): number => points * getMatchMultiplier(match);

export const calculatePredictionPointsForMatch = (
  predictedHome: number,
  predictedAway: number,
  match: Match,
): number => {
  if (typeof match.homeScore !== 'number' || typeof match.awayScore !== 'number') return 0;
  return applyMatchMultiplier(calculatePredictionPoints(predictedHome, predictedAway, match.homeScore, match.awayScore), match);
};
