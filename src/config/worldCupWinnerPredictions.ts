import { COUNTRY_NAME_BY_CODE, getCountryFlagUrl } from './countryFlags';

export interface WorldCupWinnerCountry {
  code: string;
  name: string;
  group: string;
  flagUrl?: string;
}

export const WORLD_CUP_TOP_THREE_LOCKS_AT = '2026-06-17T00:00:00Z';

export const WORLD_CUP_WINNER_QUALIFIED_COUNTRIES: Array<{ code: string; group: string }> = [
  { code: 'MEX', group: 'A' },
  { code: 'RSA', group: 'A' },
  { code: 'KOR', group: 'A' },
  { code: 'CZE', group: 'A' },
  { code: 'CAN', group: 'B' },
  { code: 'BIH', group: 'B' },
  { code: 'QAT', group: 'B' },
  { code: 'SUI', group: 'B' },
  { code: 'BRA', group: 'C' },
  { code: 'MAR', group: 'C' },
  { code: 'HAI', group: 'C' },
  { code: 'SCO', group: 'C' },
  { code: 'USA', group: 'D' },
  { code: 'PAR', group: 'D' },
  { code: 'AUS', group: 'D' },
  { code: 'TUR', group: 'D' },
  { code: 'GER', group: 'E' },
  { code: 'CUW', group: 'E' },
  { code: 'CIV', group: 'E' },
  { code: 'ECU', group: 'E' },
  { code: 'NED', group: 'F' },
  { code: 'JPN', group: 'F' },
  { code: 'SWE', group: 'F' },
  { code: 'TUN', group: 'F' },
  { code: 'BEL', group: 'G' },
  { code: 'EGY', group: 'G' },
  { code: 'IRN', group: 'G' },
  { code: 'NZL', group: 'G' },
  { code: 'ESP', group: 'H' },
  { code: 'CPV', group: 'H' },
  { code: 'KSA', group: 'H' },
  { code: 'URU', group: 'H' },
  { code: 'FRA', group: 'I' },
  { code: 'SEN', group: 'I' },
  { code: 'IRQ', group: 'I' },
  { code: 'NOR', group: 'I' },
  { code: 'ARG', group: 'J' },
  { code: 'ALG', group: 'J' },
  { code: 'AUT', group: 'J' },
  { code: 'JOR', group: 'J' },
  { code: 'POR', group: 'K' },
  { code: 'COD', group: 'K' },
  { code: 'UZB', group: 'K' },
  { code: 'COL', group: 'K' },
  { code: 'ENG', group: 'L' },
  { code: 'CRO', group: 'L' },
  { code: 'GHA', group: 'L' },
  { code: 'PAN', group: 'L' },
];

export const WORLD_CUP_WINNER_COUNTRIES: WorldCupWinnerCountry[] = WORLD_CUP_WINNER_QUALIFIED_COUNTRIES
  .map((team) => ({
    code: team.code,
    group: team.group,
    name: COUNTRY_NAME_BY_CODE[team.code] ?? team.code,
    flagUrl: getCountryFlagUrl(team.code),
  }))
  .sort((left, right) => left.name.localeCompare(right.name, 'fr'));

export const WORLD_CUP_WINNER_POINTS_BY_POSITION = [20, 15, 10] as const;
