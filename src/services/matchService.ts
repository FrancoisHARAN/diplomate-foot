import { mockMatches } from '../data/mockMatches';
import type { Match } from '../types';

export const matchService = {
  getAll: async (): Promise<Match[]> => mockMatches,
  getById: async (id: string): Promise<Match | undefined> => mockMatches.find((match) => match.id === id),
  getUpcoming: async (limit = 3): Promise<Match[]> => mockMatches.filter((m) => m.status === 'upcoming').slice(0, limit),
  list: (): Match[] => mockMatches,
};
