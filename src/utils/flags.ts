import type { CompetitionCode, Match, Team } from '../types';
import { getWorldCupTeamFlagUrl, isWorldCup2026Match } from './worldCupFilters';

type CrestContext = Match | {
  competitionCode?: CompetitionCode;
  competitionName?: string;
  season?: number | null;
  sourceCompetitionId?: string | null;
  source?: string | null;
};

const normalizeContext = (context?: CompetitionCode | CrestContext): CrestContext | undefined =>
  typeof context === 'string' ? { competitionCode: context } : context;

export const getTeamCrestCandidates = (team: Team, context?: CompetitionCode | CrestContext): string[] => {
  const matchContext = normalizeContext(context);
  const urls: string[] = [];

  const flag = getWorldCupTeamFlagUrl(team, matchContext);
  if (flag) urls.push(flag);

  if (team.crest) urls.push(team.crest);
  if (!isWorldCup2026Match(matchContext) && /^\d+$/.test(team.id)) {
    urls.push(`https://crests.football-data.org/${team.id}.png`);
  }

  return Array.from(new Set(urls));
};

export const getTeamCrestUrl = (team: Team, context?: CompetitionCode | CrestContext): string | null =>
  getTeamCrestCandidates(team, context)[0] ?? null;

export const getTeamInitials = (name: string, shortName: string): string => {
  if (shortName.length <= 4) return shortName;
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
};
