import type { Match, PredictionResultType } from '../types';
import { isFranceWorldCup2026Match, isWorldCup2026Match } from './worldCupFilters';

const FINAL_MATCH_STATUSES = new Set([
  'finished',
  'ft',
  'full_time',
  'completed',
  'complete',
  'termine',
  'final',
  'ended',
  'after_extra_time',
  'aet',
  'penalties',
]);

const normalizeMatchStatus = (status?: string | null): string =>
  String(status ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const isMatchFinal = (match: Pick<Match, 'status'> | { status?: string | null }): boolean =>
  FINAL_MATCH_STATUSES.has(normalizeMatchStatus(match.status));

export const calculatePredictionPoints = (
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
): number => {
  if (predictedHome === actualHome && predictedAway === actualAway) return 4;

  const predictedDiff = predictedHome - predictedAway;
  const actualDiff = actualHome - actualAway;
  const predictedOutcome = Math.sign(predictedDiff);
  const actualOutcome = Math.sign(actualDiff);
  const sameOutcome = predictedOutcome === actualOutcome;

  if (actualOutcome === 0 && predictedOutcome === 0) return 1;

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
  if (points === 4) return 'exact';
  if (points === 2) return 'two-point';
  if (points === 1) {
    const predictedOutcome = Math.sign(predictedHome - predictedAway);
    const actualOutcome = Math.sign(actualHome - actualAway);
    return predictedOutcome === 0 && actualOutcome === 0 ? 'draw' : 'winner';
  }
  return 'lost';
};

export const getPredictionResultTypeForMatch = (
  predictedHome: number,
  predictedAway: number,
  match: Match,
): PredictionResultType => {
  if (!isMatchFinal(match) || typeof match.homeScore !== 'number' || typeof match.awayScore !== 'number') return 'pending';
  return getPredictionResultType(predictedHome, predictedAway, match.homeScore, match.awayScore);
};

const hasTeam = (match: Match, terms: string[]): boolean => {
  const haystack = `${match.homeTeam.name} ${match.homeTeam.shortName} ${match.awayTeam.name} ${match.awayTeam.shortName}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
};

const normalizeStage = (value?: string | number | null): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');

const getWorldCupStageMultiplier = (match: Match): number => {
  if (!isWorldCup2026Match(match)) return 1;
  const stage = normalizeStage([match.stage, match.round, match.group, match.matchday].filter(Boolean).join(' '));
  if (stage.includes('semi') || stage.includes('demi')) return 4;
  if (stage.includes('third place') || stage.includes('3e place') || stage.includes('troisieme')) return 3;
  if (stage.includes('quarter') || stage.includes('quart')) return 3;
  if (stage.includes('round of 16') || stage.includes('last 16') || stage.includes('huitieme')) return 2;
  if (stage.includes('round of 32') || stage.includes('last 32') || stage.includes('seizieme')) return 2;
  if (stage.includes('final') || stage.includes('finale')) return 5;
  return 1;
};

export const getMatchMultiplier = (match: Match): number => {
  const candidates = [
    typeof match.pointsMultiplier === 'number' && match.pointsMultiplier > 1 ? match.pointsMultiplier : 1,
    isFranceWorldCup2026Match(match) ? 2 : 1,
    getWorldCupStageMultiplier(match),
  ];

  const competition = `${match.competitionName ?? ''} ${match.matchday ?? ''}`.toLowerCase();
  if (competition.includes('finale') || competition.includes('final')) candidates.push(5);

  if (hasTeam(match, ['psg', 'paris sg', 'paris saint-germain', 'paris saint germain'])) candidates.push(2);

  return Math.max(...candidates);
};

export const applyMatchMultiplier = (points: number, match: Match): number => points * getMatchMultiplier(match);

export const calculatePredictionPointsForMatch = (
  predictedHome: number,
  predictedAway: number,
  match: Match,
): number | null => {
  // match.homeScore / match.awayScore doivent représenter le score du temps réglementaire.
  if (!isMatchFinal(match) || typeof match.homeScore !== 'number' || typeof match.awayScore !== 'number') return null;
  return applyMatchMultiplier(calculatePredictionPoints(predictedHome, predictedAway, match.homeScore, match.awayScore), match);
};
