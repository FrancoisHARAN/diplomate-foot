import type { Match, MatchStatus } from '../types';

export const formatKickoff = (isoDate: string): string =>
  new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(isoDate));

export const getMatchStatusLabel = (status: MatchStatus): string => {
  const labels: Record<MatchStatus, string> = {
    upcoming: 'À venir',
    live: 'En cours',
    finished: 'Terminé',
  };
  return labels[status];
};

export const canEditPrediction = (match: Match, now = new Date()): boolean => {
  if (match.status !== 'upcoming') return false;
  const kickoff = new Date(match.kickoff).getTime();
  const oneHourBefore = kickoff - 60 * 60 * 1000;
  return now.getTime() < oneHourBefore;
};
