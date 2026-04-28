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
  return now.getTime() <= kickoff;
};

export const getMinutesBeforeLock = (match: Match, now = new Date()): number => {
  const kickoff = new Date(match.kickoff).getTime();
  return Math.max(0, Math.ceil((kickoff - now.getTime()) / (1000 * 60)));
};

export const getLiveMinute = (match: Match, now = new Date()): number | null => {
  if (match.status !== 'live') return null;
  if (typeof match.minute === 'number') return match.minute;

  const kickoff = new Date(match.kickoff).getTime();
  const elapsed = Math.floor((now.getTime() - kickoff) / (1000 * 60));
  if (elapsed < 1) return 1;
  return Math.min(elapsed, 120);
};

export const formatLastUpdated = (isoDate?: string | null): string | null => {
  if (!isoDate) return null;
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate));
};
