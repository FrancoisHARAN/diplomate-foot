import { WORLD_CUP_WINNER_QUALIFIED_COUNTRIES, WORLD_CUP_WINNER_COUNTRIES } from '../config/worldCupWinnerPredictions';
import type { Match, MatchStatus, Team } from '../types';
import { isMatchFinal } from './points';
import { getTeamCountryCode, getWorldCupTeamDisplayName, isGroupStageMatch, isKnockoutStageMatch, isWorldCup2026Match } from './worldCupFilters';

export interface WorldCupTeamInfo {
  code: string;
  name: string;
  group: string;
  flagUrl?: string;
}

export interface WorldCupGroupStanding extends WorldCupTeamInfo {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface WorldCupGroup {
  id: string;
  label: string;
  standings: WorldCupGroupStanding[];
}

export interface WorldCupTeamMatch {
  id?: string;
  match?: Match;
  opponentName: string;
  opponentFlagUrl?: string;
  kickoff?: string;
  status?: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  isHome?: boolean;
  available: boolean;
}

export interface WorldCupKnockoutMatch {
  id?: string;
  match?: Match;
  homeLabel: string;
  awayLabel: string;
  homeFlagUrl?: string;
  awayFlagUrl?: string;
  kickoff?: string;
  status?: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  available: boolean;
}

export interface WorldCupKnockoutRound {
  id: string;
  label: string;
  matches: WorldCupKnockoutMatch[];
}

const ROUND_ORDER = ['round32', 'round16', 'quarter', 'semi', 'third', 'final'] as const;

const ROUND_LABELS: Record<(typeof ROUND_ORDER)[number], string> = {
  round32: 'Seizièmes de finale',
  round16: 'Huitièmes de finale',
  quarter: 'Quarts de finale',
  semi: 'Demi-finales',
  third: 'Match pour la 3e place',
  final: 'Finale',
};

const countryByCode = new Map(WORLD_CUP_WINNER_COUNTRIES.map((country) => [country.code, country]));
const groupByCode = new Map(WORLD_CUP_WINNER_QUALIFIED_COUNTRIES.map((team) => [team.code, team.group]));

export const getWorldCupTeams = (): WorldCupTeamInfo[] =>
  WORLD_CUP_WINNER_QUALIFIED_COUNTRIES.map((team) => {
    const country = countryByCode.get(team.code);
    return {
      code: team.code,
      name: country?.name ?? team.code,
      group: team.group,
      flagUrl: country?.flagUrl,
    };
  });

const emptyStanding = (team: WorldCupTeamInfo): WorldCupGroupStanding => ({
  ...team,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  points: 0,
});

const standingSort = (left: WorldCupGroupStanding, right: WorldCupGroupStanding): number =>
  right.points - left.points ||
  right.goalDifference - left.goalDifference ||
  right.goalsFor - left.goalsFor ||
  left.name.localeCompare(right.name, 'fr');

const getGroupIdForMatch = (match: Match): string | undefined => {
  const rawGroup = String(match.group ?? '').trim();
  const letterMatch = rawGroup.match(/[A-L]/i);
  if (letterMatch) return letterMatch[0].toUpperCase();

  const homeCode = getTeamCountryCode(match.homeTeam);
  const awayCode = getTeamCountryCode(match.awayTeam);
  const homeGroup = homeCode ? groupByCode.get(homeCode) : undefined;
  const awayGroup = awayCode ? groupByCode.get(awayCode) : undefined;
  return homeGroup && homeGroup === awayGroup ? homeGroup : undefined;
};

const addResult = (standing: WorldCupGroupStanding, goalsFor: number, goalsAgainst: number) => {
  standing.played += 1;
  standing.goalsFor += goalsFor;
  standing.goalsAgainst += goalsAgainst;
  standing.goalDifference = standing.goalsFor - standing.goalsAgainst;

  if (goalsFor > goalsAgainst) {
    standing.won += 1;
    standing.points += 3;
  } else if (goalsFor === goalsAgainst) {
    standing.drawn += 1;
    standing.points += 1;
  } else {
    standing.lost += 1;
  }
};

export const calculateWorldCupGroups = (matches: Match[]): WorldCupGroup[] => {
  const groups = new Map<string, Map<string, WorldCupGroupStanding>>();

  getWorldCupTeams().forEach((team) => {
    const group = groups.get(team.group) ?? new Map<string, WorldCupGroupStanding>();
    group.set(team.code, emptyStanding(team));
    groups.set(team.group, group);
  });

  matches
    .filter((match) => isWorldCup2026Match(match) && isGroupStageMatch(match) && isMatchFinal(match))
    .forEach((match) => {
      if (typeof match.homeScore !== 'number' || typeof match.awayScore !== 'number') return;
      const groupId = getGroupIdForMatch(match);
      if (!groupId) return;
      const group = groups.get(groupId);
      if (!group) return;

      const homeCode = getTeamCountryCode(match.homeTeam);
      const awayCode = getTeamCountryCode(match.awayTeam);
      const homeStanding = homeCode ? group.get(homeCode) : undefined;
      const awayStanding = awayCode ? group.get(awayCode) : undefined;
      if (!homeStanding || !awayStanding) return;

      addResult(homeStanding, match.homeScore, match.awayScore);
      addResult(awayStanding, match.awayScore, match.homeScore);
    });

  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, standings]) => ({
      id,
      label: `Groupe ${id}`,
      standings: Array.from(standings.values()).sort(standingSort),
    }));
};

const teamInfoFromMatchTeam = (team: Team, match: Match): WorldCupTeamInfo => {
  const code = getTeamCountryCode(team);
  const country = code ? countryByCode.get(code) : undefined;
  return {
    code: code ?? team.shortName,
    group: code ? groupByCode.get(code) ?? '' : '',
    name: getWorldCupTeamDisplayName(team, match),
    flagUrl: country?.flagUrl ?? team.flagUrl,
  };
};

export const getWorldCupTeamMatches = (teamCode: string, matches: Match[]): WorldCupTeamMatch[] =>
  matches
    .filter((match) => {
      if (!isWorldCup2026Match(match)) return false;
      return getTeamCountryCode(match.homeTeam) === teamCode || getTeamCountryCode(match.awayTeam) === teamCode;
    })
    .sort((left, right) => new Date(left.kickoff).getTime() - new Date(right.kickoff).getTime())
    .map((match) => {
      const isHome = getTeamCountryCode(match.homeTeam) === teamCode;
      const opponent = isHome ? match.awayTeam : match.homeTeam;
      const opponentInfo = teamInfoFromMatchTeam(opponent, match);
      return {
        id: match.id,
        match,
        opponentName: opponentInfo.name,
        opponentFlagUrl: opponentInfo.flagUrl,
        kickoff: match.kickoff,
        status: match.status,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        isHome,
        available: true,
      };
    });

const normalizeRound = (value?: string | number | null): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');

export const getWorldCupKnockoutRoundId = (match: Match): (typeof ROUND_ORDER)[number] | undefined => {
  if (!isWorldCup2026Match(match) || !isKnockoutStageMatch(match)) return undefined;
  const text = normalizeRound([match.stage, match.round, match.matchday].filter(Boolean).join(' '));

  if (text.includes('third') || text.includes('3e place') || text.includes('troisieme')) return 'third';
  if (text.includes('semi') || text.includes('demi')) return 'semi';
  if (text.includes('quarter') || text.includes('quart')) return 'quarter';
  if (text.includes('round of 16') || text.includes('last 16') || text.includes('huitieme')) return 'round16';
  if (text.includes('round of 32') || text.includes('last 32') || text.includes('seizieme')) return 'round32';
  if (text.includes('final') || text.includes('finale')) return 'final';
  if (typeof match.matchday === 'number' && match.matchday > 3) return 'round32';
  return undefined;
};

const toKnockoutMatch = (match: Match): WorldCupKnockoutMatch => {
  const home = teamInfoFromMatchTeam(match.homeTeam, match);
  const away = teamInfoFromMatchTeam(match.awayTeam, match);
  return {
    id: match.id,
    match,
    homeLabel: home.name || 'À déterminer',
    awayLabel: away.name || 'À déterminer',
    homeFlagUrl: home.flagUrl,
    awayFlagUrl: away.flagUrl,
    kickoff: match.kickoff,
    status: match.status,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    available: true,
  };
};

export const getWorldCupKnockoutRounds = (matches: Match[]): WorldCupKnockoutRound[] => {
  const byRound = new Map<string, WorldCupKnockoutMatch[]>();

  matches
    .filter((match) => isWorldCup2026Match(match) && isKnockoutStageMatch(match))
    .forEach((match) => {
      const roundId = getWorldCupKnockoutRoundId(match);
      if (!roundId) return;
      byRound.set(roundId, [...(byRound.get(roundId) ?? []), toKnockoutMatch(match)]);
    });

  return ROUND_ORDER.map((id) => {
    const knownMatches = byRound.get(id) ?? [];
    return {
      id,
      label: ROUND_LABELS[id],
      matches: knownMatches.length > 0
        ? knownMatches.sort((left, right) => new Date(left.kickoff ?? '').getTime() - new Date(right.kickoff ?? '').getTime())
        : [{
            homeLabel: 'À déterminer',
            awayLabel: 'À déterminer',
            available: false,
          }],
    };
  });
};

export const hasWorldCupKnockoutMatches = (matches: Match[]): boolean =>
  matches.some((match) => isWorldCup2026Match(match) && isKnockoutStageMatch(match));
