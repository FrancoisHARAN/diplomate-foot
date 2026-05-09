import { useEffect, useMemo, useState } from 'react';
import { buildMockLeaderboardHistory } from '../data/mockLeaderboardHistory';
import { isSupabaseConfigured, supabaseRpc } from '../lib/supabaseClient';
import type { LeaderboardHistoryEntry, LeaderboardHistoryPeriod, Standing } from '../types';

interface RpcLeaderboardHistoryRow {
  period_label: string;
  snapshot_at: string;
  player_id: string;
  nickname: string;
  display_name?: string | null;
  avatar_url?: string | null;
  rank: number;
  points: number;
  exact_scores: number;
  two_point_results?: number | null;
  first_prediction_at?: string | null;
  is_current: boolean;
}

const normalizeRows = (rows: RpcLeaderboardHistoryRow[]): LeaderboardHistoryPeriod[] => {
  const byPeriod = new Map<string, LeaderboardHistoryPeriod>();

  rows.forEach((row) => {
    const label = row.is_current ? 'En cours' : row.period_label;
    const entry: LeaderboardHistoryEntry = {
      periodLabel: label,
      snapshotAt: row.snapshot_at,
      playerId: row.player_id,
      nickname: row.display_name ?? row.nickname,
      avatarUrl: row.avatar_url ?? undefined,
      rank: row.rank,
      points: row.points,
      exactScores: row.exact_scores,
      twoPointResults: row.two_point_results ?? 0,
      firstPredictionAt: row.first_prediction_at ?? null,
      isCurrent: row.is_current,
    };

    const existing = byPeriod.get(label);
    if (existing) {
      existing.entries.push(entry);
      return;
    }

    byPeriod.set(label, {
      label,
      snapshotAt: row.snapshot_at,
      isCurrent: row.is_current,
      entries: [entry],
    });
  });

  return Array.from(byPeriod.values())
    .map((period) => ({ ...period, entries: [...period.entries].sort((a, b) => a.rank - b.rank) }))
    .sort((left, right) => {
      if (left.isCurrent) return 1;
      if (right.isCurrent) return -1;
      return new Date(left.snapshotAt).getTime() - new Date(right.snapshotAt).getTime();
    });
};

export const useLeaderboardHistory = (currentStandings: Standing[]) => {
  const fallback = useMemo(() => buildMockLeaderboardHistory(currentStandings), [currentStandings]);
  const [periods, setPeriods] = useState<LeaderboardHistoryPeriod[]>(fallback);
  const [isFallback, setIsFallback] = useState(!isSupabaseConfigured);

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      setPeriods(fallback);
      setIsFallback(true);
      return () => {
        mounted = false;
      };
    }

    void supabaseRpc<RpcLeaderboardHistoryRow[]>('app_get_leaderboard_history', { p_limit_weeks: 8 })
      .then((rows) => {
        if (!mounted) return;
        const normalized = normalizeRows(rows);
        setPeriods(normalized.length > 0 ? normalized : fallback);
        setIsFallback(normalized.length === 0);
      })
      .catch((error) => {
        console.warn('Leaderboard history unavailable, using local fallback.', error);
        if (!mounted) return;
        setPeriods(fallback);
        setIsFallback(true);
      });

    return () => {
      mounted = false;
    };
  }, [fallback]);

  return {
    periods,
    isFallback,
    hasFrozenSnapshots: periods.some((period) => !period.isCurrent),
  };
};
