import type { Prediction } from '../types';

export const mockPredictions: Prediction[] = [
  { id: 'pred-p1-m1', matchId: 'm1', playerId: 'p1', homeScore: 2, awayScore: 1, updatedAt: new Date().toISOString() },
  { id: 'pred-p1-m5', matchId: 'm5', playerId: 'p1', homeScore: 2, awayScore: 1, updatedAt: new Date().toISOString() },
  { id: 'pred-p2-m6', matchId: 'm6', playerId: 'p2', homeScore: 0, awayScore: 0, updatedAt: new Date().toISOString() },
  { id: 'pred-p3-m5', matchId: 'm5', playerId: 'p3', homeScore: 1, awayScore: 0, updatedAt: new Date().toISOString() },
];
