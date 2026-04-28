import { mockMatches } from '../data/mockMatches';
import { mockPlayers } from '../data/mockPlayers';
import { mockPredictions } from '../data/mockPredictions';
import type { Match, Player, Prediction, Standing } from '../types';
import { calculatePredictionPoints } from './points';
import { canEditPrediction } from './date';

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

const findOrCreatePlayer = (nickname: string): Player => {
  const existing = mockPlayers.find((p) => p.nickname.toLowerCase() === nickname.toLowerCase());
  if (existing) return existing;
  return {
    id: `guest-${nickname.trim().toLowerCase().replace(/\s+/g, '-') || Date.now()}`,
    nickname: nickname.trim(),
    points: 0,
    exactScores: 0,
    correctResults: 0,
  };
};

export const getCurrentPlayer = (): CurrentPlayer | null => readJson<CurrentPlayer | null>(STORAGE_KEYS.currentPlayer, null);

export const loginPlayer = (nickname: string, _code: string): CurrentPlayer => {
  const clean = nickname.trim();
  const player = findOrCreatePlayer(clean || 'Joueur');
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
  if (!player) throw new Error('Player not connected');

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

export const getUserPointsMock = (): number => {
  const player = getCurrentPlayer();
  if (!player) return 0;

  const base = mockPlayers.find((p) => p.id === player.id)?.points ?? 0;
  const finishedById = new Map(mockMatches.filter((match) => match.status === 'finished').map((match) => [match.id, match]));

  const dynamic = getStoredPredictions()
    .filter((prediction) => prediction.playerId === player.id)
    .reduce((sum, prediction) => {
      const match = finishedById.get(prediction.matchId);
      if (!match || typeof match.homeScore !== 'number' || typeof match.awayScore !== 'number') return sum;
      return sum + calculatePredictionPoints(prediction.homeScore, prediction.awayScore, match.homeScore, match.awayScore);
    }, 0);

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

export const buildStandings = (players: Player[], predictions: Prediction[], matches: Match[]): Standing[] => {
  const matchesById = new Map(matches.map((match) => [match.id, match]));
  const pointsByPlayer = new Map<string, number>();

  predictions.forEach((prediction) => {
    const match = matchesById.get(prediction.matchId);
    if (!match || typeof match.homeScore !== 'number' || typeof match.awayScore !== 'number') return;
    const points = calculatePredictionPoints(prediction.homeScore, prediction.awayScore, match.homeScore, match.awayScore);
    pointsByPlayer.set(prediction.playerId, (pointsByPlayer.get(prediction.playerId) ?? 0) + points);
  });

  return players
    .map((player) => ({
      position: 0,
      playerId: player.id,
      nickname: player.nickname,
      points: pointsByPlayer.get(player.id) ?? player.points,
      exactScores: player.exactScores,
      correctResults: player.correctResults,
    }))
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ ...entry, position: index + 1 }));
};

export const getUserRank = (standings: Standing[], playerId?: string) => standings.find((entry) => entry.playerId === playerId);
