import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8').replace(/\r\n/g, '\n');

const pointsSource = read('src/utils/points.ts');
const schemaSource = read('supabase/schema.sql');
const fetchSource = read('scripts/fetch-football-data.mjs');
const packageJson = read('package.json');
const debugScoringSource = read('docs/debug-scoring.md');
const matchCardSource = read('src/components/MatchCard.tsx');
const matchDetailSource = read('src/pages/MatchDetailPage.tsx');
const publicPredictionsSource = read('src/components/MatchPublicPredictionsSection.tsx');

const failures = [];

const requireText = (source, expected, label) => {
  if (!source.includes(expected)) failures.push(`${label} is missing: ${expected}`);
};

const forbidText = (source, forbidden, label) => {
  if (source.includes(forbidden)) failures.push(`${label} must not contain: ${forbidden}`);
};

const compilePointsContext = (worldCupOverride = {}) => {
  const source = pointsSource
    .replace(/^import .*$/gm, '')
    .replace(/export const/g, 'const');

  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;

  const context = {
    isFranceWorldCup2026Match: () => false,
    isWorldCup2026Match: () => false,
    ...worldCupOverride,
  };

  vm.runInNewContext(
    `${compiled}
globalThis.getMatchMultiplier = getMatchMultiplier;
globalThis.calculatePredictionPointsForMatch = calculatePredictionPointsForMatch;`,
    context,
  );

  return context;
};

const baseContext = compilePointsContext();
const worldCupContext = compilePointsContext({
  isWorldCup2026Match: () => true,
  isFranceWorldCup2026Match: (match) =>
    [match.homeTeam?.countryCode, match.homeTeam?.shortName, match.homeTeam?.name, match.awayTeam?.countryCode, match.awayTeam?.shortName, match.awayTeam?.name]
      .some((value) => ['fra', 'france'].includes(String(value ?? '').toLowerCase())),
});

const makeMatch = (overrides = {}) => ({
  id: 'boost-test',
  competitionCode: 'FL1',
  competitionName: 'Ligue 1',
  homeTeam: { id: 'home', name: 'Lens', shortName: 'RCL' },
  awayTeam: { id: '524', name: 'Paris Saint-Germain', shortName: 'PSG' },
  kickoff: '2026-05-17T19:00:00.000Z',
  status: 'finished',
  homeScore: 2,
  awayScore: 1,
  pointsMultiplier: 1,
  ...overrides,
});

const psgVariants = [
  { id: '524', name: 'Paris Saint-Germain', shortName: 'PSG' },
  { id: 'club-psg', name: 'Paris SG', shortName: 'PSG' },
  { id: 'psg', name: 'PSG', shortName: 'PSG' },
];

for (const team of psgVariants) {
  const match = makeMatch({ awayTeam: team });
  const multiplier = baseContext.getMatchMultiplier(match);
  if (multiplier !== 2) failures.push(`frontend PSG boost expected x2 for ${JSON.stringify(team)}, got x${multiplier}`);
  const exact = baseContext.calculatePredictionPointsForMatch(2, 1, match);
  if (exact !== 8) failures.push(`frontend PSG exact score expected 8 points for ${JSON.stringify(team)}, got ${exact}`);
}

const parisFcMatch = makeMatch({
  homeTeam: { id: '10', name: 'Paris FC', shortName: 'PAR' },
  awayTeam: { id: 'lens', name: 'Lens', shortName: 'RCL' },
});
const parisFcMultiplier = baseContext.getMatchMultiplier(parisFcMatch);
if (parisFcMultiplier !== 1) failures.push(`Paris FC alone must not trigger PSG boost, got x${parisFcMultiplier}`);

const psgCases = [
  { label: 'exact', prediction: [2, 1], actual: [2, 1], expected: 8 },
  { label: 'two-point gap', prediction: [1, 0], actual: [3, 2], expected: 4 },
  { label: 'winner only', prediction: [2, 0], actual: [3, 2], expected: 2 },
  { label: 'non-exact draw', prediction: [0, 0], actual: [2, 2], expected: 2 },
  { label: 'lost', prediction: [0, 1], actual: [2, 1], expected: 0 },
];

for (const testCase of psgCases) {
  const [homePrediction, awayPrediction] = testCase.prediction;
  const [homeScore, awayScore] = testCase.actual;
  const actual = baseContext.calculatePredictionPointsForMatch(homePrediction, awayPrediction, makeMatch({ homeScore, awayScore }));
  if (actual !== testCase.expected) {
    failures.push(`PSG boost ${testCase.label}: expected ${testCase.expected}, got ${actual}`);
  }
}

const livePsg = baseContext.calculatePredictionPointsForMatch(2, 1, makeMatch({ status: 'live', homeScore: 2, awayScore: 1 }));
if (livePsg !== null) failures.push(`Live PSG boosted match must stay pending/null, got ${livePsg}`);

const franceGroup = makeMatch({
  competitionCode: 'WC2026',
  competitionName: 'Coupe du Monde 2026',
  homeTeam: { id: 'fra', name: 'France', shortName: 'FRA', countryCode: 'FRA' },
  awayTeam: { id: 'can', name: 'Canada', shortName: 'CAN', countryCode: 'CAN' },
  stage: 'GROUP_STAGE',
  pointsMultiplier: 1,
});
if (worldCupContext.getMatchMultiplier(franceGroup) !== 2) {
  failures.push(`France World Cup group match must be x2, got x${worldCupContext.getMatchMultiplier(franceGroup)}`);
}

const franceSemi = { ...franceGroup, stage: 'Semi-finals' };
if (worldCupContext.getMatchMultiplier(franceSemi) !== 4) {
  failures.push(`France semi-final must use strongest x4, got x${worldCupContext.getMatchMultiplier(franceSemi)}`);
}

const worldCupFinal = makeMatch({
  competitionCode: 'WC2026',
  competitionName: 'Coupe du Monde 2026',
  homeTeam: { id: 'bra', name: 'Brésil', shortName: 'BRA', countryCode: 'BRA' },
  awayTeam: { id: 'arg', name: 'Argentine', shortName: 'ARG', countryCode: 'ARG' },
  stage: 'FINAL',
  pointsMultiplier: 1,
});
if (worldCupContext.getMatchMultiplier(worldCupFinal) !== 5) {
  failures.push(`World Cup final must be x5, got x${worldCupContext.getMatchMultiplier(worldCupFinal)}`);
}

const { isPsgTeam, getApiMatchPointsMultiplier } = await import('./lib/football-data-boost-utils.mjs');

if (!isPsgTeam({ id: 524, name: 'Paris Saint-Germain', shortName: 'PSG' })) {
  failures.push('football fetch must identify football-data PSG id 524.');
}
if (isPsgTeam({ id: 10, name: 'Paris FC', shortName: 'PAR' })) {
  failures.push('football fetch must not identify Paris FC as PSG.');
}

const apiPsgMultiplier = getApiMatchPointsMultiplier({
  competition: { code: 'FL1', name: 'Ligue 1' },
  match: { stage: 'REGULAR_SEASON', matchday: 12 },
  homeTeam: { id: '10', name: 'Paris FC', shortName: 'PAR' },
  awayTeam: { id: '524', name: 'PSG', shortName: 'PSG' },
});
if (apiPsgMultiplier !== 2) failures.push(`football fetch PSG multiplier expected x2, got x${apiPsgMultiplier}`);

const apiParisFcMultiplier = getApiMatchPointsMultiplier({
  competition: { code: 'FL1', name: 'Ligue 1' },
  match: { stage: 'REGULAR_SEASON', matchday: 12 },
  homeTeam: { id: '10', name: 'Paris FC', shortName: 'PAR' },
  awayTeam: { id: '20', name: 'Lens', shortName: 'RCL' },
});
if (apiParisFcMultiplier !== 1) failures.push(`football fetch Paris FC-only multiplier expected x1, got x${apiParisFcMultiplier}`);

const apiFranceSemiMultiplier = getApiMatchPointsMultiplier({
  competition: { code: 'WC2026', name: 'Coupe du Monde 2026', isWorldCup2026: true },
  match: { stage: 'Semi-finals', matchday: 6 },
  homeTeam: { id: 'fra', name: 'France', shortName: 'FRA', countryCode: 'FRA' },
  awayTeam: { id: 'bra', name: 'Brésil', shortName: 'BRA', countryCode: 'BRA' },
});
if (apiFranceSemiMultiplier !== 4) failures.push(`football fetch France semi-final multiplier expected x4, got x${apiFranceSemiMultiplier}`);

requireText(packageJson, '"check:boost-scoring"', 'package script');
requireText(fetchSource, 'getApiMatchPointsMultiplier', 'football fetch central boost helper');
requireText(schemaSource, 'app_private_team_is_psg', 'SQL PSG helper');
requireText(schemaSource, "p_team->>'id' in ('524', 'club-psg', 'psg')", 'SQL PSG id guard');
requireText(schemaSource, "public.app_private_team_is_psg(p_home_team)", 'SQL home PSG boost');
requireText(schemaSource, "public.app_private_team_is_psg(p_away_team)", 'SQL away PSG boost');
requireText(schemaSource, 'as points_multiplier', 'SQL public match RPC effective multiplier');
forbidText(schemaSource, "teams_text like '%paris%'", 'SQL must not broadly boost Paris');
requireText(debugScoringSource, 'points_multiplier_stocke', 'debug scoring stored multiplier');
requireText(debugScoringSource, 'boost_reel', 'debug scoring effective multiplier');
requireText(debugScoringSource, 'points_de_base', 'debug scoring base points');
requireText(matchCardSource, 'getMatchMultiplier(match)', 'match cards display effective multiplier');
requireText(matchDetailSource, 'getMatchMultiplier(match)', 'match detail displays effective multiplier');
requireText(publicPredictionsSource, 'calculatePredictionPointsForMatch', 'public match groups use boosted scoring fallback');

if (failures.length > 0) {
  throw new Error(failures.join('\n'));
}

console.log('Boost scoring consistency checks passed.');
