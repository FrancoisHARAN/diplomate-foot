import type { Match } from '../types';

const now = Date.now();
const hour = 60 * 60 * 1000;
const day = 24 * hour;

export const mockMatches: Match[] = [
  {
    id: 'm1',
    homeTeam: { id: 't-fr', name: 'France', shortName: 'FRA' },
    awayTeam: { id: 't-ca', name: 'Canada', shortName: 'CAN' },
    kickoff: new Date(now + 2 * day).toISOString(),
    status: 'upcoming',
  },
  {
    id: 'm2',
    homeTeam: { id: 't-br', name: 'Brésil', shortName: 'BRA' },
    awayTeam: { id: 't-ma', name: 'Maroc', shortName: 'MAR' },
    kickoff: new Date(now + 3 * day).toISOString(),
    status: 'upcoming',
  },
  {
    id: 'm3',
    homeTeam: { id: 't-ar', name: 'Argentine', shortName: 'ARG' },
    awayTeam: { id: 't-jp', name: 'Japon', shortName: 'JPN' },
    kickoff: new Date(now + 2.5 * hour).toISOString(),
    status: 'upcoming',
  },
  {
    id: 'm4',
    homeTeam: { id: 't-es', name: 'Espagne', shortName: 'ESP' },
    awayTeam: { id: 't-sn', name: 'Sénégal', shortName: 'SEN' },
    kickoff: new Date(now - 20 * 60 * 1000).toISOString(),
    status: 'live',
  },
  {
    id: 'm5',
    homeTeam: { id: 't-de', name: 'Allemagne', shortName: 'GER' },
    awayTeam: { id: 't-us', name: 'États-Unis', shortName: 'USA' },
    kickoff: new Date(now - 2 * day).toISOString(),
    status: 'finished',
    homeScore: 2,
    awayScore: 1,
  },
  {
    id: 'm6',
    homeTeam: { id: 't-pt', name: 'Portugal', shortName: 'POR' },
    awayTeam: { id: 't-mx', name: 'Mexique', shortName: 'MEX' },
    kickoff: new Date(now - 4 * day).toISOString(),
    status: 'finished',
    homeScore: 1,
    awayScore: 1,
  },
];
