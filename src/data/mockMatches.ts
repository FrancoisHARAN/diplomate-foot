import type { Match } from '../types';

const currentYear = 2026;

export const mockMatches: Match[] = [
  {
    id: 'm1',
    homeTeam: { id: 't-fr', name: 'France', shortName: 'FRA' },
    awayTeam: { id: 't-ca', name: 'Canada', shortName: 'CAN' },
    kickoff: new Date(Date.UTC(currentYear, 5, 12, 20, 0)).toISOString(),
    status: 'upcoming',
  },
  {
    id: 'm2',
    homeTeam: { id: 't-br', name: 'Brésil', shortName: 'BRA' },
    awayTeam: { id: 't-ma', name: 'Maroc', shortName: 'MAR' },
    kickoff: new Date(Date.UTC(currentYear, 5, 13, 18, 0)).toISOString(),
    status: 'upcoming',
  },
  {
    id: 'm3',
    homeTeam: { id: 't-ar', name: 'Argentine', shortName: 'ARG' },
    awayTeam: { id: 't-jp', name: 'Japon', shortName: 'JPN' },
    kickoff: new Date(Date.UTC(currentYear, 5, 10, 19, 0)).toISOString(),
    status: 'live',
  },
  {
    id: 'm4',
    homeTeam: { id: 't-es', name: 'Espagne', shortName: 'ESP' },
    awayTeam: { id: 't-sn', name: 'Sénégal', shortName: 'SEN' },
    kickoff: new Date(Date.UTC(currentYear, 5, 9, 16, 0)).toISOString(),
    status: 'finished',
    homeScore: 2,
    awayScore: 1,
  },
  {
    id: 'm5',
    homeTeam: { id: 't-de', name: 'Allemagne', shortName: 'GER' },
    awayTeam: { id: 't-us', name: 'États-Unis', shortName: 'USA' },
    kickoff: new Date(Date.UTC(currentYear, 5, 8, 14, 0)).toISOString(),
    status: 'finished',
    homeScore: 1,
    awayScore: 1,
  },
];
