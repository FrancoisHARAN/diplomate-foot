import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const pointsSource = read('src/utils/points.ts');
const appStateSource = read('src/utils/appState.ts');
const playerProfileSource = read('src/pages/PlayerProfilePage.tsx');
const myPredictionsSource = read('src/pages/MyPredictionsPage.tsx');
const matchDetailSource = read('src/pages/MatchDetailPage.tsx');
const matchPublicSectionSource = read('src/components/MatchPublicPredictionsSection.tsx');
const schemaSource = read('supabase/schema.sql');

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
globalThis.isMatchFinal = typeof isMatchFinal === 'function' ? isMatchFinal : undefined;
globalThis.calculatePredictionPointsForMatch = calculatePredictionPointsForMatch;
globalThis.getPredictionResultTypeForMatch = typeof getPredictionResultTypeForMatch === 'function' ? getPredictionResultTypeForMatch : undefined;`,
    context,
  );

  return context;
};

const makeMatch = (status, homeScore, awayScore) => ({
  id: `match-${status}-${homeScore}-${awayScore}`,
  status,
  homeScore,
  awayScore,
  kickoff: '2026-05-12T19:00:00.000Z',
  homeTeam: { id: 'home', name: 'Real Betis', shortName: 'BET' },
  awayTeam: { id: 'away', name: 'Elche', shortName: 'ELC' },
});

const failures = [];
const pointsContext = compilePointsContext();

if (typeof pointsContext.isMatchFinal !== 'function') {
  failures.push('points.ts must expose a central isMatchFinal(match) helper.');
}

if (typeof pointsContext.getPredictionResultTypeForMatch !== 'function') {
  failures.push('points.ts must expose getPredictionResultTypeForMatch(match) so live matches stay pending.');
}

const cases = [
  {
    label: 'live exact-looking score stays pending',
    match: makeMatch('live', 1, 0),
    prediction: [1, 0],
    expectedPoints: null,
    expectedResultType: 'pending',
  },
  {
    label: 'live losing-looking score stays pending',
    match: makeMatch('live', 1, 0),
    prediction: [0, 0],
    expectedPoints: null,
    expectedResultType: 'pending',
  },
  {
    label: 'finished exact score grants 3 points',
    match: makeMatch('finished', 1, 0),
    prediction: [1, 0],
    expectedPoints: 3,
    expectedResultType: 'exact',
  },
  {
    label: 'finished wrong score grants 0 points',
    match: makeMatch('finished', 1, 0),
    prediction: [0, 0],
    expectedPoints: 0,
    expectedResultType: 'lost',
  },
];

for (const testCase of cases) {
  const actualPoints = pointsContext.calculatePredictionPointsForMatch(
    testCase.prediction[0],
    testCase.prediction[1],
    testCase.match,
  );
  if (actualPoints !== testCase.expectedPoints) {
    failures.push(`${testCase.label}: expected points ${testCase.expectedPoints}, got ${actualPoints}`);
  }

  if (typeof pointsContext.getPredictionResultTypeForMatch === 'function') {
    const actualResultType = pointsContext.getPredictionResultTypeForMatch(
      testCase.prediction[0],
      testCase.prediction[1],
      testCase.match,
    );
    if (actualResultType !== testCase.expectedResultType) {
      failures.push(`${testCase.label}: expected result type ${testCase.expectedResultType}, got ${actualResultType}`);
    }
  }
}

const requireText = (source, expected, label) => {
  if (!source.includes(expected)) failures.push(`${label} is missing: ${expected}`);
};

const requireRegex = (source, pattern, label) => {
  if (!pattern.test(source)) failures.push(`${label} does not match ${pattern}`);
};

requireRegex(appStateSource, /matches\.filter\(\(match\) => isMatchFinal\(match\)\)/, 'leaderboard/local stats final filter');
requireText(appStateSource, 'points: isMatchFinal(match) ? calculatePredictionPointsForMatch', 'local public profile pending points');
requireText(appStateSource, "resultType: isMatchFinal(match)", 'local public profile pending result type');
requireText(appStateSource, 'const isFinished = isMatchFinal(match);', 'RPC public profile defensive final check');
requireText(
  appStateSource,
  "return isMatchFinal(match) ? item : { ...item, points: null, resultType: 'pending' };",
  'RPC public match predictions defensive final check',
);

requireText(playerProfileSource, 'Points en attente', 'public player profile live display');
requireText(playerProfileSource, 'Score en cours', 'public player profile live score label');
requireText(myPredictionsSource, 'Points en attente', 'my predictions live display');
requireText(matchDetailSource, 'Points en attente', 'match detail live display');
requireText(matchPublicSectionSource, 'isMatchFinal(match)', 'match detail public groups exact guard');

requireText(schemaSource, 'app_private_match_is_final', 'SQL final status helper');
requireText(schemaSource, 'public.app_private_match_is_final(m.status)', 'SQL RPC final checks');

if (/m\.home_score is not null and m\.away_score is not null and m\.kickoff <= now\(\)/.test(schemaSource)) {
  failures.push('SQL must not treat an available live score after kickoff as a finished match.');
}

if (failures.length > 0) {
  throw new Error(failures.join('\n'));
}

console.log('Live match pending points checks passed.');
