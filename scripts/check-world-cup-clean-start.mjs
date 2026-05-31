import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8').replace(/\r\n/g, '\n');
const readJson = (path) => JSON.parse(read(path));

const needles = {
  oldLeague: ['Ligue', ' 1'].join(''),
  oldPremier: ['Premier', ' League'].join(''),
  oldEurope: ['Champions', ' League'].join(''),
  oldSpain: ['La ', ['Li', 'ga'].join('')].join(''),
  oldFlashName: ['Dem', 'b'].join(''),
  oldFlashClub: ['Le', 'ns'].join(''),
  oldParisClub: ['PS', 'G'].join(''),
};

const activeFiles = [
  'README.md',
  'src/pages/MatchesPage.tsx',
  'src/pages/ReglementPage.tsx',
  'src/components/AppHeader.tsx',
  'src/components/MatchCard.tsx',
  'src/pages/LoginPage.tsx',
  'src/pages/MatchDetailPage.tsx',
  'src/utils/points.ts',
  'scripts/fetch-football-data.mjs',
  'scripts/lib/football-data-boost-utils.mjs',
  'supabase/schema.sql',
];

for (const file of activeFiles) {
  const source = read(file);
  for (const [label, needle] of Object.entries(needles)) {
    assert.equal(source.includes(needle), false, `${file} still contains old competition/test marker ${label}`);
  }
}

const matchesPayload = readJson('public/live-data/matches.json');
assert.deepEqual(matchesPayload.competitions, ['WC2026'], 'live-data competitions must be World Cup only');
assert.ok(Array.isArray(matchesPayload.matches), 'live-data matches must be an array');
for (const match of matchesPayload.matches) {
  const text = [
    match.competitionCode,
    match.competitionName,
    match.sourceCompetitionId,
    match.season,
  ].filter(Boolean).join(' ').toLowerCase();
  const isWorldCup =
    match.competitionCode === 'WC2026' ||
    String(match.sourceCompetitionId ?? '').toUpperCase() === 'WC' ||
    text.includes('world cup') ||
    text.includes('coupe du monde') ||
    text.includes('wc2026');
  const isExcludedWorldCup =
    text.includes('qualif') ||
    text.includes('qualification') ||
    text.includes('friendly') ||
    text.includes('amical');
  assert.equal(isWorldCup && !isExcludedWorldCup, true, `live-data contains a non-final World Cup match: ${match.id}`);
}

for (const [file, marker] of [
  ['src/data/mockMatches.ts', 'export const mockMatches: Match[] = [];'],
  ['src/data/mockPlayers.ts', 'export const mockPlayers: Player[] = [];'],
  ['src/data/mockPredictions.ts', 'export const mockPredictions: Prediction[] = [];'],
]) {
  assert.ok(read(file).includes(marker), `${file} must stay empty for production fallback`);
}

const appState = read('src/utils/appState.ts');
assert.ok(appState.includes("COMPETITION_STORAGE_NAMESPACE = 'diplomate.worldCup2026'"), 'localStorage namespace must be World Cup specific');
assert.equal(appState.includes('diplomate.currentPlayer'), false, 'old unscoped current player cache key must not be used');
assert.equal(appState.includes('diplomate.predictions'), false, 'old unscoped prediction cache key must not be used');

const fetchSource = read('scripts/fetch-football-data.mjs');
assert.equal(fetchSource.includes("code: 'WC2026'"), true, 'football fetch must import World Cup');
const oldCompetitionCodes = [
  `'${['F', 'L1'].join('')}'`,
  `'${['P', 'L'].join('')}'`,
  `'${['P', 'D'].join('')}'`,
  `'${['C', 'L'].join('')}'`,
];
for (const code of oldCompetitionCodes) {
  assert.equal(fetchSource.includes(code), false, `football fetch must not import old competition ${code}`);
}

const schema = read('supabase/schema.sql');
assert.ok(schema.includes('app_admin_reset_competition_for_world_cup'), 'Supabase reset function must exist');
assert.ok(schema.includes('app_admin_create_player'), 'player creation RPC must remain');
assert.ok(schema.includes('app_login_player'), 'login RPC must remain');
assert.ok(schema.includes("extensions.digest(convert_to"), 'hashing must use digest(convert_to(...))');
assert.ok(schema.includes('then 4 * greatest'), 'exact score must remain 4 points before boost');
assert.ok(schema.includes('match_sync_token_hash'), 'match sync token setting must be preserved');
assert.equal(/drop\s+table/i.test(schema), false, 'reset must not drop tables');
assert.equal(/grant execute on function public\.app_admin_reset_competition_for_world_cup/i.test(schema), false, 'reset function must not be granted to anon/authenticated');

const rules = read('src/pages/ReglementPage.tsx');
assert.ok(rules.includes('90 minutes + temps additionnel'), 'regular-time scoring rule must remain visible');
assert.ok(rules.includes('Finale : x5'), 'World Cup final boost must remain visible');

const packageJson = read('package.json');
assert.equal(packageJson.includes('check:football-score-ingestion'), false, 'old score-ingestion audit script must be removed from package.json');

console.log('World Cup clean-start checks passed.');
