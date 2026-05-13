import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const prizePanel = readFileSync(new URL('src/components/PrizePanel.tsx', root), 'utf8');
const rulesPage = readFileSync(new URL('src/pages/ReglementPage.tsx', root), 'utf8');
const packageJson = readFileSync(new URL('package.json', root), 'utf8');

const prizeSources = `${prizePanel}\n${rulesPage}`;

const requireText = (source, text, label) => {
  assert.ok(source.includes(text), `${label} is missing: ${text}`);
};

const forbidPattern = (source, pattern, label) => {
  assert.ok(!pattern.test(source), `${label} must not match ${pattern}`);
};

requireText(packageJson, '"check:prizes-copy"', 'package script');

for (const expected of [
  '50 €',
  '25 €',
  '10 €',
  'consommation au bar',
]) {
  requireText(prizeSources, expected, 'podium prizes copy');
}

for (const expected of [
  '1er : 50 € de consommation au bar',
  '2e : 25 € de consommation au bar',
  '3e : 10 € de consommation au bar',
  'Les lots sont des consommations au bar.',
]) {
  requireText(rulesPage, expected, 'rules prizes copy');
}

forbidPattern(prizeSources, /\b20\s*€/i, 'old first-place cash copy');
forbidPattern(prizeSources, /\bpizza\b/i, 'old pizza prize');
forbidPattern(prizeSources, /\bsaucisson\b/i, 'old saucisson prize');

console.log('check-prizes-copy: ok');
