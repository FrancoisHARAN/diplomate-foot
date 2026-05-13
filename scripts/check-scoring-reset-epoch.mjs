import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const schema = readFileSync(new URL('supabase/schema.sql', root), 'utf8').replace(/\r\n/g, '\n');
const readme = readFileSync(new URL('README.md', root), 'utf8').replace(/\r\n/g, '\n');
const packageJson = readFileSync(new URL('package.json', root), 'utf8');

const requireText = (source, text, label) => {
  assert.ok(source.includes(text), `${label} is missing: ${text}`);
};

const forbidText = (source, text, label) => {
  assert.ok(!source.includes(text), `${label} must not contain: ${text}`);
};

requireText(packageJson, '"check:scoring-reset"', 'package script');

requireText(schema, 'create table if not exists public.app_rpc_config', 'config table');
requireText(schema, "key = 'scoring_epoch_start'", 'scoring epoch config key');
requireText(schema, 'create or replace function public.app_private_scoring_epoch_start()', 'epoch getter');
requireText(schema, 'create or replace function public.app_private_is_after_scoring_epoch(p_event_at timestamptz)', 'epoch filter helper');
requireText(schema, 'create or replace function public.app_admin_set_scoring_epoch(p_reset_at timestamptz default now())', 'admin reset function');
requireText(schema, "insert into public.app_rpc_config (key, value_text, value_timestamptz, updated_at)", 'reset function upsert');
requireText(schema, "preserved_data", 'reset function documents preserved data');
requireText(schema, 'revoke all on function public.app_admin_set_scoring_epoch(timestamptz) from public, anon, authenticated;', 'admin reset is not granted to anon');

requireText(schema, 'and public.app_private_is_after_scoring_epoch(m.kickoff);', 'scored predictions ignore matches before epoch');
requireText(schema, 'and public.app_private_is_after_scoring_epoch(coalesce(ch.updated_at, fp.updated_at));', 'flash scored predictions ignore flashes before epoch');
requireText(schema, 'from public.app_rpc_scored_predictions sp', 'leaderboard uses scored predictions view');
requireText(schema, 'where sp.player_id = p.id', 'leaderboard only counts scored predictions');
requireText(schema, 'or not public.app_private_is_after_scoring_epoch(m.kickoff) then', 'public profile old finished matches stay pending');
requireText(schema, 'and public.app_private_is_after_scoring_epoch(m.kickoff)\n      and pr.home_score = m.home_score', 'recent exacts ignore old matches');
requireText(schema, 'select public.app_private_scoring_epoch_start() as start_at', 'leaderboard history reads epoch');
requireText(schema, 'coalesce((select start_at::date from epoch), first_day)', 'leaderboard history starts after epoch');

forbidText(schema, 'delete from public.app_rpc_predictions', 'reset must preserve predictions');
forbidText(schema, 'truncate public.app_rpc_predictions', 'reset must preserve predictions');
forbidText(schema, 'delete from public.app_rpc_players', 'reset must preserve players');
forbidText(schema, 'truncate public.app_rpc_players', 'reset must preserve players');
forbidText(schema, 'delete from public.app_rpc_world_cup_winner_predictions', 'reset must preserve top 3');

requireText(readme, '## Reinitialiser le classement', 'README reset section');
requireText(readme, 'select public.app_admin_set_scoring_epoch(now());', 'README reset command');

console.log('check-scoring-reset-epoch: ok');
