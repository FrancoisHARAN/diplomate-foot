import { COUNTRY_NAME_BY_CODE, getCountryFlagUrl } from './countryFlags';
import { WORLD_CUP_2026_FEATURED_TEAMS } from './worldCup2026';

export interface WorldCupWinnerCountry {
  code: string;
  name: string;
  flagUrl?: string;
}

export const WORLD_CUP_WINNER_COUNTRIES: WorldCupWinnerCountry[] = WORLD_CUP_2026_FEATURED_TEAMS
  .map((team) => ({
    code: team.code,
    name: COUNTRY_NAME_BY_CODE[team.code] ?? team.displayName,
    flagUrl: getCountryFlagUrl(team.code),
  }))
  .sort((left, right) => left.name.localeCompare(right.name, 'fr'));

export const WORLD_CUP_WINNER_POINTS_BY_POSITION = [20, 15, 10] as const;
