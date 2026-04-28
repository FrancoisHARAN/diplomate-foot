import { mockMatches } from '../data/mockMatches';
import { mockPlayers } from '../data/mockPlayers';
import { mockPredictions } from '../data/mockPredictions';
import type { Match, Player, Prediction, Standing } from '../types';
import { canEditPrediction } from './date';
import { calculatePredictionPoints } from './points';

const STORAGE_KEYS = {
  currentPlayer: 'diplomate.currentPlayer',
  predictions: 'diplomate.predictions',
};

export interface CurrentPlayer {
  id: string;
  nickname: string;
}

const readJson = <T>(key: string, fallback: T): T => {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

const normalizeNickname = (nickname: string): string => nickname.trim().toLowerCase();

const findOrCreatePlayer = (nickname: string, code: string): Player => {
  const clean = nickname.trim();
  const existing = mockPlayers.find((player) => normalizeNickname(player.nickname) === normalizeNickname(clean));

  if (existing) {
    if (existing.secretCode && existing.secretCode !== code.trim()) {
      throw new Error('Code secret incorrect pour ce joueur.');
    }
    return existing;
  }

  if (code.trim().length < 4) {
    throw new Error('Le code secret doit contenir au moins 4 caractères.');
  }

  return {
    id: `guest-${clean.toLowerCase().replace(/\s+/g, '-') || Date.now()}`,
    nickname: clean || 'Joueur',
    secretCode: code.trim(),
    points: 0,
    exactScores: 0,
    correctResults: 0,
  };
};

export const getCurrentPlayer = (): CurrentPlayer | null => readJson<CurrentPlayer | null>(STORAGE_KEYS.currentPlayer, null);

export const loginPlayer = (nickname: string, code: string): CurrentPlayer => {
  const player = findOrCreatePlayer(nickname, code);
  const auth = { id: player.id, nickname: player.nickname };
  writeJson(STORAGE_KEYS.currentPlayer, auth);
  return auth;
};

export const logoutPlayer = (): void => {
  localStorage.removeItem(STORAGE_KEYS.currentPlayer);
};

export const getStoredPredictions = (): Prediction[] => {
  const existing = readJson<Prediction[]>(STORAGE_KEYS.predictions, []);
  if (existing.length > 0) return existing;
  writeJson(STORAGE_KEYS.predictions, mockPredictions);
  return mockPredictions;
};

export const getPredictionForMatch = (matchId: string): Prediction | undefined => {
  const current = getCurrentPlayer();
  if (!current) return undefined;
  return getStoredPredictions().find((prediction) => prediction.matchId === matchId && prediction.playerId === current.id);
};

export const savePrediction = (matchId: string, homeScore: number, awayScore: number): Prediction => {
  const player = getCurrentPlayer();
  if (!player) throw new Error('Joueur non connecté');

  const all = getStoredPredictions();
  const existing = all.find((prediction) => prediction.matchId === matchId && prediction.playerId === player.id);

  const nextPrediction: Prediction = {
    id: existing?.id ?? `pred-${player.id}-${matchId}`,
    playerId: player.id,
    matchId,
    homeScore,
    awayScore,
    updatedAt: new Date().toISOString(),
  };

  const next = existing
    ? all.map((prediction) => (prediction.id === existing.id ? nextPrediction : prediction))
    : [...all, nextPrediction];

  writeJson(STORAGE_KEYS.predictions, next);
  return nextPrediction;
};

export const countUserPredictions = (): number => {
  const player = getCurrentPlayer();
  if (!player) return 0;
  return getStoredPredictions().filter((prediction) => prediction.playerId === player.id).length;
};

const calculateFinishedPoints = (playerId: string, predictions: Prediction[], matches: Match[]): number => {
  const finishedById = new Map(matches.filter((match) => match.status === 'finished').map((match) => [match.id, match]));

  return predictions
    .filter((prediction) => prediction.playerId === playerId)
    .reduce((sum, prediction) => {
      const match = finishedById.get(prediction.matchId);
      if (!match || typeof match.homeScore !== 'number' || typeof match.awayScore !== 'number') return sum;
      return sum + calculatePredictionPoints(prediction.homeScore, prediction.awayScore, match.homeScore, match.awayScore);
    }, 0);
};

export const getUserPointsMock = (): number => {
  const player = getCurrentPlayer();
  if (!player) return 0;

  const base = mockPlayers.find((entry) => entry.id === player.id)?.points ?? 0;
  const dynamic = calculateFinishedPoints(player.id, getStoredPredictions(), mockMatches);
  return Math.max(base, dynamic);
};

export const getUserRankMock = (): number | null => {
  const player = getCurrentPlayer();
  if (!player) return null;
  const standings = buildStandings(mockPlayers, getStoredPredictions(), mockMatches);
  return standings.find((entry) => entry.playerId === player.id)?.position ?? standings.length + 1;
};

export type PredictionUiStatus = 'open' | 'closing' | 'closed' | 'done';

export const getPredictionUiStatus = (match: Match, prediction?: Prediction): PredictionUiStatus => {
  if (match.status === 'finished') return 'done';
  if (match.status === 'live') return 'closed';
  if (!canEditPrediction(match)) return 'closed';

  const kickoff = new Date(match.kickoff).getTime();
  const diffMinutes = (kickoff - Date.now()) / (1000 * 60);
  if (diffMinutes <= 180) return 'closing';
  if (prediction) return 'open';
  return 'open';
};

export const buildStandings = (players: Player[], predictions: Prediction[], matches: Match[]): Standing[] =>
  players
    .map((player) => {
      const computed = calculateFinishedPoints(player.id, predictions, matches);
      return {
        position: 0,
        playerId: player.id,
        nickname: player.nickname,
        points: Math.max(player.points, computed),
        exactScores: player.exactScores,
        correctResults: player.correctResults,
      };
    })
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ ...entry, position: index + 1 }));

export const getUserRank = (standings: Standing[], playerId?: string) => standings.find((entry) => entry.playerId === playerId);
