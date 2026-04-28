export type MatchStatus = 'upcoming' | 'live' | 'finished';
export type CompetitionCode = 'FL1' | 'PL' | 'PD' | 'CL' | 'WORLD' | 'TEST';

export interface Team {
  id: string;
  name: string;
  shortName: string;
}

export interface Match {
  id: string;
  externalId?: string;
  competitionCode?: CompetitionCode;
  competitionName?: string;
  homeTeam: Team;
  awayTeam: Team;
  kickoff: string;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  minute?: number | null;
  venue?: string;
  matchday?: number | null;
  source?: string;
  lastUpdated?: string;
}

export interface Player {
  id: string;
  nickname: string;
  secretCode?: string;
  points: number;
  exactScores: number;
  correctResults: number;
}

export interface Prediction {
  id: string;
  matchId: string;
  playerId: string;
  homeScore: number;
  awayScore: number;
  points?: number;
  updatedAt: string;
}

export interface Standing {
  position: number;
  playerId: string;
  nickname: string;
  points: number;
  exactScores: number;
  correctResults: number;
}
