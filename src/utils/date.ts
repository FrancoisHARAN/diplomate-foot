import type { Match, MatchStatus } from '../types';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
});

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
});

export const formatKickoff = (isoDate: string): string => {
  const date = new Date(isoDate);
  return `${dateFormatter.format(date)} · ${timeFormatter.format(date)}`;
};

export const formatKickoffDay = (isoDate: string): string => dateFormatter.format(new Date(isoDate));

export const formatKickoffTime = (isoDate: string): string => timeFormatter.format(new Date(isoDate));

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

export const getMinutesBeforeLock = (match: Match, now = new Date()): number => {
  const kickoff = new Date(match.kickoff).getTime();
  const oneHourBefore = kickoff - 60 * 60 * 1000;
  return Math.max(0, Math.ceil((oneHourBefore - now.getTime()) / (1000 * 60)));
};
