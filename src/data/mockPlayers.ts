import type { Player } from '../types';

export const mockPlayers: Player[] = [
  { id: 'p-francois', nickname: 'François', secretCode: '1234', points: 0, exactScores: 0, correctResults: 0 },
  { id: 'p-solene', nickname: 'Solène', secretCode: '1234', points: 0, exactScores: 0, correctResults: 0 },
  { id: 'p1', nickname: 'Nico', secretCode: '1234', points: 12, exactScores: 3, correctResults: 3 },
  { id: 'p2', nickname: 'Sarah', secretCode: '5678', points: 10, exactScores: 2, correctResults: 4 },
  { id: 'p3', nickname: 'Marco', secretCode: '2222', points: 8, exactScores: 2, correctResults: 2 },
  { id: 'p4', nickname: 'Julie', secretCode: '1111', points: 6, exactScores: 1, correctResults: 3 },
  { id: 'p5', nickname: 'Alex', secretCode: '9876', points: 4, exactScores: 1, correctResults: 1 },
];
