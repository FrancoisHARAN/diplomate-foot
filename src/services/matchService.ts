import { mockMatches } from '../data/mockMatches';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type { Match, MatchStatus } from '../types';
import { STORAGE_KEYS } from './storageKeys';

interface MatchRow {
  id: string;
  home_team: string;
  away_team: string;
  kickoff: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
}

const toShortName = (name: string): string => name.slice(0, 3).toUpperCase();

const mapRowToMatch = (row: MatchRow): Match => ({
  id: row.id,
  homeTeam: { id: `t-${row.home_team.toLowerCase()}`, name: row.home_team, shortName: toShortName(row.home_team) },
  awayTeam: { id: `t-${row.away_team.toLowerCase()}`, name: row.away_team, shortName: toShortName(row.away_team) },
  kickoff: row.kickoff,
  status: row.status,
  homeScore: row.home_score ?? undefined,
  awayScore: row.away_score ?? undefined,
});

const readMatchesStorage = (): Match[] => {
  const raw = localStorage.getItem(STORAGE_KEYS.matches);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Match[];
  } catch {
    return [];
  }
};

const writeMatchesStorage = (matches: Match[]) => localStorage.setItem(STORAGE_KEYS.matches, JSON.stringify(matches));

const getFallbackMatches = (): Match[] => {
  const stored = readMatchesStorage();
  if (stored.length > 0) return stored;
  writeMatchesStorage(mockMatches);
  return mockMatches;
};

const getAll = async (): Promise<Match[]> => {
  if (!isSupabaseConfigured || !supabase) return getFallbackMatches();

  try {
    const data = await supabase.select<MatchRow>(
      'matches?select=id,home_team,away_team,kickoff,status,home_score,away_score&order=kickoff.asc',
    );
    return data.map(mapRowToMatch);
  } catch (error) {
    console.warn('Unable to read matches from Supabase, fallback to local data.', error);
    return getFallbackMatches();
  }
};

export const matchService = {
  getAll,

  getUpcoming: async (limit = 3): Promise<Match[]> => {
    const matches = await getAll();
    return matches
      .filter((match) => match.status === 'upcoming')
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
      .slice(0, limit);
  },

  getById: async (id: string): Promise<Match | undefined> => {
    const matches = await getAll();
    return matches.find((match) => match.id === id);
  },

  createTestMatches: async (): Promise<number> => {
    if (!isSupabaseConfigured || !supabase) return 0;

    const payload = mockMatches.slice(0, 3).map((match) => ({
      external_id: `mock-${match.id}`,
      home_team: match.homeTeam.name,
      away_team: match.awayTeam.name,
      kickoff: match.kickoff,
      status: match.status,
    }));

    await supabase.insert('matches?on_conflict=external_id&select=id', payload, true);
    return payload.length;
  },

  list: (): Match[] => getFallbackMatches(),
};
