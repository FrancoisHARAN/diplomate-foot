import { mockPredictions } from '../data/mockPredictions';
import type { Prediction } from '../types';
import { STORAGE_KEYS } from './storageKeys';

const readStorage = (): Prediction[] => {
  const raw = localStorage.getItem(STORAGE_KEYS.predictions);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as Prediction[];
  } catch {
    return [];
  }
};

const writeStorage = (predictions: Prediction[]): void => {
  localStorage.setItem(STORAGE_KEYS.predictions, JSON.stringify(predictions));
};

const ensureSeeded = (): Prediction[] => {
  const existing = readStorage();
  if (existing.length > 0) return existing;

  writeStorage(mockPredictions);
  return mockPredictions;
};

export const predictionService = {
  list: (): Prediction[] => ensureSeeded(),
  listByPlayer: (playerId: string): Prediction[] => ensureSeeded().filter((prediction) => prediction.playerId === playerId),
  upsert: (payload: Omit<Prediction, 'id' | 'updatedAt'> & { id?: string }): Prediction => {
    const predictions = ensureSeeded();
    const existing = predictions.find(
      (prediction) => prediction.playerId === payload.playerId && prediction.matchId === payload.matchId,
    );

    const updated: Prediction = {
      id: existing?.id ?? payload.id ?? `pred-${payload.playerId}-${payload.matchId}`,
      matchId: payload.matchId,
      playerId: payload.playerId,
      homeScore: payload.homeScore,
      awayScore: payload.awayScore,
      updatedAt: new Date().toISOString(),
    };

    const next = existing
      ? predictions.map((prediction) => (prediction.id === existing.id ? updated : prediction))
      : [...predictions, updated];

    writeStorage(next);
    return updated;
  },
};
