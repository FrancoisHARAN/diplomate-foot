import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const competitions = [
  { code: 'FL1', name: 'Ligue 1' },
  { code: 'PL', name: 'Premier League' },
  { code: 'PD', name: 'La Liga' },
  { code: 'CL', name: 'Champions League' },
];

const token = process.env.FOOTBALL_DATA_TOKEN;
const outputPath = join(process.cwd(), 'public', 'live-data', 'matches.json');

const toIsoDate = (date) => date.toISOString().slice(0, 10);
const today = new Date();
const dateFrom = toIsoDate(new Date(today.getTime() - 24 * 60 * 60 * 1000));
const dateTo = toIsoDate(new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000));

const statusMap = {
  SCHEDULED: 'upcoming',
  TIMED: 'upcoming',
  IN_PLAY: 'live',
  PAUSED: 'live',
  FINISHED: 'finished',
};

const cleanTeamName = (name) =>
  name
    .replace(/\bFC\b/g, '')
    .replace(/\bCF\b/g, '')
    .replace(/\bAFC\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const shortNameFor = (team) => {
  if (team.tla) return team.tla;
  if (team.shortName) return team.shortName.slice(0, 4).toUpperCase();
  return cleanTeamName(team.name ?? 'Team')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 4)
    .toUpperCase();
};

const normalizeMatch = (match, competition) => ({
  id: `fd-${match.id}`,
  externalId: String(match.id),
  competitionCode: competition.code,
  competitionName: competition.name,
  homeTeam: {
    id: String(match.homeTeam?.id ?? `home-${match.id}`),
    name: cleanTeamName(match.homeTeam?.shortName ?? match.homeTeam?.name ?? 'Équipe domicile'),
    shortName: shortNameFor(match.homeTeam ?? {}),
  },
  awayTeam: {
    id: String(match.awayTeam?.id ?? `away-${match.id}`),
    name: cleanTeamName(match.awayTeam?.shortName ?? match.awayTeam?.name ?? 'Équipe extérieure'),
    shortName: shortNameFor(match.awayTeam ?? {}),
  },
  kickoff: match.utcDate,
  status: statusMap[match.status] ?? 'upcoming',
  homeScore: match.score?.fullTime?.home ?? match.score?.halfTime?.home ?? undefined,
  awayScore: match.score?.fullTime?.away ?? match.score?.halfTime?.away ?? undefined,
  minute: typeof match.minute === 'number' ? match.minute : null,
  venue: match.venue ?? undefined,
  matchday: match.matchday ?? null,
  source: 'football-data.org',
  lastUpdated: match.lastUpdated ?? undefined,
});

const fetchCompetition = async (competition) => {
  const url = new URL(`https://api.football-data.org/v4/competitions/${competition.code}/matches`);
  url.searchParams.set('dateFrom', dateFrom);
  url.searchParams.set('dateTo', dateTo);

  const response = await fetch(url, {
    headers: { 'X-Auth-Token': token },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${competition.code}: ${response.status} ${text.slice(0, 180)}`);
  }

  const data = await response.json();
  return (data.matches ?? []).map((match) => normalizeMatch(match, competition));
};

if (!token) {
  console.log('FOOTBALL_DATA_TOKEN missing: keeping fallback live-data file.');
  process.exit(0);
}

const results = await Promise.allSettled(competitions.map(fetchCompetition));
const matches = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
const errors = results
  .filter((result) => result.status === 'rejected')
  .map((result) => result.reason?.message ?? String(result.reason));

matches.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());

const payload = {
  generatedAt: new Date().toISOString(),
  source: 'football-data.org',
  dateFrom,
  dateTo,
  competitions: competitions.map((competition) => competition.code),
  message: errors.length > 0 ? `Certaines compétitions n'ont pas répondu: ${errors.join(' | ')}` : null,
  matches,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Wrote ${matches.length} matches to ${outputPath}`);
