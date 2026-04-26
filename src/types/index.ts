export type MatchStatus = 'upcoming' | 'live' | 'finished';

export interface Team {
  id: string;
  name: string;
  shortName: string;
}

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  kickoff: string;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
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
