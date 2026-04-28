import type { Prediction } from '../types';

const updatedAt = new Date().toISOString();

export const mockPredictions: Prediction[] = [
  { id: 'pred-p1-m1', matchId: 'm1', playerId: 'p1', homeScore: 2, awayScore: 1, updatedAt },
  { id: 'pred-p1-m5', matchId: 'm5', playerId: 'p1', homeScore: 2, awayScore: 1, updatedAt },
  { id: 'pred-p2-m6', matchId: 'm6', playerId: 'p2', homeScore: 0, awayScore: 0, updatedAt },
  { id: 'pred-p3-m5', matchId: 'm5', playerId: 'p3', homeScore: 1, awayScore: 0, updatedAt },
  { id: 'pred-p1-live-finished-1', matchId: 'fd-538122', playerId: 'p1', homeScore: 2, awayScore: 1, updatedAt },
  { id: 'pred-p2-live-finished-1', matchId: 'fd-538122', playerId: 'p2', homeScore: 1, awayScore: 1, updatedAt },
  { id: 'pred-p3-live-finished-2', matchId: 'fd-544523', playerId: 'p3', homeScore: 0, awayScore: 0, updatedAt },
  { id: 'pred-p1-demo-finished', matchId: 'test-finished-brazil-morocco', playerId: 'p1', homeScore: 2, awayScore: 1, updatedAt },
  { id: 'pred-p2-demo-finished', matchId: 'test-finished-brazil-morocco', playerId: 'p2', homeScore: 1, awayScore: 0, updatedAt },
];
