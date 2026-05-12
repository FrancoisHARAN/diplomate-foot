import { WORLD_CUP_WINNER_COUNTRIES, WORLD_CUP_WINNER_POINTS_BY_POSITION } from '../config/worldCupWinnerPredictions';
import type { WorldCupWinnerPrediction } from '../types';

const validCountryCodes = new Set(WORLD_CUP_WINNER_COUNTRIES.map((country) => country.code));

export const getWorldCupWinnerCountryName = (code?: string | null): string => {
  const country = WORLD_CUP_WINNER_COUNTRIES.find((item) => item.code === code);
  return country?.name ?? code ?? '';
};

export const validateWorldCupWinnerPredictionCodes = (codes: string[]): string | null => {
  if (codes.length !== 3 || codes.some((code) => !code)) return 'Choisis 3 pays.';
  if (new Set(codes).size !== 3) return 'Tu dois choisir 3 pays différents.';
  if (codes.some((code) => !validCountryCodes.has(code))) return 'Un des pays sélectionnés n’est pas disponible.';
  return null;
};

export const calculateWorldCupWinnerPredictionPoints = (
  prediction: Pick<WorldCupWinnerPrediction, 'firstChoiceCode' | 'secondChoiceCode' | 'thirdChoiceCode'> | null | undefined,
  championCode?: string | null,
): number => {
  if (!prediction || !championCode) return 0;
  const choices = [prediction.firstChoiceCode, prediction.secondChoiceCode, prediction.thirdChoiceCode];
  const index = choices.findIndex((code) => code === championCode);
  return index >= 0 ? WORLD_CUP_WINNER_POINTS_BY_POSITION[index] : 0;
};
