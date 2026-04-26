import { mockMatches } from '../data/mockMatches';
import type { Match } from '../types';

export const matchService = {
  list: (): Match[] => mockMatches,
  getById: (id: string): Match | undefined => mockMatches.find((match) => match.id === id),
  getUpcoming: (limit = 3): Match[] =>
    mockMatches
      .filter((match) => match.status === 'upcoming')
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
      .slice(0, limit),
};
