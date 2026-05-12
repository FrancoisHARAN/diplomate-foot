import type { Match } from '../types';
import { canEditPrediction } from './date';

const closedPublicStatuses = new Set([
  'live',
  'finished',
  'locked',
  'closed',
  'in_progress',
  'in-progress',
  'inplay',
  'in_play',
  'started',
]);

export const isPredictionPublic = (match: Match, now = new Date()): boolean => {
  const status = String(match.status).toLowerCase();
  return closedPublicStatuses.has(status) || !canEditPrediction(match, now);
};

export const isMatchClosedForPredictions = (match: Match, now = new Date()): boolean => !canEditPrediction(match, now);

export const isPredictionPubliclyVisible = isPredictionPublic;
