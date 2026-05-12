import type { CompetitionCode } from '../types';

export const WORLD_CUP_2026_COMPETITION_CODE: CompetitionCode = 'WC2026';
export const WORLD_CUP_2026_COMPETITION_NAME = 'Coupe du Monde 2026';
export const WORLD_CUP_2026_API_COMPETITION_ID = 'WC';
export const WORLD_CUP_2026_SEASON = 2026;

export interface WorldCupFeaturedTeam {
  code: string;
  displayName: string;
  aliases: string[];
}

export const WORLD_CUP_2026_FEATURED_TEAMS: WorldCupFeaturedTeam[] = [
  { code: 'FRA', displayName: 'France', aliases: ['France', 'FRA'] },
  { code: 'ESP', displayName: 'Espagne', aliases: ['Spain', 'Espagne', 'ESP'] },
  { code: 'ARG', displayName: 'Argentine', aliases: ['Argentina', 'Argentine', 'ARG'] },
  { code: 'ENG', displayName: 'Angleterre', aliases: ['England', 'Angleterre', 'ENG'] },
  { code: 'POR', displayName: 'Portugal', aliases: ['Portugal', 'POR'] },
  { code: 'BRA', displayName: 'Brésil', aliases: ['Brazil', 'Brasil', 'Brésil', 'BRA'] },
  { code: 'NED', displayName: 'Pays-Bas', aliases: ['Netherlands', 'Holland', 'Pays-Bas', 'NED'] },
  { code: 'MAR', displayName: 'Maroc', aliases: ['Morocco', 'Maroc', 'MAR'] },
  { code: 'BEL', displayName: 'Belgique', aliases: ['Belgium', 'Belgique', 'BEL'] },
  { code: 'GER', displayName: 'Allemagne', aliases: ['Germany', 'Deutschland', 'Allemagne', 'GER', 'DEU'] },
  { code: 'CRO', displayName: 'Croatie', aliases: ['Croatia', 'Croatie', 'CRO'] },
  { code: 'COL', displayName: 'Colombie', aliases: ['Colombia', 'Colombie', 'COL'] },
  { code: 'SEN', displayName: 'Sénégal', aliases: ['Senegal', 'Sénégal', 'SEN'] },
];

export const WORLD_CUP_2026_KNOCKOUT_STAGE_KEYWORDS = [
  'round of 32',
  'round_32',
  'last 32',
  'seizieme',
  'seiziemes',
  'round of 16',
  'last 16',
  'huitieme',
  'huitiemes',
  'quarter',
  'quart',
  'semi',
  'demi',
  'third place',
  'troisieme place',
  '3e place',
  'final',
  'finale',
];

export const WORLD_CUP_2026_GROUP_STAGE_KEYWORDS = [
  'group',
  'groupe',
  'group_stage',
  'phase de groupe',
  'phase de groupes',
];
