import { COUNTRY_NAME_BY_CODE, getCountryDisplayName, getCountryFlagUrl } from '../config/countryFlags';
import {
  WORLD_CUP_2026_COMPETITION_CODE,
  WORLD_CUP_2026_FEATURED_TEAMS,
  WORLD_CUP_2026_GROUP_STAGE_KEYWORDS,
  WORLD_CUP_2026_KNOCKOUT_STAGE_KEYWORDS,
} from '../config/worldCup2026';
import type { Match, Team } from '../types';

const normalize = (value?: string | number | null): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const codeAliases = new Map<string, string>();

const addAlias = (alias: string, code: string) => {
  codeAliases.set(normalize(alias), code);
  codeAliases.set(alias.toUpperCase(), code);
};

WORLD_CUP_2026_FEATURED_TEAMS.forEach((team) => {
  addAlias(team.code, team.code);
  addAlias(team.displayName, team.code);
  team.aliases.forEach((alias) => addAlias(alias, team.code));
});

Object.entries(COUNTRY_NAME_BY_CODE).forEach(([code, displayName]) => {
  addAlias(code, code);
  addAlias(displayName, code);
});

[
  ['AR', 'ARG'],
  ['Argentina', 'ARG'],
  ['BR', 'BRA'],
  ['Brazil', 'BRA'],
  ['Brasil', 'BRA'],
  ['CA', 'CAN'],
  ['Canada', 'CAN'],
  ['DE', 'GER'],
  ['DEU', 'GER'],
  ['Deutschland', 'GER'],
  ['Germany', 'GER'],
  ['EN', 'ENG'],
  ['England', 'ENG'],
  ['ES', 'ESP'],
  ['Spain', 'ESP'],
  ['FR', 'FRA'],
  ['France', 'FRA'],
  ['JP', 'JPN'],
  ['Japan', 'JPN'],
  ['Japon', 'JPN'],
  ['MA', 'MAR'],
  ['Morocco', 'MAR'],
  ['MX', 'MEX'],
  ['Mexico', 'MEX'],
  ['Mexique', 'MEX'],
  ['NL', 'NED'],
  ['Nederland', 'NED'],
  ['Netherlands', 'NED'],
  ['Holland', 'NED'],
  ['PT', 'POR'],
  ['Portugal', 'POR'],
  ['SN', 'SEN'],
  ['Senegal', 'SEN'],
  ['US', 'USA'],
  ['United States', 'USA'],
  ['USA', 'USA'],
].forEach(([alias, code]) => addAlias(alias, code));

const stageText = (match: Match): string =>
  normalize([
    match.stage,
    match.round,
    match.group,
    typeof match.matchday === 'number' ? `matchday ${match.matchday}` : null,
  ].filter(Boolean).join(' '));

const competitionText = (match: Match): string =>
  normalize([
    match.competitionName,
    match.competitionCode,
    match.sourceCompetitionId,
    match.source,
    match.season,
  ].filter(Boolean).join(' '));

type WorldCupMatchLike = Pick<Match, 'competitionCode' | 'competitionName' | 'season' | 'sourceCompetitionId'> & {
  kickoff?: string;
  source?: string | null;
};

const isFinalWorldCupName = (match: Match): boolean => {
  const text = competitionText(match);
  const isWorldCup = text.includes('coupe du monde') || text.includes('world cup') || text.includes('worldcup');
  const isQualifier = text.includes('qualif') || text.includes('qualification') || text.includes('friendly') || text.includes('amical') || text.includes('preparation');
  const isOtherCategory = text.includes('women') || text.includes('feminin') || text.includes('u17') || text.includes('u20') || text.includes('youth');
  return isWorldCup && !isQualifier && !isOtherCategory;
};

export const isWorldCup2026Match = (match?: Partial<WorldCupMatchLike> | null): boolean => {
  if (!match) return false;
  if (match.competitionCode === WORLD_CUP_2026_COMPETITION_CODE) return true;

  const sourceCompetitionId = String(match.sourceCompetitionId ?? '').toUpperCase();
  const season = typeof match.season === 'number' ? match.season : undefined;
  const kickoffYear = typeof match.kickoff === 'string' ? new Date(match.kickoff).getUTCFullYear() : undefined;

  if (sourceCompetitionId === 'WC' && (season === 2026 || kickoffYear === 2026 || isFinalWorldCupName(match as Match))) {
    return true;
  }

  return isFinalWorldCupName(match as Match) && (season === 2026 || kickoffYear === 2026 || competitionText(match as Match).includes('2026'));
};

export const getTeamCountryCode = (team?: Team | null): string | undefined => {
  if (!team) return undefined;
  const candidates = [
    team.countryCode,
    team.shortName,
    team.name,
    team.id.replace(/^t[-_]/i, ''),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const direct = candidate.toUpperCase();
    if (codeAliases.has(direct)) return codeAliases.get(direct);
    const normalized = normalize(candidate);
    if (codeAliases.has(normalized)) return codeAliases.get(normalized);
  }

  return undefined;
};

export const isFeaturedWorldCupTeam = (team?: Team | null): boolean => {
  const code = getTeamCountryCode(team);
  return Boolean(code && WORLD_CUP_2026_FEATURED_TEAMS.some((item) => item.code === code));
};

export const isFranceWorldCupTeam = (team?: Team | null): boolean => getTeamCountryCode(team) === 'FRA';

export const isKnockoutStageMatch = (match: Match): boolean => {
  const text = stageText(match);
  if (WORLD_CUP_2026_KNOCKOUT_STAGE_KEYWORDS.some((keyword) => text.includes(normalize(keyword)))) return true;
  return isWorldCup2026Match(match) && typeof match.matchday === 'number' && match.matchday > 3;
};

export const isGroupStageMatch = (match: Match): boolean => {
  const text = stageText(match);
  if (WORLD_CUP_2026_GROUP_STAGE_KEYWORDS.some((keyword) => text.includes(normalize(keyword)))) return true;
  if (isKnockoutStageMatch(match)) return false;
  return isWorldCup2026Match(match);
};

export const shouldShowWorldCup2026Match = (match: Match): boolean => {
  if (!isWorldCup2026Match(match)) return false;
  if (isKnockoutStageMatch(match)) return true;
  if (isGroupStageMatch(match)) return isFeaturedWorldCupTeam(match.homeTeam) || isFeaturedWorldCupTeam(match.awayTeam);
  return isFeaturedWorldCupTeam(match.homeTeam) || isFeaturedWorldCupTeam(match.awayTeam);
};

export const shouldShowMatchInApp = (match: Match): boolean =>
  isWorldCup2026Match(match) ? shouldShowWorldCup2026Match(match) : true;

export const isFranceWorldCup2026Match = (match: Match): boolean =>
  isWorldCup2026Match(match) && (isFranceWorldCupTeam(match.homeTeam) || isFranceWorldCupTeam(match.awayTeam));

export const getWorldCupTeamDisplayName = (team: Team, match?: Match | null): string => {
  if (!match || !isWorldCup2026Match(match)) return team.name;
  const code = getTeamCountryCode(team);
  return getCountryDisplayName(code) ?? team.name;
};

export const getWorldCupTeamShortCode = (team: Team, match?: Match | null): string => {
  if (!match || !isWorldCup2026Match(match)) return team.shortName;
  return getTeamCountryCode(team) ?? team.shortName;
};

export const getWorldCupTeamFlagUrl = (team: Team, match?: Partial<WorldCupMatchLike> | null): string | undefined => {
  if (!match || !isWorldCup2026Match(match)) return undefined;
  return getCountryFlagUrl(getTeamCountryCode(team));
};

export const getWorldCupBoostLabel = (match: Match, multiplier: number): string =>
  isFranceWorldCup2026Match(match) ? 'Match de la France' : `Points x${multiplier}`;
