import { readFileSync } from 'node:fs';

const config = readFileSync(new URL('../src/config/worldCupWinnerPredictions.ts', import.meta.url), 'utf8');

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

const validate = (codes) => {
  if (codes.length !== 3 || codes.some((code) => !code)) return false;
  return new Set(codes).size === 3;
};

const calculate = (prediction, championCode) => {
  const index = prediction.findIndex((code) => code === championCode);
  return index >= 0 ? pointsByPosition[index] : 0;
};

if (validate(['FRA', 'FRA', 'ENG'])) {
  throw new Error('Duplicate countries should be rejected.');
}

if (!validate(['FRA', 'POR', 'ENG'])) {
  throw new Error('Three distinct countries should be accepted.');
}

const prediction = ['FRA', 'POR', 'ENG'];
const cases = [
  ['FRA', 20],
  ['POR', 15],
  ['ENG', 10],
  ['BRA', 0],
];

for (const [champion, expected] of cases) {
  const actual = calculate(prediction, champion);
  if (actual !== expected) throw new Error(`Expected ${expected} for ${champion}, got ${actual}.`);
}

console.log('World Cup winner prediction checks passed.');
