import type { Match, MatchStatus } from '../types';
import { isMatchFinal } from './points';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
});

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
});

const longDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export const formatKickoff = (isoDate: string): string => {
  const date = new Date(isoDate);
  return `${dateFormatter.format(date)} · ${timeFormatter.format(date)}`;
};

export const formatKickoffDay = (isoDate: string): string => dateFormatter.format(new Date(isoDate));

export const formatKickoffTime = (isoDate: string): string => timeFormatter.format(new Date(isoDate));

export const formatKickoffLong = (isoDate: string): string => {
  const date = new Date(isoDate);
  return `${longDateFormatter.format(date)} à ${timeFormatter.format(date).replace(':', 'h')}`;
};

export const getMatchStatusLabel = (status: MatchStatus): string => {
  const normalized = String(status ?? '').toLowerCase();
  if (isMatchFinal({ status })) return 'Terminé';
  if (['live', 'in_play', 'in-progress', 'in_progress', 'inplay', 'paused', 'en cours'].includes(normalized)) return 'En cours';

  const labels: Record<MatchStatus, string> = {
    upcoming: 'À venir',
    live: 'En cours',
    finished: 'Terminé',
  };
  return labels[status] ?? 'À venir';
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

export const formatTimeUntilKickoff = (match: Match, now = new Date()): string => {
  const totalMinutes = getMinutesBeforeLock(match, now);
  if (totalMinutes <= 0) return 'Prono fermé';

  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (days > 0) parts.push(`${days} j`);
  if (hours > 0) parts.push(`${hours} h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes} min`);

  return `Dans ${parts.join(' ')}`;
};

export const isLiveDisplayMatch = (match: Match, now = new Date()): boolean => {
  if (match.status === 'live') return true;
  if (match.status === 'finished') return false;

  const kickoff = new Date(match.kickoff).getTime();
  const elapsed = now.getTime() - kickoff;
  return elapsed >= 0 && elapsed <= 3 * 60 * 60 * 1000;
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
