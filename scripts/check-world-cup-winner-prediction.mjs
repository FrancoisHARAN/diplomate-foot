import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const config = readFileSync(new URL('../src/config/worldCupWinnerPredictions.ts', import.meta.url), 'utf8');
const utility = readFileSync(new URL('../src/utils/worldCupWinnerPredictions.ts', import.meta.url), 'utf8');
const appState = readFileSync(new URL('../src/utils/appState.ts', import.meta.url), 'utf8');
const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');

const countryCodes = [...config.matchAll(/\{\s*code:\s*'([A-Z]{3})',\s*group:\s*'([A-L])'\s*\}/g)];

if (countryCodes.length !== 48) {
  throw new Error(`Expected 48 qualified countries, found ${countryCodes.length}.`);
}

if (countryCodes.some(([, code]) => code === 'ITA')) {
  throw new Error('Italy must not be present in the current qualified-country list.');
}

for (const code of ['FRA', 'IRQ', 'EGY', 'COD', 'CIV', 'CPV', 'NZL', 'KOR', 'CZE', 'KSA']) {
  if (!countryCodes.some(([, candidate]) => candidate === code)) {
    throw new Error(`Missing qualified country code ${code}.`);
  }
}

if (!config.includes("WORLD_CUP_TOP_THREE_LOCKS_AT = '2026-06-17T00:00:00Z'")) {
  throw new Error('Top 3 lock date must stay centralized in WORLD_CUP_TOP_THREE_LOCKS_AT.');
}

const pointsByPosition = [20, 15, 10];

const source = utility
  .replace(/^import .*$/gm, '')
  .replace(/export const/g, 'const');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const context = {
  WORLD_CUP_TOP_THREE_LOCKS_AT: '2026-06-17T00:00:00Z',
  WORLD_CUP_WINNER_COUNTRIES: countryCodes.map(([, code]) => ({ code })),
  WORLD_CUP_WINNER_POINTS_BY_POSITION: pointsByPosition,
  formatRemainingTime: () => '',
};
vm.runInNewContext(
  `${compiled}
globalThis.calculatePoints = calculateWorldCupWinnerPredictionPoints;
globalThis.validateCodes = validateWorldCupWinnerPredictionCodes;`,
  context,
);

if (!context.validateCodes(['FRA', 'FRA', 'ENG'])) {
  throw new Error('Duplicate countries should be rejected.');
}

if (context.validateCodes(['FRA', 'ESP', 'ENG'])) {
  throw new Error('Three distinct qualified countries should be accepted.');
}

const prediction = {
  firstChoiceCode: 'FRA',
  secondChoiceCode: 'ESP',
  thirdChoiceCode: 'ENG',
};
const cases = [
  [{ ...prediction, firstChoiceCode: 'ESP', secondChoiceCode: 'FRA' }, 20],
  [prediction, 15],
  [{ ...prediction, secondChoiceCode: 'FRA', thirdChoiceCode: 'ESP' }, 10],
  [{ ...prediction, firstChoiceCode: 'FRA', secondChoiceCode: 'POR', thirdChoiceCode: 'ENG' }, 0],
];

for (const [candidate, expected] of cases) {
  const actual = context.calculatePoints(candidate, 'ESP');
  if (actual !== expected) throw new Error(`Expected ${expected} points for Spain, got ${actual}.`);
}

const duplicatePrediction = { firstChoiceCode: 'ESP', secondChoiceCode: 'ESP', thirdChoiceCode: 'ESP' };
if (context.calculatePoints(duplicatePrediction, 'ESP') !== 20) {
  throw new Error('A legacy duplicate prediction must count Spain only once.');
}

if (!config.includes("WORLD_CUP_CHAMPION_CODE = 'ESP'")) {
  throw new Error('Spain must be configured with the canonical champion code ESP.');
}

for (const expected of [
  'app_private_world_cup_winner_prediction_points',
  'app_rpc_world_cup_winner_scored_predictions',
  'app_admin_set_world_cup_champion',
  "'world_cup_champion_code'",
  'coalesce(winner_stats.points, 0)',
  'winner_events as (',
  'select * from winner_events',
]) {
  if (!schema.includes(expected)) throw new Error(`Missing Supabase Top 3 scoring marker: ${expected}`);
}

for (const expected of [
  'WORLD_CUP_CHAMPION_CODE',
  'calculateWorldCupWinnerPredictionPoints',
  'winnerPoints',
]) {
  if (!appState.includes(expected)) throw new Error(`Missing local fallback Top 3 scoring marker: ${expected}`);
}

const sqlPointsFunction = schema.match(/create or replace function public\.app_private_world_cup_winner_prediction_points[\s\S]*?\$\$;/i)?.[0] ?? '';
if (/match_multiplier|points_multiplier/i.test(sqlPointsFunction)) {
  throw new Error('Top 3 winner points must not use match boosts.');
}

const adminFunction = schema.match(/create or replace function public\.app_admin_set_world_cup_champion[\s\S]*?\$\$;/i)?.[0] ?? '';
if (!adminFunction.includes("'changed', false") || /update\s+public\.app_rpc_players/i.test(adminFunction)) {
  throw new Error('Champion resolution must be idempotent and must not update player totals directly.');
}

for (const expected of [
  'coalesce(match_stats.exact_scores, 0)::int as exact_scores',
  'coalesce(match_stats.two_point_results, 0)::int as two_point_results',
  'coalesce(match_stats.correct_results, 0)::int as correct_results',
]) {
  if (!schema.includes(expected)) throw new Error(`Top 3 points must leave match statistics unchanged: ${expected}`);
}

if (!schema.includes('revoke all on function public.app_admin_set_world_cup_champion(text) from public, anon, authenticated;')) {
  throw new Error('The champion admin function must not be exposed to public API roles.');
}

if (context.validateCodes(['FRA', 'FRA', 'ENG']) === null) {
  throw new Error('Duplicate countries should be rejected.');
}

console.log('World Cup winner prediction checks passed.');
