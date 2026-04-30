import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const competitions = [
  { code: 'FL1', name: 'Ligue 1' },
  { code: 'PL', name: 'Premier League' },
  { code: 'PD', name: 'La Liga' },
  { code: 'CL', name: 'Champions League' },
  { code: 'EL', name: 'Europa League' },
  { code: 'UCL', name: 'Conference League' },
];

const token = process.env.FOOTBALL_DATA_TOKEN;
const outputPath = join(process.cwd(), 'public', 'live-data', 'matches.json');

const toIsoDate = (date) => date.toISOString().slice(0, 10);
const today = new Date();
const dateFrom = toIsoDate(new Date(today.getTime() - 24 * 60 * 60 * 1000));
const dateTo = toIsoDate(new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000));
const archiveFrom = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);

const statusMap = {
  SCHEDULED: 'upcoming',
  TIMED: 'upcoming',
  IN_PLAY: 'live',
  PAUSED: 'live',
  FINISHED: 'finished',
};

const knownFixtureTeams = {
  '552092': {
    homeTeam: { id: '524', name: 'PSG', shortName: 'PSG', crest: 'https://crests.football-data.org/524.png' },
    awayTeam: { id: '5', name: 'Bayern', shortName: 'FCB', crest: 'https://crests.football-data.org/5.png' },
  },
  '552093': {
    homeTeam: { id: '78', name: 'Atletico Madrid', shortName: 'ATL', crest: 'https://crests.football-data.org/78.png' },
    awayTeam: { id: '57', name: 'Arsenal', shortName: 'ARS', crest: 'https://crests.football-data.org/57.png' },
  },
  '552095': {
    homeTeam: { id: '57', name: 'Arsenal', shortName: 'ARS', crest: 'https://crests.football-data.org/57.png' },
    awayTeam: { id: '78', name: 'Atletico Madrid', shortName: 'ATL', crest: 'https://crests.football-data.org/78.png' },
  },
  '552094': {
    homeTeam: { id: '5', name: 'Bayern', shortName: 'FCB', crest: 'https://crests.football-data.org/5.png' },
    awayTeam: { id: '524', name: 'PSG', shortName: 'PSG', crest: 'https://crests.football-data.org/524.png' },
  },
};

const cleanTeamName = (name) =>
  name
    .replace(/\bFC\b/g, '')
    .replace(/\bCF\b/g, '')
    .replace(/\bAFC\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const getNumberHeader = (headers, name) => {
  const value = headers.get(name);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const throttleFromHeaders = async (headers) => {
  const remaining =
    getNumberHeader(headers, 'x-requestsavailable') ??
    getNumberHeader(headers, 'x-requests-available-minute') ??
    getNumberHeader(headers, 'x-requests-available');
  const resetSeconds = getNumberHeader(headers, 'x-requestcounter-reset');

  if (remaining !== null) {
    console.log(`football-data.org remaining requests: ${remaining}`);
  }

  if (remaining !== null && remaining <= 2) {
    const waitMs = Math.min(Math.max((resetSeconds ?? 60) * 1000, 5_000), 65_000);
    console.log(`football-data.org throttle pause: ${Math.round(waitMs / 1000)}s`);
    await sleep(waitMs);
  }
};

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

const hasUsefulTeam = (team) => {
  if (!team) return false;
  const label = cleanTeamName(team.shortName ?? team.name ?? '');
  return Boolean(team.id || team.crest || (label && label !== 'T'));
};

const normalizeTeam = (team, knownTeam, fallbackId, fallbackName) => {
  const apiTeamIsUseful = hasUsefulTeam(team);
  const sourceTeam = apiTeamIsUseful ? team : knownTeam;
  const displayName = apiTeamIsUseful ? sourceTeam?.shortName ?? sourceTeam?.name : knownTeam?.name;

  return {
    id: String(sourceTeam?.id ?? fallbackId),
    name: cleanTeamName(displayName ?? fallbackName),
    shortName: shortNameFor(sourceTeam ?? {}),
    crest: sourceTeam?.crest ?? undefined,
  };
};

const isPlaceholderTeam = (team) => team.id.startsWith('home-') || team.id.startsWith('away-');

const isDisplayableMatch = (match) => !isPlaceholderTeam(match.homeTeam) && !isPlaceholderTeam(match.awayTeam);

const readArchivedFinishedMatches = async () => {
  try {
    const existing = JSON.parse(await readFile(outputPath, 'utf8'));
    return (existing.matches ?? []).filter((match) => {
      if (match.status !== 'finished') return false;
      if (typeof match.homeScore !== 'number' || typeof match.awayScore !== 'number') return false;
      return new Date(match.kickoff).getTime() >= archiveFrom.getTime();
    });
  } catch {
    return [];
  }
};

const normalizeMatch = (match, competition) => {
  const knownFixture = knownFixtureTeams[String(match.id)] ?? {};

  return {
    id: `fd-${match.id}`,
    externalId: String(match.id),
    competitionCode: competition.code,
    competitionName: competition.name,
    homeTeam: normalizeTeam(match.homeTeam, knownFixture.homeTeam, `home-${match.id}`, 'Home team'),
    awayTeam: normalizeTeam(match.awayTeam, knownFixture.awayTeam, `away-${match.id}`, 'Away team'),
    kickoff: match.utcDate,
    status: statusMap[match.status] ?? 'upcoming',
    homeScore: match.score?.fullTime?.home ?? match.score?.halfTime?.home ?? undefined,
    awayScore: match.score?.fullTime?.away ?? match.score?.halfTime?.away ?? undefined,
    minute: typeof match.minute === 'number' ? match.minute : null,
    venue: match.venue ?? undefined,
    matchday: match.matchday ?? null,
    source: 'football-data.org',
    lastUpdated: match.lastUpdated ?? undefined,
  };
};

const fetchCompetition = async (competition) => {
  const url = new URL(`https://api.football-data.org/v4/competitions/${competition.code}/matches`);
  url.searchParams.set('dateFrom', dateFrom);
  url.searchParams.set('dateTo', dateTo);

  const response = await fetch(url, {
    headers: { 'X-Auth-Token': token },
  });

  await throttleFromHeaders(response.headers);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${competition.code}: ${response.status} ${text.slice(0, 180)}`);
  }

  const data = await response.json();
  const normalizedMatches = (data.matches ?? []).map((match) => normalizeMatch(match, competition));
  const displayableMatches = normalizedMatches.filter(isDisplayableMatch);
  const hiddenCount = normalizedMatches.length - displayableMatches.length;
  if (hiddenCount > 0) {
    console.log(`${competition.code}: hidden ${hiddenCount} match(es) without complete teams`);
  }
  return displayableMatches;
};

if (!token) {
  console.log('FOOTBALL_DATA_TOKEN missing: keeping fallback live-data file.');
  process.exit(0);
}

const results = [];
for (const competition of competitions) {
  try {
    results.push({ status: 'fulfilled', value: await fetchCompetition(competition) });
  } catch (error) {
    results.push({ status: 'rejected', reason: error });
  }
}
const freshMatches = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
const archivedFinishedMatches = await readArchivedFinishedMatches();
const byId = new Map();

archivedFinishedMatches.forEach((match) => byId.set(match.id, match));
freshMatches.forEach((match) => byId.set(match.id, match));

const matches = Array.from(byId.values());
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
