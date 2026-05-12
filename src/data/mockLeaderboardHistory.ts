import type { LeaderboardHistoryPeriod, Standing } from '../types';

interface HistoryMockPlayer {
  playerId: string;
  nickname: string;
  avatarUrl?: string;
  points: number;
}

const demoPlayers: HistoryMockPlayer[] = [
  { playerId: 'p-francois', nickname: 'Francois', points: 36 },
  { playerId: 'p-solene', nickname: 'Solene', points: 29 },
  { playerId: 'p2', nickname: 'Sarah', points: 24 },
  { playerId: 'p1', nickname: 'Nico', points: 18 },
];

const toIso = (daysAgo: number): string => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

const dayLabel = (iso: string): string =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(new Date(iso));

const pointsForDay = (finalPoints: number, dayIndex: number, totalDays: number, playerIndex: number): number => {
  if (finalPoints <= 0) return 0;
  const progress = dayIndex / Math.max(1, totalDays - 1);
  const wave = Math.max(0, Math.sin((dayIndex + playerIndex) * 1.1)) * 2;
  return Math.min(finalPoints, Math.floor(finalPoints * progress + wave));
};

export const buildMockLeaderboardHistory = (currentStandings: Standing[]): LeaderboardHistoryPeriod[] => {
  const sourcePlayers: HistoryMockPlayer[] = currentStandings.length > 0
    ? currentStandings.slice(0, 8).map((standing) => ({
        playerId: standing.playerId,
        nickname: standing.nickname,
        avatarUrl: standing.avatarUrl,
        points: standing.points,
      }))
    : demoPlayers;

  const days = Array.from({ length: 15 }, (_, index) => {
    const daysAgo = 14 - index;
    return toIso(daysAgo);
  });

  return days.map((snapshotAt, dayIndex) => {
    const entries = sourcePlayers
      .map((player, playerIndex) => ({
        periodLabel: dayLabel(snapshotAt),
        snapshotAt,
        playerId: player.playerId,
        nickname: player.nickname,
        avatarUrl: player.avatarUrl,
        rank: 0,
        points: pointsForDay(player.points, dayIndex, days.length, playerIndex),
        exactScores: 0,
        twoPointResults: 0,
        firstPredictionAt: dayIndex > 0 ? snapshotAt : null,
        isCurrent: dayIndex === days.length - 1,
      }))
      .sort((left, right) => right.points - left.points || left.nickname.localeCompare(right.nickname, 'fr'));

    return {
      label: dayIndex === days.length - 1 ? "Aujourd'hui" : dayLabel(snapshotAt),
      snapshotAt,
      isCurrent: dayIndex === days.length - 1,
      entries: entries.map((entry, index) => ({ ...entry, rank: index + 1 })),
    };
  });
};
