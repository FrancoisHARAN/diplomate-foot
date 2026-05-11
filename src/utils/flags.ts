import type { CompetitionCode, Match, Team } from '../types';
import { getWorldCupTeamFlagUrl, isWorldCup2026Match } from './worldCupFilters';

const CLUB_ASSET_BY_COMPETITION: Partial<Record<CompetitionCode, string>> = {
  CL: 'CL',
  FL1: 'FL1',
  PD: 'PD',
  PL: 'PL',
};

const CLUB_SLUG_ALIASES: Record<string, string> = {
  'atlético': 'atletico-madrid',
  'atlético madrid': 'atletico-madrid',
  'atleti': 'atletico-madrid',
  'atm': 'atletico-madrid',
  'bayern': 'bayern-munchen',
  'bayern munich': 'bayern-munchen',
  'bayern münchen': 'bayern-munchen',
  'barça': 'barcelona',
  'fc barcelona': 'barcelona',
  atletico: 'atletico-madrid',
  'atletico madrid': 'atletico-madrid',
  'brighton hove': 'brighton',
  'crystal palace': 'crystal-palace',
  'inter milan': 'inter',
  leeds: 'leeds-united',
  'man city': 'manchester-city',
  'man united': 'manchester-united',
  'man utd': 'manchester-united',
  'manchester utd': 'manchester-united',
  newcastle: 'newcastle',
  nottingham: 'nottingham-forest',
  'nottingham forest': 'nottingham-forest',
  monaco: 'as-monaco',
  'olympique lyonnais': 'lyon',
  'olympique marseille': 'marseille',
  ol: 'lyon',
  om: 'marseille',
  'paris sg': 'paris-saint-germain',
  'paris saint germain': 'paris-saint-germain',
  'paris saint-germain': 'paris-saint-germain',
  psg: 'paris-saint-germain',
  'real madrid cf': 'real-madrid',
  sevilla: 'sevilla',
  'séville': 'sevilla',
  strasbourg: 'rc-strasbourg-alsace',
  'tottenham hotspur': 'tottenham',
  'west ham': 'west-ham',
  'west ham united': 'west-ham',
  wolves: 'wolves',
};

type CrestContext = Match | {
  competitionCode?: CompetitionCode;
  competitionName?: string;
  season?: number | null;
  sourceCompetitionId?: string | null;
  source?: string | null;
};

const normalizeContext = (context?: CompetitionCode | CrestContext): CrestContext | undefined =>
  typeof context === 'string' ? { competitionCode: context } : context;

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/\b(fc|cf|afc|ac|sc)\b/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const teamKeys = (team: Team): string[] => [
  team.shortName.toLowerCase(),
  team.name.toLowerCase(),
  slugify(team.shortName),
  slugify(team.name),
];

export const getTeamCrestCandidates = (team: Team, context?: CompetitionCode | CrestContext): string[] => {
  const matchContext = normalizeContext(context);
  const isWorldCup = isWorldCup2026Match(matchContext);
  const assetCompetition = !isWorldCup && matchContext?.competitionCode ? CLUB_ASSET_BY_COMPETITION[matchContext.competitionCode] : null;
  const keys = teamKeys(team);
  const urls: string[] = [];

  const flag = getWorldCupTeamFlagUrl(team, matchContext);
  if (flag) urls.push(flag);

  if (assetCompetition) {
    const clubSlug = keys.map((key) => CLUB_SLUG_ALIASES[key]).find(Boolean) ?? slugify(team.name);
    if (clubSlug) urls.push(`${import.meta.env.BASE_URL}team-assets/clubs/${assetCompetition}/${clubSlug}.png`);
  }

  if (team.crest) urls.push(team.crest);
  if (/^\d+$/.test(team.id)) urls.push(`https://crests.football-data.org/${team.id}.png`);

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
