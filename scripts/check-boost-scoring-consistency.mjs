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
  competitionCode: 'WC2026',
  competitionName: 'Coupe du Monde 2026',
  homeTeam: { id: 'fra', name: 'France', shortName: 'FRA', countryCode: 'FRA' },
  awayTeam: { id: 'can', name: 'Canada', shortName: 'CAN', countryCode: 'CAN' },
  kickoff: '2026-06-11T19:00:00.000Z',
  status: 'finished',
  homeScore: 2,
  awayScore: 1,
  pointsMultiplier: 1,
  ...overrides,
});

const oldClubMatch = {
  id: 'old-club-match',
  competitionCode: 'OLD_LEAGUE',
  competitionName: 'Old club league',
  homeTeam: { id: 'home-club', name: 'Home Club', shortName: 'HOM' },
  awayTeam: { id: 'away-club', name: 'Away Club', shortName: 'AWY' },
  kickoff: '2026-05-17T19:00:00.000Z',
  status: 'finished',
  homeScore: 2,
  awayScore: 1,
  pointsMultiplier: 1,
};

if (baseContext.getMatchMultiplier(oldClubMatch) !== 1) {
  failures.push(`Old club match must not be boosted, got x${baseContext.getMatchMultiplier(oldClubMatch)}`);
}

if (baseContext.calculatePredictionPointsForMatch(2, 1, oldClubMatch) !== 4) {
  failures.push('Old club exact score must stay at base 4 points after clean start.');
}

const franceGroup = makeMatch({ stage: 'GROUP_STAGE' });
if (worldCupContext.getMatchMultiplier(franceGroup) !== 2) {
  failures.push(`France World Cup group match must be x2, got x${worldCupContext.getMatchMultiplier(franceGroup)}`);
}

const franceSemi = { ...franceGroup, stage: 'Semi-finals' };
if (worldCupContext.getMatchMultiplier(franceSemi) !== 4) {
  failures.push(`France semi-final must use strongest x4, got x${worldCupContext.getMatchMultiplier(franceSemi)}`);
}

const worldCupQuarter = makeMatch({
  homeTeam: { id: 'bra', name: 'Bresil', shortName: 'BRA', countryCode: 'BRA' },
  awayTeam: { id: 'arg', name: 'Argentine', shortName: 'ARG', countryCode: 'ARG' },
  stage: 'Quarter-finals',
});
if (worldCupContext.getMatchMultiplier(worldCupQuarter) !== 3) {
  failures.push(`World Cup quarter-final must be x3, got x${worldCupContext.getMatchMultiplier(worldCupQuarter)}`);
}

const worldCupFinal = makeMatch({
  homeTeam: { id: 'bra', name: 'Bresil', shortName: 'BRA', countryCode: 'BRA' },
  awayTeam: { id: 'arg', name: 'Argentine', shortName: 'ARG', countryCode: 'ARG' },
  stage: 'FINAL',
});
if (worldCupContext.getMatchMultiplier(worldCupFinal) !== 5) {
  failures.push(`World Cup final must be x5, got x${worldCupContext.getMatchMultiplier(worldCupFinal)}`);
}

const { getApiMatchPointsMultiplier } = await import('./lib/football-data-boost-utils.mjs');

const apiOldClubMultiplier = getApiMatchPointsMultiplier({
  competition: { code: 'OLD_LEAGUE', name: 'Old club league' },
  match: { stage: 'REGULAR_SEASON', matchday: 12 },
  homeTeam: { id: 'home-club', name: 'Home Club', shortName: 'HOM' },
  awayTeam: { id: 'away-club', name: 'Away Club', shortName: 'AWY' },
});
if (apiOldClubMultiplier !== 1) failures.push(`football fetch old club multiplier expected x1, got x${apiOldClubMultiplier}`);

const apiFranceSemiMultiplier = getApiMatchPointsMultiplier({
  competition: { code: 'WC2026', name: 'Coupe du Monde 2026', isWorldCup2026: true },
  match: { stage: 'Semi-finals', matchday: 6 },
  homeTeam: { id: 'fra', name: 'France', shortName: 'FRA', countryCode: 'FRA' },
  awayTeam: { id: 'bra', name: 'Bresil', shortName: 'BRA', countryCode: 'BRA' },
});
if (apiFranceSemiMultiplier !== 4) failures.push(`football fetch France semi-final multiplier expected x4, got x${apiFranceSemiMultiplier}`);

requireText(packageJson, '"check:boost-scoring"', 'package script');
requireText(fetchSource, 'getApiMatchPointsMultiplier', 'football fetch central boost helper');
forbidText(schemaSource, ['app_private_team_is_', 'psg'].join(''), 'SQL old club helper');
forbidText(schemaSource, ['Dem', 'b'].join(''), 'SQL old flash seed');
requireText(schemaSource, 'as points_multiplier', 'SQL public match RPC effective multiplier');
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
