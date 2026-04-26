import type { Match } from '../types';

const currentYear = 2026;

export const mockMatches: Match[] = [
  {
    id: 'm1',
    homeTeam: { id: 't-fr', name: 'France', shortName: 'FRA' },
    awayTeam: { id: 't-ca', name: 'Canada', shortName: 'CAN' },
    kickoff: new Date(Date.UTC(currentYear, 5, 12, 21, 0)).toISOString(),
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
    kickoff: new Date(Date.UTC(currentYear, 5, 14, 20, 0)).toISOString(),
    status: 'upcoming',
  },
  {
    id: 'm4',
    homeTeam: { id: 't-es', name: 'Espagne', shortName: 'ESP' },
    awayTeam: { id: 't-sn', name: 'Sénégal', shortName: 'SEN' },
    kickoff: new Date(Date.UTC(currentYear, 5, 15, 19, 0)).toISOString(),
    status: 'upcoming',
  },
];
