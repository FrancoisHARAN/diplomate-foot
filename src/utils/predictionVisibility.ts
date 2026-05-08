import type { Match } from '../types';
import { canEditPrediction } from './date';

export const isPredictionPublic = (match: Match, now = new Date()): boolean => {
  if (match.status === 'live' || match.status === 'finished') return true;

  const kickoff = new Date(match.kickoff).getTime();
  const minutesUntilKickoff = (kickoff - now.getTime()) / (1000 * 60);
  if (minutesUntilKickoff <= 60) return true;

  return !canEditPrediction(match, now);
};
