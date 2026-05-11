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
  if (closedPublicStatuses.has(status)) return true;

  const kickoff = new Date(match.kickoff).getTime();
  const minutesUntilKickoff = (kickoff - now.getTime()) / (1000 * 60);
  if (minutesUntilKickoff <= 60) return true;

  return !canEditPrediction(match, now);
};
