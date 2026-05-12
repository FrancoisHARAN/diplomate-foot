import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => {
  const fileUrl = new URL(path, root);
  if (!existsSync(fileUrl)) throw new Error(`Missing required file: ${path}`);
  return readFileSync(fileUrl, 'utf8');
};

const visibility = read('src/utils/predictionVisibility.ts');
const schema = read('supabase/schema.sql');
const appState = read('src/utils/appState.ts');
const matchDetail = read('src/pages/MatchDetailPage.tsx');
const matchSection = read('src/components/MatchPublicPredictionsSection.tsx');
const myPredictions = read('src/pages/MyPredictionsPage.tsx');

if (!visibility.includes('isMatchClosedForPredictions') || !visibility.includes('!canEditPrediction(match, now)')) {
  throw new Error('Public prediction visibility must be based on canEditPrediction(match) being false.');
}

if (/60|1 hour|minutesUntilKickoff|now\(\)\s*\+\s*interval\s+'1 hour'/i.test(`${visibility}\n${schema}`)) {
  throw new Error('Public predictions must not become visible one hour before kickoff.');
}

if (!schema.includes('create or replace function public.app_get_public_match_predictions(p_match_id text)')) {
  throw new Error('Missing app_get_public_match_predictions RPC.');
}

if (!schema.includes('grant execute on function public.app_get_public_match_predictions(text) to anon')) {
  throw new Error('Missing anon grant for app_get_public_match_predictions.');
}

for (const snippet of [
  'public.app_private_prediction_is_public(m.status, m.kickoff)',
  'where pr.match_id = p_match_id',
  'predicted_home_score',
  'predicted_away_score',
  'final_home_score',
  'final_away_score',
]) {
  if (!schema.includes(snippet)) {
    throw new Error(`Match public prediction RPC is missing: ${snippet}`);
  }
}

if (!appState.includes('fetchPublicMatchPredictions') || !appState.includes('app_get_public_match_predictions')) {
  throw new Error('Frontend must fetch public match predictions through the dedicated RPC.');
}

if (!appState.includes('if (!isPredictionPublic(match)) return []')) {
  throw new Error('Frontend fallback must never expose predictions while a match is open.');
}

for (const snippet of [
  'MatchPublicPredictionsSection',
  '<MatchPublicPredictionsSection match={match}',
  'match-step-nav',
]) {
  if (!matchDetail.includes(snippet)) {
    throw new Error(`Match detail page is missing: ${snippet}`);
  }
}

if (matchDetail.indexOf('match-step-nav') > matchDetail.indexOf('<MatchPublicPredictionsSection match={match}')) {
  throw new Error('Match public predictions must render below previous/next buttons.');
}

for (const snippet of [
  'groupedPredictions',
  'Score exact',
  'Aucun prono enregistré sur ce match.',
  "Les pronos seront visibles au coup d'envoi.",
]) {
  if (!matchSection.includes(snippet)) {
    throw new Error(`Match public prediction section is missing: ${snippet}`);
  }
}

if (!myPredictions.includes('getPredictionsForPlayer(player.id)') || !myPredictions.includes('canEditPrediction(match)')) {
  throw new Error('MyPredictionsPage must continue to show the current player own open predictions.');
}

console.log('Public prediction visibility checks passed.');
