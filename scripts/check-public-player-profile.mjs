import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const appState = readFileSync(new URL('../src/utils/appState.ts', import.meta.url), 'utf8');
const visibility = readFileSync(new URL('../src/utils/predictionVisibility.ts', import.meta.url), 'utf8');

const requireText = (source, expected, label) => {
  if (!source.includes(expected)) {
    throw new Error(`${label} is missing: ${expected}`);
  }
};

const requireRegex = (source, pattern, label) => {
  if (!pattern.test(source)) {
    throw new Error(`${label} does not match ${pattern}`);
  }
};

[
  "create or replace function public.app_get_public_player_profile(p_player_id uuid)",
  "grant execute on function public.app_get_public_player_profile(uuid) to anon",
  "'predictions'",
  "'visible_predictions_count'",
  "'prediction_id'",
  "'predicted_home_score'",
  "'predicted_away_score'",
  "'final_home_score'",
  "'final_away_score'",
  "'is_finished'",
  "'is_live'",
  "'is_locked'",
  "'created_at'",
].forEach((snippet) => requireText(schema, snippet, 'supabase/schema.sql'));

[
  "lower(coalesce(p_status, 'upcoming')) <> 'upcoming'",
  'or p_kickoff < now()',
].forEach((snippet) => requireText(schema, snippet, 'SQL prediction visibility'));

requireRegex(schema, /pg_notify\s*\(\s*'pgrst'\s*,\s*'reload schema'\s*\)/i, 'PostgREST schema cache reload');

if (/now\(\)\s*\+\s*interval\s+'1 hour'|minutesUntilKickoff/.test(`${schema}\n${visibility}`)) {
  throw new Error('Public player profiles must not expose predictions before kickoff.');
}

[
  'predictions: RpcPublicPredictionRow[]',
  'visible_predictions_count?: number | null',
  'prediction_id?: string | null',
  'predicted_home_score?: number | null',
  'final_home_score?: number | null',
  'created_at?: string | null',
].forEach((snippet) => requireText(appState, snippet, 'src/utils/appState.ts'));

[
  'closedPublicStatuses',
  "'in_progress'",
  "'closed'",
  "'locked'",
].forEach((snippet) => requireText(visibility, snippet, 'src/utils/predictionVisibility.ts'));

[
  '## Debug profils joueurs',
  'app_get_public_player_profile',
  'PGRST202',
  "select *",
  "from public.app_rpc_predictions",
].forEach((snippet) => requireText(readme, snippet, 'README.md'));

console.log('Public player profile RPC, visibility and debug documentation checks passed.');
