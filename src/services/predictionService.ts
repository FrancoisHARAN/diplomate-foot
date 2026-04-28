import { mockPredictions } from '../data/mockPredictions';
import type { Match, Prediction } from '../types';
import { calculatePredictionPoints } from '../utils/points';

const STORAGE_KEY = 'diplomate.predictions';

const getAll = (): Prediction[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw) as Prediction[];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mockPredictions));
  return mockPredictions;
};

export const predictionService = {
  getAllPredictions: async (): Promise<Prediction[]> => getAll(),
  getPredictionsForPlayer: async (playerId: string): Promise<Prediction[]> => getAll().filter((p) => p.playerId === playerId),
  savePrediction: async (playerId: string, matchId: string, homeScore: number, awayScore: number): Promise<Prediction> => {
    const all = getAll();
    const existing = all.find((prediction) => prediction.playerId === playerId && prediction.matchId === matchId);
    const next: Prediction = {
      id: existing?.id ?? `pred-${playerId}-${matchId}`,
      playerId,
      matchId,
      homeScore,
      awayScore,
      updatedAt: new Date().toISOString(),
    };
    const merged = existing ? all.map((prediction) => (prediction.id === existing.id ? next : prediction)) : [...all, next];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return next;
  },
  calculatePointsForPrediction: (prediction: Prediction, match: Match): number => {
    if (typeof match.homeScore !== 'number' || typeof match.awayScore !== 'number') return 0;
    return calculatePredictionPoints(prediction.homeScore, prediction.awayScore, match.homeScore, match.awayScore);
  },
};
