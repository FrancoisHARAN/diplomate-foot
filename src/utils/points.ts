import type { Match } from '../types';

export const calculatePredictionPoints = (
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
): number => {
  if (predictedHome === actualHome && predictedAway === actualAway) return 3;

  const predictedDiff = predictedHome - predictedAway;
  const actualDiff = actualHome - actualAway;

  if (predictedDiff === actualDiff) return 2;

  const predictedOutcome = Math.sign(predictedDiff);
  const actualOutcome = Math.sign(actualDiff);

  if (predictedOutcome === actualOutcome) return 1;

  return 0;
};

const hasTeam = (match: Match, terms: string[]): boolean => {
  const haystack = `${match.homeTeam.name} ${match.homeTeam.shortName} ${match.awayTeam.name} ${match.awayTeam.shortName}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
};

export const getMatchMultiplier = (match: Match): number => {
  if (typeof match.pointsMultiplier === 'number' && match.pointsMultiplier > 1) return match.pointsMultiplier;

  const competition = `${match.competitionName ?? ''} ${match.matchday ?? ''}`.toLowerCase();
  if (competition.includes('finale') || competition.includes('final')) return 5;

  if (hasTeam(match, ['psg', 'paris sg', 'paris saint-germain', 'paris saint germain'])) return 2;
  if (match.competitionCode === 'WORLD' && hasTeam(match, ['france', 'fra'])) return 2;

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
