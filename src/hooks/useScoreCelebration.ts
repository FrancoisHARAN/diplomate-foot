import { useEffect, useMemo, useState } from 'react';
import type { Match } from '../types';
import { canonicalPlayerId, getUserPointsMock, type CurrentPlayer } from '../utils/appState';

const STORAGE_KEY = 'diplomate.worldCup2026.scoreSnapshots.v1';
const CELEBRATION_GIFS = [
  'celebration-01.gif',
  'celebration-02.gif',
  'celebration-03.gif',
  'celebration-04.gif',
  'celebration-05.gif',
  'celebration-06.gif',
  'celebration-07.gif',
  'celebration-08.gif',
  'celebration-09.gif',
  'celebration-10.gif',
  'celebration-11.gif',
];

interface ScoreSnapshot {
  points: number;
  seenAt: string;
}

export interface ScoreCelebration {
  gainedPoints: number;
  totalPoints: number;
  gifSrc: string;
}

const readSnapshots = (): Record<string, ScoreSnapshot> => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, ScoreSnapshot>;
  } catch {
    return {};
  }
};

const writeSnapshots = (snapshots: Record<string, ScoreSnapshot>): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
};

const pickGif = (playerId: string, totalPoints: number, gainedPoints: number): string => {
  const seed = playerId.length + totalPoints * 3 + gainedPoints * 7 + Date.now();
  const fileName = CELEBRATION_GIFS[Math.abs(seed) % CELEBRATION_GIFS.length];
  return `${import.meta.env.BASE_URL}celebrations/${fileName}`;
};

export const useScoreCelebration = (player: CurrentPlayer | null, matches: Match[], isReady = true) => {
  const [celebration, setCelebration] = useState<ScoreCelebration | null>(null);
  const totalPoints = useMemo(() => (player ? getUserPointsMock(matches) : 0), [matches, player]);

  useEffect(() => {
    if (!player) {
      setCelebration(null);
      return;
    }

    if (!isReady) return;

    const playerId = canonicalPlayerId(player.id) || player.id;
    const snapshots = readSnapshots();
    const previousPoints = snapshots[playerId]?.points ?? 0;

    if (totalPoints > previousPoints) {
      setCelebration({
        gainedPoints: totalPoints - previousPoints,
        totalPoints,
        gifSrc: pickGif(playerId, totalPoints, totalPoints - previousPoints),
      });
    }

    snapshots[playerId] = { points: Math.max(previousPoints, totalPoints), seenAt: new Date().toISOString() };
    writeSnapshots(snapshots);
  }, [isReady, player, totalPoints]);

  return {
    celebration,
    dismissCelebration: () => setCelebration(null),
  };
};
