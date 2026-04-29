import { useEffect, useMemo, useState } from 'react';
import type { Standing } from '../types';

const SNAPSHOT_KEY = 'diplomate.rankingSnapshot.v1';
const MOVEMENTS_KEY = 'diplomate.rankingMovements.v1';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export interface RankingMovement {
  direction: 'up' | 'down';
  places: number;
  changedAt: string;
  expiresAt: string;
}

const readJson = <T>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '') as T;
  } catch {
    return fallback;
  }
};

const writeJson = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

const removeExpired = (movements: Record<string, RankingMovement>, now = Date.now()): Record<string, RankingMovement> =>
  Object.fromEntries(Object.entries(movements).filter(([, movement]) => new Date(movement.expiresAt).getTime() > now));

export const useRankingMovements = (standings: Standing[]): Record<string, RankingMovement> => {
  const [movements, setMovements] = useState<Record<string, RankingMovement>>(() => removeExpired(readJson(MOVEMENTS_KEY, {})));
  const signature = useMemo(() => standings.map((row) => `${row.playerId}:${row.position}`).join('|'), [standings]);

  useEffect(() => {
    if (standings.length === 0) return;

    const now = Date.now();
    const previousPositions = readJson<Record<string, number>>(SNAPSHOT_KEY, {});
    const nextPositions = Object.fromEntries(standings.map((row) => [row.playerId, row.position]));
    const nextMovements = removeExpired(readJson<Record<string, RankingMovement>>(MOVEMENTS_KEY, {}), now);

    standings.forEach((row) => {
      const previousPosition = previousPositions[row.playerId];
      if (!previousPosition || previousPosition === row.position) return;

      nextMovements[row.playerId] = {
        direction: row.position < previousPosition ? 'up' : 'down',
        places: Math.abs(previousPosition - row.position),
        changedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + THREE_DAYS_MS).toISOString(),
      };
    });

    writeJson(SNAPSHOT_KEY, nextPositions);
    writeJson(MOVEMENTS_KEY, nextMovements);
    setMovements(nextMovements);
  }, [signature]);

  return movements;
};
