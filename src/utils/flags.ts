import type { CompetitionCode, Team } from '../types';

const FLAG_BY_TEAM: Record<string, string> = {
  ARG: 'ar',
  BRA: 'br',
  CAN: 'ca',
  ESP: 'es',
  FRA: 'fr',
  GER: 'de',
  JPN: 'jp',
  MAR: 'ma',
  MEX: 'mx',
  POR: 'pt',
  SEN: 'sn',
  USA: 'us',
};

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
  'monaco': 'as-monaco',
  'olympique lyonnais': 'lyon',
  'olympique marseille': 'marseille',
  'ol': 'lyon',
  'om': 'marseille',
  'paris sg': 'paris-saint-germain',
  'paris saint germain': 'paris-saint-germain',
  'paris saint-germain': 'paris-saint-germain',
  'psg': 'paris-saint-germain',
  'real madrid cf': 'real-madrid',
  'sevilla': 'sevilla',
  'séville': 'sevilla',
  strasbourg: 'rc-strasbourg-alsace',
  'tottenham hotspur': 'tottenham',
  'west ham': 'west-ham',
  'west ham united': 'west-ham',
  wolves: 'wolves',
};

const NATIONAL_SLUG_ALIASES: Record<string, string> = {
  arg: 'argentina-national-team',
  argentina: 'argentina-national-team',
  bra: 'brazil-national-team',
  brazil: 'brazil-national-team',
  brésil: 'brazil-national-team',
  can: 'canada-national-team',
  canada: 'canada-national-team',
  esp: 'spain-national-team',
  espagne: 'spain-national-team',
  fra: 'france-national-team',
  france: 'france-national-team',
  ger: 'germany-national-team',
  germany: 'germany-national-team',
  allemagne: 'germany-national-team',
  mar: 'morocco-national-team',
  maroc: 'morocco-national-team',
  morocco: 'morocco-national-team',
  por: 'portuguese-football-federation',
  portugal: 'portuguese-football-federation',
  sen: 'senegal-national-team',
  senegal: 'senegal-national-team',
  sénégal: 'senegal-national-team',
  usa: 'usa-national-team',
};

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

export const getTeamFlagUrl = (shortName: string): string | null => {
  const code = FLAG_BY_TEAM[shortName];
  return code ? `${import.meta.env.BASE_URL}flags/${code}.webp` : null;
};

export const getTeamCrestCandidates = (team: Team, competitionCode?: CompetitionCode): string[] => {
  const assetCompetition = competitionCode ? CLUB_ASSET_BY_COMPETITION[competitionCode] : null;
  const keys = teamKeys(team);
  const urls: string[] = [];

  if (assetCompetition) {
    const clubSlug = keys.map((key) => CLUB_SLUG_ALIASES[key]).find(Boolean) ?? slugify(team.name);
    if (clubSlug) urls.push(`${import.meta.env.BASE_URL}team-assets/clubs/${assetCompetition}/${clubSlug}.png`);
  }

  if (competitionCode === 'WORLD' || team.id.startsWith('t-')) {
    const nationSlug = keys.map((key) => NATIONAL_SLUG_ALIASES[key] ?? null).find(Boolean);
    if (nationSlug) urls.push(`${import.meta.env.BASE_URL}team-assets/nations/${nationSlug}.png`);
  }

  if (team.crest) urls.push(team.crest);
  if (/^\d+$/.test(team.id)) urls.push(`https://crests.football-data.org/${team.id}.png`);
  const flag = competitionCode === 'WORLD' || team.id.startsWith('t-') ? getTeamFlagUrl(team.shortName) : null;
  if (flag) urls.push(flag);

  return Array.from(new Set(urls));
};

export const getTeamCrestUrl = (team: Team, competitionCode?: CompetitionCode): string | null =>
  getTeamCrestCandidates(team, competitionCode)[0] ?? null;

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
