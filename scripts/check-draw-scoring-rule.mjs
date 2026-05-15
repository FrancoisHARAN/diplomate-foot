import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8').replace(/\r\n/g, '\n');

const pointsSource = read('src/utils/points.ts');
const rulesSource = read('src/pages/ReglementPage.tsx');
const schemaSource = read('supabase/schema.sql');
const typesSource = read('src/types/index.ts');
const publicPredictionsSource = read('src/components/MatchPublicPredictionsSection.tsx');
const matchDetailSource = read('src/pages/MatchDetailPage.tsx');
const playerProfileSource = read('src/pages/PlayerProfilePage.tsx');
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

const makeMatch = ({ status = 'finished', homeScore = 1, awayScore = 1, pointsMultiplier = 1 } = {}) => ({
  id: 'draw-rule-test',
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
  { label: 'draw exact 1-1', prediction: [1, 1], actual: [1, 1], expectedPoints: 3, expectedType: 'exact' },
  { label: 'draw non-exact 0-0 vs 2-2', prediction: [0, 0], actual: [2, 2], expectedPoints: 1, expectedType: 'draw' },
  { label: 'draw non-exact 2-2 vs 1-1', prediction: [2, 2], actual: [1, 1], expectedPoints: 1, expectedType: 'draw' },
  { label: 'draw non-exact 1-1 vs 0-0', prediction: [1, 1], actual: [0, 0], expectedPoints: 1, expectedType: 'draw' },
  { label: 'draw exact 0-0', prediction: [0, 0], actual: [0, 0], expectedPoints: 3, expectedType: 'exact' },
  { label: 'winner plus gap', prediction: [1, 0], actual: [3, 2], expectedPoints: 2, expectedType: 'two-point' },
  { label: 'winner plus gap other', prediction: [2, 0], actual: [3, 1], expectedPoints: 2, expectedType: 'two-point' },
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

const boostedDraw = context.calculatePredictionPointsForMatch(0, 0, makeMatch({ homeScore: 2, awayScore: 2, pointsMultiplier: 2 }));
if (boostedDraw !== 2) failures.push(`boosted non-exact draw must be 2 points, got ${boostedDraw}`);

const liveDraw = context.calculatePredictionPointsForMatch(0, 0, makeMatch({ status: 'live', homeScore: 0, awayScore: 0 }));
if (liveDraw !== null) failures.push(`live draw must stay pending/null, got ${liveDraw}`);

requireText(packageJson, '"check:draw-scoring"', 'package script');
requireText(typesSource, "| 'draw'", 'PredictionResultType draw value');
requireText(pointsSource, 'actualOutcome === 0 && predictedOutcome === 0', 'frontend non-exact draw branch');
requireText(schemaSource, 'and sign(p_home_score - p_away_score) = 0 then 1 * greatest', 'SQL non-exact draw branch');
requireText(schemaSource, 'then \'draw\'', 'SQL draw result type');
requireText(publicPredictionsSource, "draw: 'Bon nul'", 'public match draw label');
requireText(matchDetailSource, "draw: 'bon nul'", 'match detail draw label');
requireText(playerProfileSource, "draw: 'Bon nul'", 'profile draw label');
requireText(rulesSource, 'Un nul non exact vaut 1 pt, pas 2.', 'rules draw warning');
requireText(rulesSource, 'Tu as le bon gagnant sans le bon écart, ou tu as prévu un nul sans le score exact.', 'rules one-point copy');
forbidText(rulesSource, 'Prono 2 - 2, résultat 1 - 1.', 'old two-point draw example in 2-point rule');

if (failures.length > 0) {
  throw new Error(failures.join('\n'));
}

console.log('check-draw-scoring-rule: ok');
