import type { Player } from '../types';

export const mockPlayers: Player[] = [
  { id: 'p-francois', nickname: 'François', secretCode: '123456', points: 0, exactScores: 0, correctResults: 0 },
  { id: 'p-solene', nickname: 'Solène', secretCode: '654321', points: 0, exactScores: 0, correctResults: 0 },
  { id: 'p1', nickname: 'Nico', secretCode: '111111', points: 24, exactScores: 8, correctResults: 12 },
  { id: 'p2', nickname: 'Sarah', secretCode: '222222', points: 18, exactScores: 5, correctResults: 10 },
  { id: 'p3', nickname: 'Marco', secretCode: '333333', points: 14, exactScores: 3, correctResults: 8 },
  { id: 'p4', nickname: 'Julie', secretCode: '444444', points: 9, exactScores: 2, correctResults: 5 },
  { id: 'p5', nickname: 'Alex', secretCode: '555555', points: 6, exactScores: 1, correctResults: 4 },
];
