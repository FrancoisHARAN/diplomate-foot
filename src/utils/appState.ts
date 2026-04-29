import { mockMatches } from '../data/mockMatches';
import { mockPlayers } from '../data/mockPlayers';
import { mockPredictions } from '../data/mockPredictions';
import type { Match, Player, Prediction, Standing } from '../types';
import { canEditPrediction } from './date';
import { applyMatchMultiplier, calculatePredictionPoints } from './points';

const STORAGE_KEYS = {
  currentPlayer: 'diplomate.currentPlayer',
  predictions: 'diplomate.predictions',
  profileImages: 'diplomate.profileImages',
};

export interface CurrentPlayer {
  id: string;
  nickname: string;
  avatarUrl?: string;
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

const normalizeIdentity = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const normalizeNickname = (nickname: string): string => normalizeIdentity(nickname);

export const canonicalPlayerId = (playerId?: string | null): string => {
  if (!playerId) return '';
  const normalized = normalizeIdentity(playerId);
  if (normalized.includes('francois')) return 'p-francois';
  if (normalized.includes('solene')) return 'p-solene';
  return playerId;
};

export const samePlayerId = (left?: string | null, right?: string | null): boolean =>
  Boolean(left && right && canonicalPlayerId(left) === canonicalPlayerId(right));

export const getPlayerProfileImages = (): Record<string, string> => readJson<Record<string, string>>(STORAGE_KEYS.profileImages, {});

export const getPlayerAvatarUrl = (playerId: string): string | undefined => {
  const images = getPlayerProfileImages();
  return images[playerId] ?? Object.entries(images).find(([storedPlayerId]) => samePlayerId(storedPlayerId, playerId))?.[1];
};

export const setPlayerProfileImage = (playerId: string, imageDataUrl: string): void => {
  const canonicalId = canonicalPlayerId(playerId);
  writeJson(STORAGE_KEYS.profileImages, { ...getPlayerProfileImages(), [playerId]: imageDataUrl, [canonicalId]: imageDataUrl });
  const current = getCurrentPlayer();
  if (current && samePlayerId(current.id, playerId)) {
    writeJson(STORAGE_KEYS.currentPlayer, { ...current, avatarUrl: imageDataUrl });
  }
};

const findOrCreatePlayer = (nickname: string, code: string): Player => {
  const clean = nickname.trim();
  const existing = mockPlayers.find((player) => normalizeNickname(player.nickname) === normalizeNickname(clean));

  if (existing) {
    if (existing.secretCode && existing.secretCode !== code.trim()) {
      throw new Error('Code secret incorrect pour ce joueur.');
    }
    return existing;
  }

  if (code.trim().length < 6) {
    throw new Error('Le code secret doit contenir 6 chiffres.');
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
  const auth = { id: player.id, nickname: player.nickname, avatarUrl: getPlayerAvatarUrl(player.id) ?? player.avatarUrl };
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

const predictionTimestamp = (prediction: Prediction): number => new Date(prediction.updatedAt).getTime() || 0;

export const getPredictionsForPlayer = (playerId?: string | null, predictions: Prediction[] = getStoredPredictions()): Prediction[] => {
  if (!playerId) return [];

  const byMatch = new Map<string, Prediction>();
  predictions
    .filter((prediction) => samePlayerId(prediction.playerId, playerId))
    .forEach((prediction) => {
      const existing = byMatch.get(prediction.matchId);
      if (!existing || predictionTimestamp(prediction) >= predictionTimestamp(existing)) {
        byMatch.set(prediction.matchId, prediction);
      }
    });

  return Array.from(byMatch.values());
};

export const getPredictionForMatch = (matchId: string): Prediction | undefined => {
  const current = getCurrentPlayer();
  if (!current) return undefined;
  return getPredictionsForPlayer(current.id).find((prediction) => prediction.matchId === matchId);
};

export const savePrediction = (match: Match, homeScore: number, awayScore: number): Prediction => {
  const player = getCurrentPlayer();
  if (!player) throw new Error('Joueur non connecté');
  if (!canEditPrediction(match, new Date())) {
    throw new Error('Le match a commencé, ce prono est verrouillé.');
  }

  const all = getStoredPredictions();
  const playerId = canonicalPlayerId(player.id) || player.id;
  const existing = all.find((prediction) => prediction.matchId === match.id && samePlayerId(prediction.playerId, player.id));

  const nextPrediction: Prediction = {
    id: existing?.id ?? `pred-${playerId}-${match.id}`,
    playerId,
    matchId: match.id,
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
  return getPredictionsForPlayer(player.id).length;
};

const calculateFinishedStats = (playerId: string, predictions: Prediction[], matches: Match[]) => {
  const finishedById = new Map(matches.filter((match) => match.status === 'finished').map((match) => [match.id, match]));

  return getPredictionsForPlayer(playerId, predictions)
    .reduce(
      (stats, prediction) => {
        const match = finishedById.get(prediction.matchId);
        if (!match || typeof match.homeScore !== 'number' || typeof match.awayScore !== 'number') return stats;
        const basePoints = calculatePredictionPoints(prediction.homeScore, prediction.awayScore, match.homeScore, match.awayScore);
        return {
          points: stats.points + applyMatchMultiplier(basePoints, match),
          exactScores: stats.exactScores + (basePoints === 3 ? 1 : 0),
          correctResults: stats.correctResults + (basePoints > 0 ? 1 : 0),
        };
      },
      { points: 0, exactScores: 0, correctResults: 0 },
    );
};

export const getUserPointsMock = (matches: Match[] = mockMatches): number => {
  const player = getCurrentPlayer();
  if (!player) return 0;

  const base = mockPlayers.find((entry) => samePlayerId(entry.id, player.id))?.points ?? 0;
  const dynamic = calculateFinishedStats(player.id, getStoredPredictions(), matches).points;
  return Math.max(base, dynamic);
};

export const getUserRankMock = (matches: Match[] = mockMatches): number | null => {
  const player = getCurrentPlayer();
  if (!player) return null;
  const standings = buildStandings(mockPlayers, getStoredPredictions(), matches);
  return standings.find((entry) => samePlayerId(entry.playerId, player.id))?.position ?? standings.length + 1;
};

export type PredictionUiStatus = 'open' | 'closing' | 'closed' | 'done';

export const getPredictionUiStatus = (match: Match, prediction?: Prediction): PredictionUiStatus => {
  if (match.status === 'finished') return 'done';
  if (match.status === 'live') return 'closed';
  if (!canEditPrediction(match)) return 'closed';

  const kickoff = new Date(match.kickoff).getTime();
  const diffMinutes = (kickoff - Date.now()) / (1000 * 60);
  if (diffMinutes <= 60) return 'closing';
  if (prediction) return 'open';
  return 'open';
};

const nicknameFromPlayerId = (playerId: string): string => {
  const normalized = normalizeIdentity(playerId);
  if (normalized.includes('francois')) return 'François';
  if (normalized.includes('solene')) return 'Solène';

  const cleaned = playerId.replace(/^guest-/, '').replace(/^p-/, '').replace(/[-_]+/g, ' ').trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Joueur';
};

const buildPlayerPool = (players: Player[], predictions: Prediction[]): Player[] => {
  const byCanonicalId = new Map<string, Player>();

  players.forEach((player) => {
    byCanonicalId.set(canonicalPlayerId(player.id), player);
  });

  const current = getCurrentPlayer();
  if (current) {
    const currentId = canonicalPlayerId(current.id) || current.id;
    const existing = byCanonicalId.get(currentId);
    byCanonicalId.set(currentId, {
      id: existing?.id ?? currentId,
      nickname: existing?.nickname ?? current.nickname,
      secretCode: existing?.secretCode,
      avatarUrl: current.avatarUrl ?? existing?.avatarUrl,
      points: existing?.points ?? 0,
      exactScores: existing?.exactScores ?? 0,
      correctResults: existing?.correctResults ?? 0,
    });
  }

  predictions.forEach((prediction) => {
    const predictionPlayerId = canonicalPlayerId(prediction.playerId) || prediction.playerId;
    if (byCanonicalId.has(predictionPlayerId)) return;
    byCanonicalId.set(predictionPlayerId, {
      id: predictionPlayerId,
      nickname: nicknameFromPlayerId(prediction.playerId),
      points: 0,
      exactScores: 0,
      correctResults: 0,
    });
  });

  return Array.from(byCanonicalId.values());
};

export const buildStandings = (players: Player[], predictions: Prediction[], matches: Match[]): Standing[] =>
  buildPlayerPool(players, predictions)
    .map((player) => {
      const computed = calculateFinishedStats(player.id, predictions, matches);
      return {
        position: 0,
        playerId: player.id,
        nickname: player.nickname,
        avatarUrl: getPlayerAvatarUrl(player.id) ?? player.avatarUrl,
        points: Math.max(player.points, computed.points),
        exactScores: Math.max(player.exactScores, computed.exactScores),
        correctResults: Math.max(player.correctResults, computed.correctResults),
      };
    })
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ ...entry, position: index + 1 }));

export const getUserRank = (standings: Standing[], playerId?: string) => standings.find((entry) => samePlayerId(entry.playerId, playerId));
