import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { mockMatches } from '../data/mockMatches';
import type { Match } from '../types';
import { fetchCloudMatches } from '../utils/appState';

interface LiveMatchesPayload {
  generatedAt?: string;
  lastDataChangedAt?: string;
  source?: string;
  message?: string;
  matches?: Match[];
}

interface LiveMatchesState {
  matches: Match[];
  generatedAt: string | null;
  lastDataChangedAt: string | null;
  source: string;
  message: string | null;
  isFallback: boolean;
}

const fallbackState: LiveMatchesState = {
  matches: mockMatches,
  generatedAt: null,
  lastDataChangedAt: null,
  source: 'fallback-test',
  message: 'Données de test locales en attendant la clé API foot.',
  isFallback: true,
};

const liveDataUrl = () => `${import.meta.env.BASE_URL}live-data/matches.json?ts=${Date.now()}`;

const hasPlaceholderTeam = (match: Match) => {
  const labels = [match.homeTeam.name, match.awayTeam.name].join(' ').toLowerCase();
  return (
    match.homeTeam.id.startsWith('home-') ||
    match.awayTeam.id.startsWith('away-') ||
    labels.includes('equipe domicile') ||
    labels.includes('équipe domicile') ||
    labels.includes('equipe exterieure') ||
    labels.includes('équipe extérieure')
  );
};

const dateMs = (value?: string | null): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

const getLatestMatchUpdate = (matches: Match[]) =>
  matches.reduce<string | null>((latest, match) => {
    if (!match.lastUpdated) return latest;
    if (!latest) return match.lastUpdated;
    return (dateMs(match.lastUpdated) ?? 0) > (dateMs(latest) ?? 0) ? match.lastUpdated : latest;
  }, null);

const fromCloudMatches = (cloudMatches: Match[]): LiveMatchesState | null => {
  const cloudUpdatedAt = getLatestMatchUpdate(cloudMatches);
  return cloudMatches.length > 0 ? {
    matches: cloudMatches,
    generatedAt: cloudUpdatedAt,
    lastDataChangedAt: cloudUpdatedAt,
    source: 'supabase-rpc',
    message: null,
    isFallback: false,
  } : null;
};

const preferCloudIfNewer = async (state: LiveMatchesState): Promise<LiveMatchesState> => {
  let cloudState: LiveMatchesState | null = null;
  try {
    cloudState = fromCloudMatches(await fetchCloudMatches());
  } catch {
    return state;
  }

  if (!cloudState?.lastDataChangedAt) return state;

  const cloudTime = dateMs(cloudState.lastDataChangedAt);
  const staticTime = dateMs(state.lastDataChangedAt);
  if (cloudTime !== null && (staticTime === null || cloudTime > staticTime)) {
    return cloudState;
  }

  return state;
};

const loadLiveMatches = async (): Promise<LiveMatchesState> => {
  const response = await fetch(liveDataUrl(), { cache: 'no-store' });
  if (!response.ok) {
    return fromCloudMatches(await fetchCloudMatches()) ?? fallbackState;
  }

  const payload = (await response.json()) as LiveMatchesPayload;
  const liveMatches = Array.isArray(payload.matches)
    ? payload.matches
        .filter((match) => !hasPlaceholderTeam(match))
        .map((match) => ({
          ...match,
          lastUpdated: match.lastUpdated ?? payload.lastDataChangedAt ?? payload.generatedAt,
        }))
    : [];
  const matches = liveMatches.length > 0 ? liveMatches : mockMatches;

  return preferCloudIfNewer({
    matches,
    generatedAt: payload.generatedAt ?? null,
    lastDataChangedAt: payload.lastDataChangedAt ?? payload.generatedAt ?? null,
    source: payload.source ?? 'live-data',
    message: payload.message ?? null,
    isFallback: payload.source?.includes('fallback') ?? false,
  });
};

const LiveMatchesContext = createContext<LiveMatchesState | undefined>(undefined);

export const LiveMatchesProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<LiveMatchesState>(fallbackState);

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      try {
        const next = await loadLiveMatches();
        if (mounted) setState(next);
      } catch {
        if (mounted) setState(fallbackState);
      }
    };

    void refresh();
    const timer = window.setInterval(refresh, 60_000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const value = useMemo(() => state, [state]);

  return createElement(LiveMatchesContext.Provider, { value }, children);
};

export const useLiveMatches = () => {
  const context = useContext(LiveMatchesContext);
  if (!context) return fallbackState;
  return context;
};
