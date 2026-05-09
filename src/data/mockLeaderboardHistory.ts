import type { LeaderboardHistoryPeriod, Standing } from '../types';

const mockNames = new Map([
  ['p1', 'Nico'],
  ['p2', 'Sarah'],
  ['p-francois', 'François'],
  ['p-solene', 'Solène'],
]);

const periods = [
  { label: 'Semaine 1', ranks: ['p1', 'p2', 'p-francois', 'p-solene'] },
  { label: 'Semaine 2', ranks: ['p2', 'p-francois', 'p1', 'p-solene'] },
  { label: 'Semaine 3', ranks: ['p-francois', 'p2', 'p-solene', 'p1'] },
];

const toIso = (daysAgo: number): string => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

const mockPeriod = (label: string, ranks: string[], index: number): LeaderboardHistoryPeriod => ({
  label,
  snapshotAt: toIso((periods.length - index) * 7),
  isCurrent: false,
  entries: ranks.map((playerId, rankIndex) => ({
    periodLabel: label,
    snapshotAt: toIso((periods.length - index) * 7),
    playerId,
    nickname: mockNames.get(playerId) ?? 'Joueur',
    rank: rankIndex + 1,
    points: Math.max(0, 20 - rankIndex * 4 + index * 3),
    exactScores: Math.max(0, 4 - rankIndex + index),
    twoPointResults: Math.max(0, 3 - rankIndex + index),
    firstPredictionAt: toIso(30 - index * 3 - rankIndex),
    isCurrent: false,
  })),
});

export const buildMockLeaderboardHistory = (currentStandings: Standing[]): LeaderboardHistoryPeriod[] => {
  const frozenPeriods = periods.map((period, index) => mockPeriod(period.label, period.ranks, index));
  const currentEntries = currentStandings.slice(0, 8).map((standing) => ({
    periodLabel: 'En cours',
    snapshotAt: new Date().toISOString(),
    playerId: standing.playerId,
    nickname: standing.nickname,
    avatarUrl: standing.avatarUrl,
    rank: standing.position,
    points: standing.points,
    exactScores: standing.exactScores,
    twoPointResults: standing.twoPointResults ?? 0,
    firstPredictionAt: standing.firstPredictionAt,
    isCurrent: true,
  }));

  return [
    ...frozenPeriods,
    {
      label: 'En cours',
      snapshotAt: new Date().toISOString(),
      isCurrent: true,
      entries: currentEntries.length > 0
        ? currentEntries
        : mockPeriod('En cours', ['p-francois', 'p-solene', 'p2', 'p1'], 3).entries.map((entry) => ({ ...entry, isCurrent: true })),
    },
  ];
};
