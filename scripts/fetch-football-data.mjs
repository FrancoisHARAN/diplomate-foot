import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { buildLiveDataPayload } from './lib/football-data-change-utils.mjs';
import { getApiMatchPointsMultiplier } from './lib/football-data-boost-utils.mjs';
import { getPredictionScoreFromApiMatch } from './lib/football-data-score-utils.mjs';
import { cleanTeamName, isDisplayableMatch, normalizeTeam, shortNameFor } from './lib/football-data-team-utils.mjs';

const WORLD_CUP_2026_API_COMPETITION_ID = process.env.WORLD_CUP_2026_COMPETITION_ID || 'WC';
const WORLD_CUP_2026_SEASON = process.env.WORLD_CUP_2026_SEASON || '2026';
const WORLD_CUP_2026_DATE_FROM = process.env.WORLD_CUP_2026_DATE_FROM || '2026-06-11';
const WORLD_CUP_2026_DATE_TO = process.env.WORLD_CUP_2026_DATE_TO || '2026-07-19';

const competitions = [
  {
    code: 'WC2026',
    apiCode: WORLD_CUP_2026_API_COMPETITION_ID,
    name: 'Coupe du Monde 2026',
    season: WORLD_CUP_2026_SEASON,
    dateFrom: WORLD_CUP_2026_DATE_FROM,
    dateTo: WORLD_CUP_2026_DATE_TO,
    sourceCompetitionId: WORLD_CUP_2026_API_COMPETITION_ID,
    isWorldCup2026: true,
  },
];

const token = process.env.FOOTBALL_DATA_TOKEN;
const outputPath = join(process.cwd(), 'public', 'live-data', 'matches.json');

const today = new Date();
const dateFrom = WORLD_CUP_2026_DATE_FROM;
const dateTo = WORLD_CUP_2026_DATE_TO;
const archiveFrom = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);

const statusMap = {
  SCHEDULED: 'upcoming',
  TIMED: 'upcoming',
  IN_PLAY: 'live',
  PAUSED: 'live',
  EXTRA_TIME: 'live',
  PENALTY_SHOOTOUT: 'live',
  FINISHED: 'finished',
};

const countryCodeAliases = new Map([
  ['ARG', 'ARG'], ['ARGENTINA', 'ARG'], ['ARGENTINE', 'ARG'],
  ['BRA', 'BRA'], ['BRAZIL', 'BRA'], ['BRASIL', 'BRA'], ['BRÉSIL', 'BRA'],
  ['CAN', 'CAN'], ['CANADA', 'CAN'],
  ['DEU', 'GER'], ['GER', 'GER'], ['GERMANY', 'GER'], ['ALLEMAGNE', 'GER'],
  ['ENG', 'ENG'], ['ENGLAND', 'ENG'], ['ANGLETERRE', 'ENG'],
  ['ESP', 'ESP'], ['SPAIN', 'ESP'], ['ESPAGNE', 'ESP'],
  ['FRA', 'FRA'], ['FRANCE', 'FRA'],
  ['JPN', 'JPN'], ['JAPAN', 'JPN'], ['JAPON', 'JPN'],
  ['MAR', 'MAR'], ['MOROCCO', 'MAR'], ['MAROC', 'MAR'],
  ['MEX', 'MEX'], ['MEXICO', 'MEX'], ['MEXIQUE', 'MEX'],
  ['NED', 'NED'], ['NETHERLANDS', 'NED'], ['PAYS-BAS', 'NED'],
  ['POR', 'POR'], ['PORTUGAL', 'POR'],
  ['RSA', 'RSA'], ['SOUTH AFRICA', 'RSA'], ['AFRIQUE DU SUD', 'RSA'], ['ZA', 'RSA'],
  ['SEN', 'SEN'], ['SENEGAL', 'SEN'], ['SÉNÉGAL', 'SEN'],
  ['USA', 'USA'], ['UNITED STATES', 'USA'], ['ÉTATS-UNIS', 'USA'],
]);

const normalizeLabel = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();

const countryCodeFor = (team) => {
  const candidates = [team?.tla, team?.countryCode, team?.shortName, team?.name].filter(Boolean);
  for (const candidate of candidates) {
    const direct = String(candidate).toUpperCase();
    if (countryCodeAliases.has(direct)) return countryCodeAliases.get(direct);
    const normalized = normalizeLabel(candidate);
    if (countryCodeAliases.has(normalized)) return countryCodeAliases.get(normalized);
  }
  return shortNameFor(team ?? {});
};

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

const readExistingPayload = async () => {
  try {
    return JSON.parse(await readFile(outputPath, 'utf8'));
  } catch {
    return null;
  }
};

const isWorldCupPayloadMatch = (match) => {
  const text = [
    match?.competitionCode,
    match?.competitionName,
    match?.sourceCompetitionId,
    match?.season,
  ].filter(Boolean).join(' ').toLowerCase();
  const isWorldCup =
    match?.competitionCode === 'WC2026' ||
    String(match?.sourceCompetitionId ?? '').toUpperCase() === 'WC' ||
    text.includes('world cup') ||
    text.includes('coupe du monde') ||
    text.includes('wc2026');
  const isOtherWorldCup =
    text.includes('qualif') ||
    text.includes('qualification') ||
    text.includes('friendly') ||
    text.includes('amical');
  return isWorldCup && !isOtherWorldCup;
};

const readArchivedFinishedMatches = (existingPayload) =>
  (existingPayload?.matches ?? []).filter((match) => {
    if (!isWorldCupPayloadMatch(match)) return false;
    if (match.status !== 'finished') return false;
    if (typeof match.homeScore !== 'number' || typeof match.awayScore !== 'number') return false;
    return new Date(match.kickoff).getTime() >= archiveFrom.getTime();
  });

const normalizeMatch = (match, competition) => {
  const isWorldCup2026 = Boolean(competition.isWorldCup2026);
  const homeTeam = normalizeTeam(match.homeTeam, undefined, `home-${match.id}`, 'Home team', isWorldCup2026, countryCodeFor);
  const awayTeam = normalizeTeam(match.awayTeam, undefined, `away-${match.id}`, 'Away team', isWorldCup2026, countryCodeFor);
  const predictionScore = getPredictionScoreFromApiMatch(match);
  if (predictionScore.warning) {
    console.warn(`${competition.code} ${match.id}: ${predictionScore.warning}`);
  }
  const pointsMultiplier = getApiMatchPointsMultiplier({ competition, match, homeTeam, awayTeam });

  return {
    id: `fd-${match.id}`,
    externalId: String(match.id),
    competitionCode: competition.code,
    competitionName: competition.name,
    homeTeam,
    awayTeam,
    kickoff: match.utcDate,
    status: statusMap[match.status] ?? 'upcoming',
    homeScore: predictionScore.homeScore,
    awayScore: predictionScore.awayScore,
    scoreKind: predictionScore.scoreKind,
    scoreSource: predictionScore.scoreSource,
    scoreWarning: predictionScore.warning,
    minute: typeof match.minute === 'number' ? match.minute : null,
    venue: match.venue ?? undefined,
    matchday: match.matchday ?? null,
    stage: match.stage ?? null,
    round: match.stage ?? match.group ?? null,
    group: match.group ?? null,
    season: competition.season ? Number(competition.season) : undefined,
    sourceCompetitionId: competition.sourceCompetitionId ?? competition.apiCode ?? competition.code,
    pointsMultiplier,
    source: 'football-data.org',
    lastUpdated: match.lastUpdated ?? undefined,
  };
};

const fetchCompetition = async (competition) => {
  const url = new URL(`https://api.football-data.org/v4/competitions/${competition.apiCode ?? competition.code}/matches`);
  url.searchParams.set('dateFrom', competition.dateFrom ?? dateFrom);
  url.searchParams.set('dateTo', competition.dateTo ?? dateTo);
  if (competition.season) url.searchParams.set('season', competition.season);

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

const previousPayload = await readExistingPayload();
const results = [];
for (const competition of competitions) {
  try {
    results.push({ competition, status: 'fulfilled', value: await fetchCompetition(competition) });
  } catch (error) {
    results.push({ competition, status: 'rejected', reason: error });
  }
}

const previousMatches = previousPayload?.matches ?? [];
const fallbackMatchesByCompetition = new Map(
  competitions.map((competition) => [
    competition.code,
    previousMatches.filter((match) => match.competitionCode === competition.code),
  ]),
);
const freshMatches = results.flatMap((result) => {
  if (result.status === 'fulfilled') return result.value;
  const fallbackMatches = fallbackMatchesByCompetition.get(result.competition.code) ?? [];
  if (fallbackMatches.length > 0) {
    console.log(`${result.competition.code}: using ${fallbackMatches.length} cached match(es) after fetch failure`);
  }
  return fallbackMatches;
});
const archivedFinishedMatches = readArchivedFinishedMatches(previousPayload);
const byId = new Map();

archivedFinishedMatches.forEach((match) => byId.set(match.id, match));
freshMatches.forEach((match) => byId.set(match.id, match));

const matches = Array.from(byId.values());
const errors = results
  .filter((result) => result.status === 'rejected')
  .map((result) => result.reason?.message ?? String(result.reason));

matches.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());

const nowIso = new Date().toISOString();
const nextPayload = {
  generatedAt: nowIso,
  lastDataChangedAt: nowIso,
  source: 'football-data.org',
  dateFrom,
  dateTo,
  competitions: competitions.map((competition) => competition.code),
  message: errors.length > 0 ? `Certaines compétitions n'ont pas répondu: ${errors.join(' | ')}` : null,
  matches,
};
const payload = buildLiveDataPayload({
  previousPayload,
  nextPayload,
  nowIso,
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Wrote ${payload.matches?.length ?? matches.length} matches to ${outputPath}`);
