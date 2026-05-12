import { readFileSync } from 'node:fs';

const countryConfig = readFileSync(new URL('../src/config/countryFlags.ts', import.meta.url), 'utf8');

const expectedPairs = [
  ['IRQ', 'Irak'],
  ['EGY', 'Égypte'],
  ['GER', 'Allemagne'],
  ['ESP', 'Espagne'],
  ['MAR', 'Maroc'],
  ['NED', 'Pays-Bas'],
];

for (const [code, name] of expectedPairs) {
  if (!countryConfig.includes(`${code}: '${name}'`)) {
    throw new Error(`Missing French country display name: ${code} -> ${name}`);
  }
}

const worldCupFilters = readFileSync(new URL('../src/utils/worldCupFilters.ts', import.meta.url), 'utf8');
if (!worldCupFilters.includes('isWorldCup2026Match(match)')) {
  throw new Error('World Cup display names must stay guarded by isWorldCup2026Match(match).');
}

const flagsUtil = readFileSync(new URL('../src/utils/flags.ts', import.meta.url), 'utf8');
if (!flagsUtil.includes('const isWorldCup = isWorldCup2026Match(matchContext)')) {
  throw new Error('Club badges must keep the World Cup guard before using country flags.');
}

console.log('Country display-name checks passed.');
