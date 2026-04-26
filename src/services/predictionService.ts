import { mockPredictions } from '../data/mockPredictions';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type { Match, Prediction } from '../types';
import { calculatePredictionPoints } from '../utils/points';
import { STORAGE_KEYS } from './storageKeys';

interface PredictionRow {
  id: string;
  match_id: string;
  player_id: string;
  home_score: number;
  away_score: number;
  points: number;
  updated_at: string;
}

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

const mapRowToPrediction = (row: PredictionRow): Prediction => ({
  id: row.id,
  matchId: row.match_id,
  playerId: row.player_id,
  homeScore: row.home_score,
  awayScore: row.away_score,
  points: row.points,
  updatedAt: row.updated_at,
});

const getAllPredictions = async (): Promise<Prediction[]> => {
  if (!isSupabaseConfigured || !supabase) return ensureSeeded();

  try {
    const { data, error } = await supabase
      .from('predictions')
      .select('id,match_id,player_id,home_score,away_score,points,updated_at');

    if (error) throw error;
    return (data ?? []).map(mapRowToPrediction);
  } catch (error) {
    console.warn('Unable to read predictions from Supabase, fallback to local data.', error);
    return ensureSeeded();
  }
};

export const predictionService = {
  getAllPredictions,

  getPredictionsForPlayer: async (playerId: string): Promise<Prediction[]> => {
    const predictions = await getAllPredictions();
    return predictions.filter((prediction) => prediction.playerId === playerId);
  },

  savePrediction: async (playerId: string, matchId: string, homeScore: number, awayScore: number): Promise<Prediction> => {
    if (!isSupabaseConfigured || !supabase) {
      const predictions = ensureSeeded();
      const existing = predictions.find((prediction) => prediction.playerId === playerId && prediction.matchId === matchId);

      const updated: Prediction = {
        id: existing?.id ?? `pred-${playerId}-${matchId}`,
        matchId,
        playerId,
        homeScore,
        awayScore,
        updatedAt: new Date().toISOString(),
      };

      const next = existing
        ? predictions.map((prediction) => (prediction.id === existing.id ? updated : prediction))
        : [...predictions, updated];
      writeStorage(next);
      return updated;
    }

    const { data, error } = await supabase
      .from('predictions')
      .upsert(
        {
          player_id: playerId,
          match_id: matchId,
          home_score: homeScore,
          away_score: awayScore,
          locked_at: new Date().toISOString(),
        },
        { onConflict: 'player_id,match_id' },
      )
      .select('id,match_id,player_id,home_score,away_score,points,updated_at')
      .single();

    if (error) throw error;

    const saved = data;
    if (!saved) throw new Error("Impossible d'enregistrer le pronostic.");
    return mapRowToPrediction(saved);
  },

  calculatePointsForPrediction: (prediction: Prediction, match: Match): number => {
    if (typeof match.homeScore !== 'number' || typeof match.awayScore !== 'number') return 0;
    return calculatePredictionPoints(prediction.homeScore, prediction.awayScore, match.homeScore, match.awayScore);
  },

  list: (): Prediction[] => ensureSeeded(),
  listByPlayer: (playerId: string): Prediction[] => ensureSeeded().filter((prediction) => prediction.playerId === playerId),
  upsert: (payload: Omit<Prediction, 'id' | 'updatedAt'> & { id?: string }): Prediction => {
    const predictions = ensureSeeded();
    const existing = predictions.find((prediction) => prediction.playerId === payload.playerId && prediction.matchId === payload.matchId);
    const updated: Prediction = {
      id: existing?.id ?? payload.id ?? `pred-${payload.playerId}-${payload.matchId}`,
      matchId: payload.matchId,
      playerId: payload.playerId,
      homeScore: payload.homeScore,
      awayScore: payload.awayScore,
      points: payload.points,
      updatedAt: new Date().toISOString(),
    };
    const next = existing
      ? predictions.map((prediction) => (prediction.id === existing.id ? updated : prediction))
      : [...predictions, updated];
    writeStorage(next);
    return updated;
  },
};
