import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8').replace(/\r\n/g, '\n');

const pointsSource = read('src/utils/points.ts');
const schemaSource = read('supabase/schema.sql');
const rulesSource = read('src/pages/ReglementPage.tsx');
const readmeSource = read('README.md');
const appStateSource = read('src/utils/appState.ts');
const matchCardSource = read('src/components/MatchCard.tsx');
const packageJson = read('package.json');

const failures = [];

const requireText = (source, expected, label) => {
  if (!source.includes(expected)) failures.push(`${label} is missing: ${expected}`);
};

const forbidText = (source, forbidden, label) => {
  if (source.includes(forbidden)) failures.push(`${label} must not contain: ${forbidden}`);
};

const compilePointsContext = () => {
  const source = pointsSource
    .replace(/^import .*$/gm, '')
    .replace(/export const/g, 'const');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const context = {
    isFranceWorldCup2026Match: () => false,
    isWorldCup2026Match: () => false,
  };
  vm.runInNewContext(
    `${compiled}
globalThis.calculatePredictionPoints = calculatePredictionPoints;
globalThis.getPredictionResultType = getPredictionResultType;
globalThis.calculatePredictionPointsForMatch = calculatePredictionPointsForMatch;`,
    context,
  );
  return context;
};

const context = compilePointsContext();

const makeMatch = ({ status = 'finished', homeScore = 2, awayScore = 1, pointsMultiplier = 1 } = {}) => ({
  id: 'perfect-score-test',
  kickoff: '2026-05-15T19:00:00.000Z',
  status,
  homeScore,
  awayScore,
  pointsMultiplier,
  competitionCode: 'TEST',
  competitionName: 'Test',
  homeTeam: { id: 'home', name: 'Home', shortName: 'H' },
  awayTeam: { id: 'away', name: 'Away', shortName: 'A' },
});

const cases = [
  { label: 'perfect winner score', prediction: [2, 1], actual: [2, 1], expectedPoints: 4, expectedType: 'exact' },
  { label: 'perfect nil draw', prediction: [0, 0], actual: [0, 0], expectedPoints: 4, expectedType: 'exact' },
  { label: 'perfect high draw', prediction: [3, 3], actual: [3, 3], expectedPoints: 4, expectedType: 'exact' },
  { label: 'non-exact draw', prediction: [0, 0], actual: [2, 2], expectedPoints: 1, expectedType: 'draw' },
  { label: 'winner plus gap', prediction: [1, 0], actual: [3, 2], expectedPoints: 2, expectedType: 'two-point' },
  { label: 'winner only', prediction: [2, 0], actual: [3, 2], expectedPoints: 1, expectedType: 'winner' },
];

for (const testCase of cases) {
  const [predictedHome, predictedAway] = testCase.prediction;
  const [actualHome, actualAway] = testCase.actual;
  const points = context.calculatePredictionPoints(predictedHome, predictedAway, actualHome, actualAway);
  const resultType = context.getPredictionResultType(predictedHome, predictedAway, actualHome, actualAway);
  if (points !== testCase.expectedPoints) {
    failures.push(`${testCase.label}: expected ${testCase.expectedPoints} point(s), got ${points}`);
  }
  if (resultType !== testCase.expectedType) {
    failures.push(`${testCase.label}: expected result type ${testCase.expectedType}, got ${resultType}`);
  }
}

const boostedExact = context.calculatePredictionPointsForMatch(2, 1, makeMatch({ homeScore: 2, awayScore: 1, pointsMultiplier: 2 }));
if (boostedExact !== 8) failures.push(`boosted exact score must be 8 points, got ${boostedExact}`);

const boostedDraw = context.calculatePredictionPointsForMatch(0, 0, makeMatch({ homeScore: 2, awayScore: 2, pointsMultiplier: 2 }));
if (boostedDraw !== 2) failures.push(`boosted non-exact draw must stay 2 points, got ${boostedDraw}`);

const liveExact = context.calculatePredictionPointsForMatch(1, 1, makeMatch({ status: 'live', homeScore: 1, awayScore: 1 }));
if (liveExact !== null) failures.push(`live exact-looking score must stay pending/null, got ${liveExact}`);

requireText(packageJson, '"check:perfect-score"', 'package script');
requireText(pointsSource, 'return 4;', 'frontend exact score is 4');
requireText(pointsSource, 'if (points === 4) return \'exact\';', 'frontend exact result type uses 4');
requireText(schemaSource, 'then 4 * greatest', 'SQL exact score is 4');
requireText(schemaSource, 'sp.points = 4 * public.app_private_match_multiplier', 'SQL leaderboard exact counter uses 4');
requireText(schemaSource, 'sp.points, 0) = 4 * mult.value', 'SQL history exact counter uses 4');
requireText(appStateSource, 'basePoints === 4 ? 1 : 0', 'local stats exact counter uses 4');
requireText(matchCardSource, 'basePoints === 4', 'match card exact badge uses 4');
requireText(rulesSource, "points: '4 pts'", 'rules exact score block uses 4');
requireText(readmeSource, '- Score exact: 4 points', 'README exact score uses 4');
forbidText(rulesSource, "points: '3 pts'", 'rules exact score old value');
forbidText(readmeSource, '- Score exact: 3 points', 'README old exact score value');

if (failures.length > 0) {
  throw new Error(failures.join('\n'));
}

console.log('check-perfect-score-four-points: ok');
