import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');

const requireText = (source, expected, label) => {
  if (!source.includes(expected)) {
    throw new Error(`${label} is missing: ${expected}`);
  }
};

const digestLines = schema
  .split('\n')
  .map((line, index) => ({ line: line.trim(), number: index + 1 }))
  .filter(({ line }) => line.includes('digest('));

const invalidDigestLines = digestLines.filter(
  ({ line }) => !line.includes('extensions.digest(convert_to('),
);

if (invalidDigestLines.length > 0) {
  const details = invalidDigestLines.map(({ line, number }) => `${number}: ${line}`).join('\n');
  throw new Error(`schema.sql must not call digest(text, ...) directly:\n${details}`);
}

[
  'create or replace function public.app_private_text_hash(p_value text)',
  "set search_path = public, extensions",
  "extensions.digest(convert_to(coalesce(p_value, ''), 'UTF8'), 'sha256')",
  'create or replace function public.app_private_match_is_final(p_status text)',
  "lower(replace(replace(coalesce(p_status, ''), '-', '_'), ' ', '_')) in (",
  "'terminé'",
  "'after_extra_time'",
  'public.app_private_text_hash(p_sync_token) <> v_expected_hash',
  'public.app_private_match_is_final(m.status)',
].forEach((snippet) => requireText(schema, snippet, 'supabase/schema.sql'));

if (schema.includes('m.home_score is not null and m.away_score is not null and m.kickoff <= now()')) {
  throw new Error('Live scores must not be used as a final scoring signal.');
}

const publicProfileBody = schema.slice(
  schema.indexOf('create or replace function public.app_get_public_player_profile'),
  schema.indexOf('create or replace function public.app_get_public_match_predictions'),
);

for (const snippet of [
  "'points', case",
  'when public.app_private_match_is_final(m.status)',
  "'result_type', case",
  'when not public.app_private_match_is_final(m.status)',
  'or m.home_score is null',
  'or m.away_score is null',
  "or not public.app_private_is_after_scoring_epoch(public.app_private_match_scoring_event_at(m.kickoff, m.last_updated)) then 'pending'",
  "'is_finished', public.app_private_match_is_final(m.status)",
]) {
  requireText(publicProfileBody, snippet, 'app_get_public_player_profile');
}

const matchPredictionsBody = schema.slice(
  schema.indexOf('create or replace function public.app_get_public_match_predictions'),
  schema.indexOf('create or replace function public.app_get_recent_exact_predictions'),
);

for (const snippet of [
  'when public.app_private_match_is_final(m.status)',
  'and m.home_score is not null',
  'and m.away_score is not null',
  'and public.app_private_is_after_scoring_epoch(public.app_private_match_scoring_event_at(m.kickoff, m.last_updated)) then coalesce(sp.points, 0)',
  'when not public.app_private_match_is_final(m.status)',
  'or m.home_score is null',
  'or m.away_score is null',
  "or not public.app_private_is_after_scoring_epoch(public.app_private_match_scoring_event_at(m.kickoff, m.last_updated)) then 'pending'",
]) {
  requireText(matchPredictionsBody, snippet, 'app_get_public_match_predictions');
}

const scoredViewBody = schema.slice(
  schema.indexOf('create or replace view public.app_rpc_scored_predictions'),
  schema.indexOf('create or replace function public.app_private_world_cup_country_name'),
);

for (const snippet of [
  'where public.app_private_match_is_final(m.status)',
  'and m.home_score is not null',
  'and m.away_score is not null',
]) {
  requireText(scoredViewBody, snippet, 'app_rpc_scored_predictions');
}

const historyBody = schema.slice(
  schema.indexOf('create or replace function public.app_get_leaderboard_history'),
  schema.indexOf('create or replace function public.app_get_world_cup_winner_prediction_by_session'),
);

requireText(historyBody, 'where public.app_private_match_is_final(m.status)', 'app_get_leaderboard_history');

const finalStatuses = new Set([
  'finished',
  'ft',
  'full_time',
  'completed',
  'complete',
  'termine',
  'terminé',
  'final',
  'ended',
  'after_extra_time',
  'aet',
  'penalties',
]);
const isFinal = (status) => finalStatuses.has(String(status ?? '').toLowerCase().replaceAll('-', '_').replaceAll(' ', '_'));
const scorePrediction = ({ status, predictedHome, predictedAway, finalHome, finalAway }) => {
  if (!isFinal(status)) return { points: null, resultType: 'pending' };
  const deltaPrediction = predictedHome - predictedAway;
  const deltaFinal = finalHome - finalAway;
  if (predictedHome === finalHome && predictedAway === finalAway) return { points: 3, resultType: 'exact' };
  if (Math.sign(deltaPrediction) === Math.sign(deltaFinal) && deltaPrediction === deltaFinal) {
    return { points: 2, resultType: 'two-point' };
  }
  if (Math.sign(deltaPrediction) === Math.sign(deltaFinal)) return { points: 1, resultType: 'winner' };
  return { points: 0, resultType: 'lost' };
};

const cases = [
  {
    label: 'live exact-looking score stays pending',
    input: { status: 'live', predictedHome: 1, predictedAway: 0, finalHome: 1, finalAway: 0 },
    expected: { points: null, resultType: 'pending' },
  },
  {
    label: 'live wrong-looking score stays pending',
    input: { status: 'live', predictedHome: 0, predictedAway: 0, finalHome: 1, finalAway: 0 },
    expected: { points: null, resultType: 'pending' },
  },
  {
    label: 'finished exact score gets 3 points',
    input: { status: 'finished', predictedHome: 1, predictedAway: 0, finalHome: 1, finalAway: 0 },
    expected: { points: 3, resultType: 'exact' },
  },
  {
    label: 'finished wrong score is lost',
    input: { status: 'finished', predictedHome: 0, predictedAway: 0, finalHome: 1, finalAway: 0 },
    expected: { points: 0, resultType: 'lost' },
  },
];

for (const testCase of cases) {
  const actual = scorePrediction(testCase.input);
  if (actual.points !== testCase.expected.points || actual.resultType !== testCase.expected.resultType) {
    throw new Error(
      `${testCase.label}: expected ${JSON.stringify(testCase.expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

console.log('Supabase hashing and live scoring checks passed.');
