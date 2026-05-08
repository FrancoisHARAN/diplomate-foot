import type { Standing } from '../types';

const oldestPredictionFirst = (left?: string | null, right?: string | null): number => {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return new Date(left).getTime() - new Date(right).getTime();
};

export const compareLeaderboardEntries = (left: Standing, right: Standing): number => {
  const byPoints = right.points - left.points;
  if (byPoints !== 0) return byPoints;

  const byExactScores = right.exactScores - left.exactScores;
  if (byExactScores !== 0) return byExactScores;

  const byTwoPointResults = (right.twoPointResults ?? 0) - (left.twoPointResults ?? 0);
  if (byTwoPointResults !== 0) return byTwoPointResults;

  const byFirstPrediction = oldestPredictionFirst(left.firstPredictionAt, right.firstPredictionAt);
  if (byFirstPrediction !== 0) return byFirstPrediction;

  return left.nickname.localeCompare(right.nickname, 'fr', { sensitivity: 'base' });
};

export const sortLeaderboardEntries = (entries: Standing[]): Standing[] =>
  [...entries]
    .sort(compareLeaderboardEntries)
    .map((entry, index) => ({ ...entry, position: index + 1 }));
