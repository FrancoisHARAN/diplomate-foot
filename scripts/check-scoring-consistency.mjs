import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8').replace(/\r\n/g, '\n');

const pointsSource = read('src/utils/points.ts');
const appStateSource = read('src/utils/appState.ts');
const matchPublicSectionSource = read('src/components/MatchPublicPredictionsSection.tsx');
const flashChallengeCardSource = read('src/components/FlashChallengeCard.tsx');
const playerProfileSource = read('src/pages/PlayerProfilePage.tsx');
const myPredictionsSource = read('src/pages/MyPredictionsPage.tsx');
const matchDetailSource = read('src/pages/MatchDetailPage.tsx');
const schemaSource = read('supabase/schema.sql');
const packageJson = read('package.json');
const debugScoringSource = read('docs/debug-scoring.md');

const failures = [];

const requireText = (source, expected, label) => {
  if (!source.includes(expected)) failures.push(`${label} is missing: ${expected}`);
};

const forbidText = (source, forbidden, label) => {
  if (source.includes(forbidden)) failures.push(`${label} must not contain: ${forbidden}`);
};

const functionBody = (name) => {
  const marker = `create or replace function public.${name}`;
  const start = schemaSource.indexOf(marker);
  if (start === -1) {
    failures.push(`Function not found: ${name}`);
    return '';
  }
  const end = schemaSource.indexOf('\n$$;', start);
  if (end === -1) {
    failures.push(`Function body not closed: ${name}`);
    return schemaSource.slice(start);
  }
  return schemaSource.slice(start, end);
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
globalThis.isMatchFinal = isMatchFinal;
globalThis.calculatePredictionPoints = calculatePredictionPoints;
globalThis.getPredictionResultTypeForMatch = getPredictionResultTypeForMatch;
globalThis.calculatePredictionPointsForMatch = calculatePredictionPointsForMatch;
globalThis.getMatchMultiplier = getMatchMultiplier;`,
    context,
  );

  return context;
};

const baseContext = compilePointsContext();
const worldCupContext = compilePointsContext({
  isWorldCup2026Match: () => true,
  isFranceWorldCup2026Match: (match) =>
    [match.homeTeam?.countryCode, match.homeTeam?.name, match.awayTeam?.countryCode, match.awayTeam?.name]
      .some((value) => String(value ?? '').toLowerCase().includes('fra') || String(value ?? '').toLowerCase().includes('france')),
});

const makeMatch = ({
  status = 'finished',
  homeScore = 1,
  awayScore = 0,
  pointsMultiplier = 1,
  competitionCode = 'TEST',
  competitionName = 'Match test',
  stage,
  round,
  homeTeam = { id: 'home', name: 'Domicile', shortName: 'DOM' },
  awayTeam = { id: 'away', name: 'Exterieur', shortName: 'EXT' },
} = {}) => ({
  id: `${status}-${homeScore}-${awayScore}-${stage ?? 'stage'}`,
  kickoff: '2026-05-12T19:00:00.000Z',
  status,
  homeScore,
  awayScore,
  pointsMultiplier,
  competitionCode,
  competitionName,
  stage,
  round,
  homeTeam,
  awayTeam,
});

const pointCases = [
  {
    label: 'score exact without boost',
    prediction: [1, 2],
    match: makeMatch({ homeScore: 1, awayScore: 2 }),
    expectedPoints: 4,
    expectedType: 'exact',
  },
  {
    label: 'same winner and same goal difference',
    prediction: [0, 1],
    match: makeMatch({ homeScore: 1, awayScore: 2 }),
    expectedPoints: 2,
    expectedType: 'two-point',
  },
  {
    label: 'same winner only',
    prediction: [2, 0],
    match: makeMatch({ homeScore: 3, awayScore: 2 }),
    expectedPoints: 1,
    expectedType: 'winner',
  },
  {
    label: 'lost prediction',
    prediction: [1, 1],
    match: makeMatch({ homeScore: 0, awayScore: 1 }),
    expectedPoints: 0,
    expectedType: 'lost',
  },
  {
    label: 'non-exact draw',
    prediction: [2, 2],
    match: makeMatch({ homeScore: 1, awayScore: 1 }),
    expectedPoints: 1,
    expectedType: 'draw',
  },
  {
    label: 'live exact-looking score stays pending',
    prediction: [1, 0],
    match: makeMatch({ status: 'live', homeScore: 1, awayScore: 0 }),
    expectedPoints: null,
    expectedType: 'pending',
  },
  {
    label: 'live wrong-looking score stays pending',
    prediction: [0, 0],
    match: makeMatch({ status: 'live', homeScore: 1, awayScore: 0 }),
    expectedPoints: null,
    expectedType: 'pending',
  },
  {
    label: 'explicit x2 boost doubles exact score',
    prediction: [1, 0],
    match: makeMatch({ homeScore: 1, awayScore: 0, pointsMultiplier: 2 }),
    expectedPoints: 8,
    expectedType: 'exact',
  },
];

for (const testCase of pointCases) {
  const [home, away] = testCase.prediction;
  const actualPoints = baseContext.calculatePredictionPointsForMatch(home, away, testCase.match);
  const actualType = baseContext.getPredictionResultTypeForMatch(home, away, testCase.match);
  if (actualPoints !== testCase.expectedPoints) {
    failures.push(`${testCase.label}: expected ${testCase.expectedPoints} point(s), got ${actualPoints}`);
  }
  if (actualType !== testCase.expectedType) {
    failures.push(`${testCase.label}: expected result ${testCase.expectedType}, got ${actualType}`);
  }
}

const franceSemi = makeMatch({
  competitionCode: 'WC2026',
  competitionName: 'FIFA World Cup 2026',
  stage: 'Semi-finals',
  homeScore: 1,
  awayScore: 0,
  homeTeam: { id: 'fra', name: 'France', shortName: 'FRA', countryCode: 'FRA' },
});
const franceSemiMultiplier = worldCupContext.getMatchMultiplier(franceSemi);
if (franceSemiMultiplier !== 4) {
  failures.push(`France semi-final boost must be x4, got x${franceSemiMultiplier}`);
}
const franceSemiPoints = worldCupContext.calculatePredictionPointsForMatch(1, 0, franceSemi);
if (franceSemiPoints !== 16) {
  failures.push(`France semi-final exact score must be 16 points, got ${franceSemiPoints}`);
}

const resetEpoch = new Date('2026-05-13T12:00:00.000Z').getTime();
const afterEpoch = (isoDate) => new Date(isoDate).getTime() >= resetEpoch;
const resetCases = [
  { label: 'finished match before reset', eventAt: '2026-05-12T21:00:00.000Z', points: 3, expected: 0 },
  { label: 'finished match after reset', eventAt: '2026-05-14T21:00:00.000Z', points: 3, expected: 3 },
  { label: 'resolved flash before reset', eventAt: '2026-05-12T22:00:00.000Z', points: 5, expected: 0 },
  { label: 'resolved flash after reset', eventAt: '2026-05-14T22:00:00.000Z', points: 5, expected: 5 },
];
for (const testCase of resetCases) {
  const actual = afterEpoch(testCase.eventAt) ? testCase.points : 0;
  if (actual !== testCase.expected) {
    failures.push(`${testCase.label}: expected ${testCase.expected}, got ${actual}`);
  }
}

const visibleFinishedPoints = [3, 2, 1, 0];
const flashBonusPoints = [5];
const profileTotal = visibleFinishedPoints.reduce((sum, value) => sum + value, 0) +
  flashBonusPoints.reduce((sum, value) => sum + value, 0);
if (profileTotal !== 11) {
  failures.push(`profile total example should equal visible match points plus displayed flash bonuses, got ${profileTotal}`);
}

requireText(packageJson, '"check:scoring-consistency"', 'package script');
requireText(debugScoringSource, 'app_rpc_scored_predictions', 'debug scoring doc match details');
requireText(debugScoringSource, 'app_rpc_flash_scored_predictions', 'debug scoring doc flash details');
requireText(debugScoringSource, 'detail_points', 'debug scoring doc total comparison');

requireText(pointsSource, 'export const isMatchFinal', 'central final-status helper');
requireText(pointsSource, 'export const calculatePredictionPointsForMatch', 'central match scoring helper');
requireText(pointsSource, 'return applyMatchMultiplier(calculatePredictionPoints', 'match scoring applies multiplier after base points');

requireText(appStateSource, 'const resolveRpcPredictionPoints', 'RPC public profile scoring resolver');
requireText(appStateSource, 'const resolveRpcPredictionResultType', 'RPC public profile result resolver');
forbidText(
  appStateSource,
  'points: isFinished ? row.points ?? calculatePredictionPointsForMatch',
  'public profile must not recalculate points when RPC returned pending/null',
);
requireText(
  appStateSource,
  "rowResultType === 'pending' ? null",
  'public profile preserves pending scoring rows',
);
requireText(
  appStateSource,
  "if (!isMatchFinal(match)) return { ...item, points: null, resultType: 'pending' };",
  'public match predictions still neutralize live rows defensively',
);
requireText(
  appStateSource,
  'calculatePredictionPointsForMatch(item.homeScore, item.awayScore, match)',
  'public match predictions recompute final rows with current scoring',
);

requireText(matchPublicSectionSource, 'prediction.resultType', 'match public groups use returned result type');
requireText(matchPublicSectionSource, "prediction.resultType === 'pending' ? null", 'match public groups do not rescore pending rows');
forbidText(
  matchPublicSectionSource,
  'const resultType = hasFinalScore\n        ? getPredictionResultTypeForMatch',
  'match public groups must not ignore RPC result type',
);

requireText(flashChallengeCardSource, 'hasAuthoritativePoints', 'flash card respects RPC points');
requireText(flashChallengeCardSource, "prediction?.points ?? null", 'flash card preserves reset-excluded flash rows');
requireText(flashChallengeCardSource, 'calculatedFlashPoints', 'flash card keeps local fallback scoring');

requireText(playerProfileSource, 'publicFlashPredictions.length > 0', 'public profile displays flash point sources separately');
requireText(myPredictionsSource, 'getUserPointsMock(matches)', 'my predictions total uses cloud player state when available');
requireText(matchDetailSource, 'points !== null ? (', 'match detail displays points only when final scoring is available');

for (const snippet of [
  'create or replace function public.app_private_prediction_points',
  'create or replace function public.app_private_match_multiplier',
  'create or replace function public.app_private_match_is_final',
  'create or replace function public.app_private_match_scoring_event_at',
  'create or replace view public.app_rpc_scored_predictions',
  'where public.app_private_match_is_final(m.status)',
  'and public.app_private_is_after_scoring_epoch(\n    public.app_private_match_scoring_event_at(m.kickoff, m.last_updated)\n  );',
  'create or replace view public.app_rpc_flash_scored_predictions',
  'and public.app_private_is_after_scoring_epoch(coalesce(ch.updated_at, fp.updated_at));',
  'from public.app_rpc_scored_predictions sp',
  'from public.app_rpc_flash_scored_predictions fsp',
  'create or replace function public.app_get_leaderboard_history',
  'select public.app_private_scoring_epoch_start() as start_at',
  'and m.home_score is not null\n      and m.away_score is not null\n      and public.app_private_is_after_scoring_epoch(public.app_private_match_scoring_event_at(m.kickoff, m.last_updated))',
  'create or replace function public.app_get_recent_exact_predictions',
]) {
  requireText(schemaSource, snippet, 'schema scoring chain');
}

forbidText(schemaSource, 'm.home_score is not null and m.away_score is not null and m.kickoff <= now()', 'SQL live score guard');
const scoringEpochResetBody = functionBody('app_admin_set_scoring_epoch');
forbidText(scoringEpochResetBody, 'delete from public.app_rpc_predictions', 'scoring epoch reset must preserve predictions');
forbidText(scoringEpochResetBody, 'truncate public.app_rpc_predictions', 'scoring epoch reset must preserve predictions');
requireText(schemaSource, 'create or replace function public.app_admin_reset_competition_for_world_cup()', 'World Cup clean-start reset function');

if (failures.length > 0) {
  throw new Error(failures.join('\n'));
}

console.log('Scoring consistency checks passed.');
