import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const matchDetailSource = read('src/pages/MatchDetailPage.tsx');
const publicPredictionsSource = read('src/components/MatchPublicPredictionsSection.tsx');
const packageSource = read('package.json');

const requireText = (source, expected, label) => {
  assert.ok(source.includes(expected), `${label} is missing: ${expected}`);
};

requireText(packageSource, '"check:match-detail-finished-ui"', 'package script');

requireText(matchDetailSource, 'const detailStatusLabel = isFinal', 'finished status label');
requireText(matchDetailSource, "isFinal ? 'Terminé'", 'finished badge copy');
requireText(matchDetailSource, 'closedLabel={detailStatusLabel}', 'deadline badge status label');

requireText(matchDetailSource, 'getPredictionResultTypeForMatch', 'finished prediction result helper');
requireText(matchDetailSource, "exact: 'score exact'", 'score exact result label');
requireText(matchDetailSource, "'two-point': 'bon écart'", 'two-point result label');
requireText(matchDetailSource, "winner: 'bon gagnant'", 'winner result label');
requireText(matchDetailSource, "lost: 'perdu'", 'lost result label');
requireText(matchDetailSource, 'formatPredictionPointsLabel(points, predictionResultType)', 'current prediction points label');

requireText(
  matchDetailSource,
  'const showLockedSummary = Boolean(player && !editable && !(isFinal && prediction));',
  'finished prediction redundant summary guard',
);
requireText(matchDetailSource, '{showLockedSummary ? (', 'locked summary conditional rendering');

requireText(publicPredictionsSource, 'resultRank: number;', 'public prediction group result rank');
requireText(publicPredictionsSource, 'getPredictionResultTypeForMatch', 'public prediction group result type');
requireText(publicPredictionsSource, 'right.players.length - left.players.length', 'public prediction popularity sort');
requireText(publicPredictionsSource, 'right.resultRank - left.resultRank', 'public prediction result tie-break');
requireText(publicPredictionsSource, 'isExact: hasFinalScore &&', 'live groups must not be exact');

console.log('check-match-detail-finished-ui: ok');
