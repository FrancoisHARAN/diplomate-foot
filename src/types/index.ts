export type MatchStatus = 'upcoming' | 'live' | 'finished';
export type CompetitionCode = 'FL1' | 'PL' | 'PD' | 'CL' | 'WORLD' | 'WC2026' | 'TEST';

export interface Team {
  id: string;
  name: string;
  shortName: string;
  crest?: string;
  countryCode?: string;
  flagUrl?: string;
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
  stage?: string | null;
  round?: string | null;
  group?: string | null;
  season?: number | null;
  sourceCompetitionId?: string | null;
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
  worldCupTopThree?: WorldCupWinnerPrediction | null;
}

export interface PublicPrediction {
  id: string;
  match: Match;
  prediction: Prediction;
  points?: number | null;
  resultType: PredictionResultType;
}

export interface PublicMatchPrediction {
  id: string;
  playerId: string;
  nickname: string;
  avatarUrl?: string;
  homeScore: number;
  awayScore: number;
  points?: number | null;
  resultType: PredictionResultType;
  updatedAt?: string | null;
}

export type PredictionResultType = 'exact' | 'two-point' | 'winner' | 'lost' | 'pending';

export interface WorldCupWinnerPrediction {
  id: string;
  playerId: string;
  firstChoiceCode: string;
  secondChoiceCode: string;
  thirdChoiceCode: string;
  firstChoiceName?: string;
  secondChoiceName?: string;
  thirdChoiceName?: string;
  lockedAt?: string | null;
  createdAt?: string;
  updatedAt: string;
}

export type FlashChallengeStatus = 'open' | 'closed' | 'resolved';

export interface FlashOption {
  id: string;
  flashId: string;
  label: string;
  pointsIfCorrect: number;
  sortOrder: number;
}

export interface FlashChallenge {
  id: string;
  title: string;
  description?: string | null;
  matchId?: string | null;
  matchLabel?: string | null;
  closesAt: string;
  status: FlashChallengeStatus;
  resultOptionId?: string | null;
  options: FlashOption[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FlashPrediction {
  id: string;
  flashId: string;
  optionId: string;
  playerId: string;
  points?: number | null;
  createdAt?: string;
  updatedAt: string;
}

export interface PublicFlashPrediction {
  id: string;
  challenge: FlashChallenge;
  selectedOption: FlashOption;
  points?: number | null;
  resultType: 'won' | 'lost' | 'pending';
  updatedAt: string;
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

export interface LeaderboardHistoryEntry {
  periodLabel: string;
  snapshotAt: string;
  playerId: string;
  nickname: string;
  avatarUrl?: string;
  rank: number;
  points: number;
  exactScores: number;
  twoPointResults: number;
  firstPredictionAt?: string | null;
  isCurrent: boolean;
}

export interface LeaderboardHistoryPeriod {
  label: string;
  snapshotAt: string;
  isCurrent: boolean;
  entries: LeaderboardHistoryEntry[];
}
