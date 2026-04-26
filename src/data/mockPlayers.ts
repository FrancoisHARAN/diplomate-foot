import type { Player } from '../types';

export const mockPlayers: Player[] = [
  { id: 'p1', nickname: 'Nico', secretCode: '1234', points: 18, exactScores: 4, correctResults: 6 },
  { id: 'p2', nickname: 'Sarah', secretCode: '5678', points: 16, exactScores: 3, correctResults: 7 },
  { id: 'p3', nickname: 'Alex', secretCode: '9876', points: 13, exactScores: 2, correctResults: 5 },
  { id: 'p4', nickname: 'Marco', secretCode: '2222', points: 11, exactScores: 2, correctResults: 3 },
  { id: 'p5', nickname: 'Julie', secretCode: '1111', points: 10, exactScores: 1, correctResults: 4 },
];
