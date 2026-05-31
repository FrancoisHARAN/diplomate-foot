import { readFileSync } from 'node:fs';

const points = readFileSync(new URL('../src/utils/points.ts', import.meta.url), 'utf8');
const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');

for (const expected of [
  'Math.max(...candidates)',
  'isFranceWorldCup2026Match(match)',
  'return 5',
  'return 4',
  'return 3',
  'return 2',
]) {
  if (!points.includes(expected)) {
    throw new Error(`Missing frontend boost rule marker: ${expected}`);
  }
}

for (const expected of [
  'app_private_match_multiplier',
  'select greatest(',
  "then 5",
  "then 4",
  "then 3",
  "then 2",
  "teams_text like '%fra%'",
]) {
  if (!schema.includes(expected)) {
    throw new Error(`Missing SQL boost rule marker: ${expected}`);
  }
}

console.log('Boost rule checks passed.');
