export type MatchStatus = 'upcoming' | 'live' | 'finished';
export type CompetitionCode = 'FL1' | 'PL' | 'PD' | 'CL' | 'WORLD' | 'TEST';

export interface Team {
  id: string;
  name: string;
  shortName: string;
  crest?: string;
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
  pointsMultiplier?: number;
  source?: string;
  lastUpdated?: string;
}

export interface Player {
  id: string;
  nickname: string;
  avatarUrl?: string;
  points: number;
  exactScores: number;
  correctResults: number;
  twoPointResults?: number;
  firstPredictionAt?: string | null;
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
  avatarUrl?: string;
  points: number;
  exactScores: number;
  correctResults: number;
  twoPointResults?: number;
  firstPredictionAt?: string | null;
}

export interface PublicPlayerStats {
  points: number;
  exactScores: number;
  twoPointResults: number;
  onePointResults: number;
  correctResults: number;
  rank?: number;
}

export interface PublicPlayerProfile {
  id: string;
  nickname: string;
  avatarUrl?: string;
  stats: PublicPlayerStats;
  predictions: PublicPrediction[];
}

export interface PublicPrediction {
  id: string;
  match: Match;
  prediction: Prediction;
  points?: number | null;
}

export interface ExactPredictionWinner {
  playerId: string;
  nickname: string;
  avatarUrl?: string;
  homeScore: number;
  awayScore: number;
}

export interface ExactPredictionHighlight {
  matchId: string;
  match: Match;
  winners: ExactPredictionWinner[];
}
