const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const URGENT_MS = 5 * HOUR_MS;

export type DeadlineTone = 'open' | 'urgent' | 'closed';

export const getRemainingMs = (deadline: string, now: Date = new Date()): number =>
  new Date(deadline).getTime() - now.getTime();

export const formatRemainingTime = (deadline: string, now: Date = new Date()): string => {
  const remainingMs = getRemainingMs(deadline, now);
  if (remainingMs <= 0) return 'Fermé';

  const totalSeconds = Math.ceil(remainingMs / SECOND_MS);
  const days = Math.floor(totalSeconds / (DAY_MS / SECOND_MS));
  const hours = Math.floor((totalSeconds % (DAY_MS / SECOND_MS)) / (HOUR_MS / SECOND_MS));
  const minutes = Math.floor((totalSeconds % (HOUR_MS / SECOND_MS)) / (MINUTE_MS / SECOND_MS));
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return [hours > 0 ? `${days}J` : `${days}J`, hours > 0 ? `${hours}H` : null]
      .filter(Boolean)
      .join(' ');
  }

  if (hours > 0) {
    return [minutes > 0 ? `${hours}H` : `${hours}H`, minutes > 0 ? `${minutes}M` : null]
      .filter(Boolean)
      .join(' ');
  }

  if (minutes > 0) {
    return seconds > 0 ? `${minutes}M ${String(seconds).padStart(2, '0')}S` : `${minutes}M`;
  }

  return `${seconds}S`;
};

export const getDeadlineTone = (deadline: string, now: Date = new Date(), closed = false): DeadlineTone => {
  const remainingMs = getRemainingMs(deadline, now);
  if (closed || remainingMs <= 0) return 'closed';
  return remainingMs < URGENT_MS ? 'urgent' : 'open';
};
