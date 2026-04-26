import type { Prediction } from '../types';

export const mockPredictions: Prediction[] = [
  {
    id: 'pred-1',
    matchId: 'm4',
    playerId: 'p1',
    homeScore: 2,
    awayScore: 1,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pred-2',
    matchId: 'm5',
    playerId: 'p1',
    homeScore: 0,
    awayScore: 0,
    updatedAt: new Date().toISOString(),
  },
];
