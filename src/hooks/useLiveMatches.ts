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

const getLatestCloudUpdate = (matches: Match[]) =>
  matches.reduce<string | null>((latest, match) => {
    if (!match.lastUpdated) return latest;
    if (!latest) return match.lastUpdated;
    return new Date(match.lastUpdated).getTime() > new Date(latest).getTime() ? match.lastUpdated : latest;
  }, null);

const loadLiveMatches = async (): Promise<LiveMatchesState> => {
  const response = await fetch(liveDataUrl(), { cache: 'no-store' });
  if (!response.ok) {
    const cloudMatches = await fetchCloudMatches();
    const cloudUpdatedAt = getLatestCloudUpdate(cloudMatches);
    return cloudMatches.length > 0 ? {
      matches: cloudMatches,
      generatedAt: cloudUpdatedAt,
      lastDataChangedAt: cloudUpdatedAt,
      source: 'supabase-rpc',
      message: null,
      isFallback: false,
    } : fallbackState;
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

  return {
    matches,
    generatedAt: payload.generatedAt ?? null,
    lastDataChangedAt: payload.lastDataChangedAt ?? payload.generatedAt ?? null,
    source: payload.source ?? 'live-data',
    message: payload.message ?? null,
    isFallback: payload.source?.includes('fallback') ?? false,
  };
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
