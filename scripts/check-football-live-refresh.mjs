import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const readJson = (path) => JSON.parse(read(path));

const requireText = (source, expected, label) => {
  assert.ok(source.includes(expected), `${label} is missing: ${expected}`);
};

const workflowSource = read('.github/workflows/update-football-data.yml');
const fetchSource = read('scripts/fetch-football-data.mjs');
const syncSource = read('scripts/sync-football-data-to-supabase.mjs');
const changeUtilsSource = read('scripts/lib/football-data-change-utils.mjs');
const hookSource = read('src/hooks/useLiveMatches.ts');
const headerSource = read('src/components/AppHeader.tsx');
const matchDetailSource = read('src/pages/MatchDetailPage.tsx');
const matchCardSource = read('src/components/MatchCard.tsx');
const livePayload = readJson('public/live-data/matches.json');

requireText(workflowSource, "cron: '*/5 * * * *'", 'football update schedule');
requireText(workflowSource, 'cancel-in-progress: false', 'football update concurrency');
assert.ok(
  workflowSource.indexOf('npm run fetch:football') < workflowSource.indexOf('npm run sync:football:supabase'),
  'Football data must be fetched before the Supabase sync.',
);
assert.ok(
  workflowSource.indexOf('npm run sync:football:supabase') < workflowSource.indexOf('git commit -m "Update football live data"'),
  'Supabase sync must run before the static JSON commit.',
);

requireText(fetchSource, "IN_PLAY: 'live'", 'football-data live status mapping');
requireText(fetchSource, "FINISHED: 'finished'", 'football-data finished status mapping');
requireText(fetchSource, 'lastUpdated: match.lastUpdated ?? undefined', 'match lastUpdated mapping');

requireText(syncSource, 'last_updated: match.lastUpdated ?? null', 'Supabase match freshness sync');

requireText(changeUtilsSource, 'lastDataChangedAt: nowIso', 'useful update timestamp');
requireText(changeUtilsSource, 'return previousPayload;', 'unchanged payload timestamp preservation');
for (const field of ['status', 'homeScore', 'awayScore', 'minute', 'pointsMultiplier']) {
  requireText(changeUtilsSource, `${field}: match.${field}`, `meaningful change field ${field}`);
}

assert.ok(livePayload.generatedAt, 'matches.json must expose generatedAt.');
assert.ok(livePayload.lastDataChangedAt, 'matches.json must expose lastDataChangedAt.');
assert.ok(Array.isArray(livePayload.matches), 'matches.json must expose a matches array.');
assert.ok(livePayload.matches.length > 0, 'matches.json must contain matches.');
assert.ok(
  livePayload.matches.some((match) => match.lastUpdated),
  'At least one match must expose lastUpdated so live score freshness can be shown.',
);
const liveMatches = livePayload.matches.filter((match) => match.status === 'live');
assert.ok(
  liveMatches.every((match) => match.lastUpdated || livePayload.lastDataChangedAt),
  'Live matches must have a per-match update time or fall back to the payload update time.',
);

requireText(hookSource, 'preferCloudIfNewer', 'frontend cloud freshness preference');
requireText(hookSource, 'fromCloudMatches(await fetchCloudMatches()) ?? fallbackState', 'Supabase fallback when static JSON fails');
requireText(hookSource, 'lastUpdated: match.lastUpdated ?? payload.lastDataChangedAt ?? payload.generatedAt', 'per-match freshness fallback');
requireText(hookSource, 'return state;', 'static JSON fallback when cloud freshness check fails');

requireText(headerSource, 'lastDataChangedAt', 'header freshness source');
requireText(headerSource, 'formatLastUpdated(lastDataChangedAt)', 'header freshness formatting');
requireText(headerSource, 'Dernière actu', 'short header freshness label');

requireText(matchDetailSource, 'formatLastUpdated', 'match detail freshness formatter');
requireText(matchDetailSource, 'lastDataChangedAt', 'match detail global freshness fallback');
requireText(matchDetailSource, 'Score actualisé à', 'match detail live freshness copy');
requireText(matchDetailSource, 'Actualisation récente', 'match detail unknown freshness fallback');

requireText(matchCardSource, 'formatLastUpdated(match.lastUpdated)', 'match card live freshness source');
requireText(matchCardSource, 'Maj ${scoreUpdatedAt}', 'match card compact live freshness copy');

await import('./check-live-match-pending-points.mjs');

console.log('check-football-live-refresh: ok');
