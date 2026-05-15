import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8').replace(/\r\n/g, '\n');

const rulesSource = read('src/pages/ReglementPage.tsx');
const readmeSource = read('README.md');
const fetchSource = read('scripts/fetch-football-data.mjs');
const syncSource = read('scripts/sync-football-data-to-supabase.mjs');
const pointsSource = read('src/utils/points.ts');
const schemaSource = read('supabase/schema.sql');
const packageJson = read('package.json');

const failures = [];

const requireText = (source, expected, label) => {
  if (!source.includes(expected)) failures.push(`${label} is missing: ${expected}`);
};

const forbidText = (source, forbidden, label) => {
  if (source.includes(forbidden)) failures.push(`${label} must not contain: ${forbidden}`);
};

requireText(packageJson, '"check:regular-time-scoring"', 'package script');
requireText(rulesSource, 'Temps réglementaire uniquement', 'rules regular-time title');
requireText(rulesSource, '90 minutes + temps additionnel', 'rules regular-time duration');
requireText(rulesSource, 'Les prolongations et les tirs au but ne comptent pas.', 'rules overtime exclusion');
requireText(readmeSource, 'Les pronostics sont évalués sur le temps réglementaire', 'README regular-time rule');
requireText(fetchSource, 'getPredictionScoreFromApiMatch', 'football fetch central scoring helper');
requireText(fetchSource, "EXTRA_TIME: 'live'", 'football fetch extra-time live status');
requireText(fetchSource, "PENALTY_SHOOTOUT: 'live'", 'football fetch penalty-shootout live status');
requireText(syncSource, 'score temps réglementaire', 'Supabase sync score contract comment');
requireText(pointsSource, 'score du temps réglementaire', 'frontend scoring contract comment');
requireText(schemaSource, 'home_score / away_score represent the regular-time score used for prediction scoring', 'Supabase scoring contract comment');

forbidText(fetchSource, 'homeScore: match.score?.fullTime?.home ?? match.score?.halfTime?.home ?? undefined', 'football fetch direct fullTime scoring');
forbidText(fetchSource, 'awayScore: match.score?.fullTime?.away ?? match.score?.halfTime?.away ?? undefined', 'football fetch direct fullTime scoring');
forbidText(fetchSource, 'homeScore: match.score?.extraTime', 'football fetch extraTime scoring');
forbidText(fetchSource, 'awayScore: match.score?.extraTime', 'football fetch extraTime scoring');
forbidText(fetchSource, 'homeScore: match.score?.penalties', 'football fetch penalties scoring');
forbidText(fetchSource, 'awayScore: match.score?.penalties', 'football fetch penalties scoring');

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
globalThis.calculatePredictionPointsForMatch = calculatePredictionPointsForMatch;
globalThis.getPredictionResultTypeForMatch = getPredictionResultTypeForMatch;`,
    context,
  );

  return context;
};

const pointsContext = compilePointsContext();
const makeMatch = ({ homeScore, awayScore, status = 'finished' }) => ({
  id: 'regular-time-test',
  kickoff: '2026-07-19T19:00:00.000Z',
  status,
  homeScore,
  awayScore,
  pointsMultiplier: 1,
  competitionCode: 'WC2026',
  competitionName: 'Coupe du Monde 2026',
  stage: 'FINAL',
  homeTeam: { id: 'home', name: 'France', shortName: 'FRA', countryCode: 'FRA' },
  awayTeam: { id: 'away', name: 'Brésil', shortName: 'BRA', countryCode: 'BRA' },
});

const exactOnRegularTime = pointsContext.calculatePredictionPointsForMatch(2, 2, makeMatch({ homeScore: 2, awayScore: 2 }));
if (exactOnRegularTime !== 4) {
  failures.push(`regular-time 2-2 prediction must score exact 4 points, got ${exactOnRegularTime}`);
}

const extraTimeScoreIgnored = pointsContext.calculatePredictionPointsForMatch(3, 3, makeMatch({ homeScore: 2, awayScore: 2 }));
if (extraTimeScoreIgnored === 4) {
  failures.push('3-3 prediction must not be exact when regular-time score is 2-2.');
}

const liveExtraTimePoints = pointsContext.calculatePredictionPointsForMatch(2, 2, makeMatch({ homeScore: 2, awayScore: 2, status: 'live' }));
if (liveExtraTimePoints !== null) {
  failures.push(`live extra-time match must stay pending/null, got ${liveExtraTimePoints}`);
}

const { getPredictionScoreFromApiMatch } = await import('./lib/football-data-score-utils.mjs');

const regularTimeMatch = {
  status: 'FINISHED',
  score: {
    duration: 'PENALTY_SHOOTOUT',
    fullTime: { home: 7, away: 6 },
    regularTime: { home: 1, away: 1 },
    extraTime: { home: 0, away: 0 },
    penalties: { home: 6, away: 5 },
  },
};
const regularTimeScore = getPredictionScoreFromApiMatch(regularTimeMatch);
if (regularTimeScore.homeScore !== 1 || regularTimeScore.awayScore !== 1 || regularTimeScore.scoreKind !== 'regularTime') {
  failures.push(`football-data regularTime score expected 1-1, got ${JSON.stringify(regularTimeScore)}`);
}

const regularFullTimeMatch = {
  status: 'FINISHED',
  score: {
    duration: 'REGULAR',
    fullTime: { home: 2, away: 0 },
    extraTime: { home: 1, away: 1 },
    penalties: { home: 5, away: 4 },
  },
};
const fullTimeRegularScore = getPredictionScoreFromApiMatch(regularFullTimeMatch);
if (fullTimeRegularScore.homeScore !== 2 || fullTimeRegularScore.awayScore !== 0 || fullTimeRegularScore.scoreKind !== 'fullTimeRegular') {
  failures.push(`football-data REGULAR fullTime fallback expected 2-0, got ${JSON.stringify(fullTimeRegularScore)}`);
}

const ambiguousExtraTimeMatch = {
  status: 'FINISHED',
  score: {
    duration: 'EXTRA_TIME',
    fullTime: { home: 3, away: 3 },
    extraTime: { home: 1, away: 1 },
  },
};
const ambiguousScore = getPredictionScoreFromApiMatch(ambiguousExtraTimeMatch);
if (ambiguousScore.homeScore !== undefined || ambiguousScore.awayScore !== undefined || !ambiguousScore.warning) {
  failures.push(`ambiguous extra-time score must not fall back to fullTime, got ${JSON.stringify(ambiguousScore)}`);
}

if (failures.length > 0) {
  throw new Error(failures.join('\n'));
}

console.log('Regular-time scoring checks passed.');
