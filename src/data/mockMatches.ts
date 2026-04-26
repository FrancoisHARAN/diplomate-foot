import type { Match } from '../types';

const now = Date.now();
const minutes = 60 * 1000;
const hours = 60 * minutes;
const days = 24 * hours;

export const mockMatches: Match[] = [
  {
    id: 'm1',
    homeTeam: { id: 't-fr', name: 'France', shortName: 'FRA' },
    awayTeam: { id: 't-ca', name: 'Canada', shortName: 'CAN' },
    kickoff: new Date(now + 2 * days).toISOString(),
    status: 'upcoming',
  },
  {
    id: 'm2',
    homeTeam: { id: 't-br', name: 'Brésil', shortName: 'BRA' },
    awayTeam: { id: 't-ma', name: 'Maroc', shortName: 'MAR' },
    kickoff: new Date(now + 45 * minutes).toISOString(),
    status: 'upcoming',
  },
  {
    id: 'm3',
    homeTeam: { id: 't-ar', name: 'Argentine', shortName: 'ARG' },
    awayTeam: { id: 't-jp', name: 'Japon', shortName: 'JPN' },
    kickoff: new Date(now - 20 * minutes).toISOString(),
    status: 'live',
  },
  {
    id: 'm4',
    homeTeam: { id: 't-es', name: 'Espagne', shortName: 'ESP' },
    awayTeam: { id: 't-sn', name: 'Sénégal', shortName: 'SEN' },
    kickoff: new Date(now - 3 * days).toISOString(),
    status: 'finished',
    homeScore: 2,
    awayScore: 1,
  },
  {
    id: 'm5',
    homeTeam: { id: 't-pt', name: 'Portugal', shortName: 'POR' },
    awayTeam: { id: 't-gh', name: 'Ghana', shortName: 'GHA' },
    kickoff: new Date(now - 5 * days).toISOString(),
    status: 'finished',
    homeScore: 1,
    awayScore: 1,
  },
];
