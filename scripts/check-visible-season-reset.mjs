import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const schema = readFileSync(new URL('supabase/schema.sql', root), 'utf8').replace(/\r\n/g, '\n');
const appState = readFileSync(new URL('src/utils/appState.ts', root), 'utf8').replace(/\r\n/g, '\n');
const readme = readFileSync(new URL('README.md', root), 'utf8').replace(/\r\n/g, '\n');
const packageJson = readFileSync(new URL('package.json', root), 'utf8');

const requireText = (source, text, label) => {
  assert.ok(source.includes(text), `${label} is missing: ${text}`);
};

const forbidText = (source, text, label) => {
  assert.ok(!source.toLowerCase().includes(text.toLowerCase()), `${label} must not contain: ${text}`);
};

const sliceBetween = (source, start, end, label) => {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0, `${label} start is missing: ${start}`);
  assert.ok(endIndex > startIndex, `${label} end is missing: ${end}`);
  return source.slice(startIndex, endIndex);
};

const functionBody = (name) => {
  const marker = `create or replace function public.${name}`;
  const start = schema.indexOf(marker);
  assert.notEqual(start, -1, `Function not found: ${name}`);
  const end = schema.indexOf('\n$$;', start);
  assert.notEqual(end, -1, `Function body not closed: ${name}`);
  return schema.slice(start, end);
};

requireText(packageJson, '"check:visible-season-reset"', 'package script');

requireText(schema, 'create or replace function public.app_private_match_scoring_event_at', 'match scoring event helper');
requireText(schema, 'else greatest(p_kickoff, p_last_updated)', 'match scoring event keeps future kickoff after reset');
requireText(schema, 'create or replace function public.app_private_match_in_current_season', 'match current season helper');
requireText(schema, 'not public.app_private_match_is_final(p_status)', 'non-final matches stay in current visible season');
requireText(schema, 'create or replace function public.app_private_flash_in_current_season', 'flash current season helper');
requireText(schema, 'public.app_private_match_scoring_event_at(m.kickoff, m.last_updated)', 'match scoring uses final/update event date');

const playerStateBody = sliceBetween(
  schema,
  'create or replace function public.app_private_player_state',
  'create or replace function public.app_login_player',
  'app_private_player_state',
);
requireText(playerStateBody, 'join public.app_rpc_matches m on m.id = pr.match_id', 'player state joins matches');
requireText(
  playerStateBody,
  'and public.app_private_match_in_current_season(m.status, m.kickoff, m.last_updated)',
  'player state hides old finished predictions',
);
requireText(playerStateBody, "'points', case when sp.id is not null then sp.points else null end", 'player state keeps pending points null');

const publicProfileBody = sliceBetween(
  schema,
  'create or replace function public.app_get_public_player_profile',
  'create or replace function public.app_get_public_match_predictions',
  'app_get_public_player_profile',
);
assert.equal(
  (publicProfileBody.match(/app_private_match_in_current_season\(m_count.status, m_count.kickoff, m_count.last_updated\)/g) ?? []).length,
  2,
  'public profile visible counters must both use the current-season filter',
);
requireText(
  publicProfileBody,
  'and public.app_private_match_in_current_season(m.status, m.kickoff, m.last_updated)',
  'public profile prediction list hides old finished matches',
);
requireText(
  publicProfileBody,
  'and public.app_private_is_after_scoring_epoch(public.app_private_match_scoring_event_at(m.kickoff, m.last_updated))',
  'public profile points use scoring event date',
);

const publicMatchBody = sliceBetween(
  schema,
  'create or replace function public.app_get_public_match_predictions',
  'create or replace function public.app_get_recent_exact_predictions',
  'app_get_public_match_predictions',
);
requireText(
  publicMatchBody,
  'and public.app_private_match_in_current_season(m.status, m.kickoff, m.last_updated)',
  'public match predictions hide old finished matches',
);
requireText(
  publicMatchBody,
  'and public.app_private_is_after_scoring_epoch(public.app_private_match_scoring_event_at(m.kickoff, m.last_updated))',
  'public match prediction points use scoring event date',
);

const recentExactsBody = sliceBetween(
  schema,
  'create or replace function public.app_get_recent_exact_predictions',
  'create or replace function public.app_get_leaderboard',
  'app_get_recent_exact_predictions',
);
requireText(
  recentExactsBody,
  'and public.app_private_is_after_scoring_epoch(public.app_private_match_scoring_event_at(m.kickoff, m.last_updated))',
  'recent exact predictions ignore old finished matches',
);

const historyBody = sliceBetween(
  schema,
  'create or replace function public.app_get_leaderboard_history',
  'create or replace function public.app_get_world_cup_winner_prediction_by_session',
  'app_get_leaderboard_history',
);
requireText(
  historyBody,
  'public.app_private_match_scoring_event_at(m.kickoff, m.last_updated))::date as event_day',
  'leaderboard history event day uses scoring event date',
);
requireText(
  historyBody,
  'and public.app_private_is_after_scoring_epoch(public.app_private_match_scoring_event_at(m.kickoff, m.last_updated))',
  'leaderboard history ignores old finished matches',
);

const playerFlashBody = sliceBetween(
  schema,
  'create or replace function public.app_get_player_flash_predictions_by_session',
  'create or replace function public.app_get_public_player_flash_predictions',
  'app_get_player_flash_predictions_by_session',
);
requireText(playerFlashBody, 'join public.app_rpc_flash_challenges ch on ch.id = fp.flash_id', 'player flash joins challenge');
requireText(
  playerFlashBody,
  'and public.app_private_flash_in_current_season(ch.status, ch.closes_at, coalesce(ch.updated_at, fp.updated_at))',
  'player flash predictions hide old resolved flashes',
);
requireText(playerFlashBody, "'points', case when fsp.id is not null then fsp.points else null end", 'player flash keeps pending points null');

const publicFlashBody = sliceBetween(
  schema,
  'create or replace function public.app_get_public_player_flash_predictions',
  'create or replace function public.app_update_player_avatar',
  'app_get_public_player_flash_predictions',
);
requireText(
  publicFlashBody,
  'and public.app_private_flash_in_current_season(ch.status, ch.closes_at, coalesce(ch.updated_at, fp.updated_at))',
  'public flash predictions hide old resolved flashes',
);

requireText(appState, 'preservedLocalPredictions', 'cloud cache preserves only other local players');
requireText(appState, '!predictionBelongsToPlayer(prediction, cachePlayer)', 'current player old local predictions are not re-added after cloud filter');

requireText(readme, '## Reinitialiser la competition visible', 'README visible reset section');
requireText(readme, 'select public.app_admin_set_scoring_epoch(now());', 'README reset command');
requireText(readme, 'masque aussi les anciens pronostics de matchs termines', 'README explains visible history reset');
requireText(readme, 'pronostics futurs ou live restent valables', 'README explains preserved useful predictions');

const scoringEpochResetBody = functionBody('app_admin_set_scoring_epoch');
forbidText(scoringEpochResetBody, 'delete from public.app_rpc_predictions', 'visible reset must preserve predictions');
forbidText(scoringEpochResetBody, 'truncate public.app_rpc_predictions', 'visible reset must preserve predictions');
forbidText(scoringEpochResetBody, 'delete from public.app_rpc_players', 'visible reset must preserve players');
forbidText(scoringEpochResetBody, 'truncate public.app_rpc_players', 'visible reset must preserve players');
forbidText(scoringEpochResetBody, 'delete from public.app_rpc_world_cup_winner_predictions', 'visible reset must preserve Top 3');

console.log('check-visible-season-reset: ok');
