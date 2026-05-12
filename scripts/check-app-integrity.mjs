import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const appSource = read('src/App.tsx');
const bottomNavSource = read('src/components/BottomNavigation.tsx');
const appStateSource = read('src/utils/appState.ts');
const liveMatchesSource = read('src/hooks/useLiveMatches.ts');
const schemaSource = read('supabase/schema.sql');

const requiredRoutes = ['/', '/matchs', '/matchs/:matchId', '/tournoi', '/classement', '/joueurs/:playerId', '/mes-pronos', '/mon-compte', '/connexion', '/reglement', '/admin'];
for (const route of requiredRoutes) {
  if (!appSource.includes(`path="${route}"`)) {
    throw new Error(`Missing route in App.tsx: ${route}`);
  }
}

for (const navPath of ['/', '/classement', '/matchs', '/mes-pronos', '/reglement']) {
  if (!bottomNavSource.includes(`to: '${navPath}'`)) {
    throw new Error(`Bottom navigation points to a missing route: ${navPath}`);
  }
}

for (const file of [
  'src/components/DeadlineBadge.tsx',
  'src/components/FlashChallengeCard.tsx',
  'src/components/WorldCupTopThreeCard.tsx',
  'src/pages/TournamentPage.tsx',
  'public/live-data/matches.json',
  'supabase/schema.sql',
]) {
  if (!existsSync(new URL(file, root))) {
    throw new Error(`Missing critical file: ${file}`);
  }
}

for (const rpc of [
  'app_login_player',
  'app_save_prediction_by_session',
  'app_get_player_state',
  'app_get_leaderboard',
  'app_get_matches',
  'app_sync_local_predictions',
  'app_update_player_avatar',
  'app_get_public_player_profile',
  'app_get_recent_exact_predictions',
  'app_get_world_cup_winner_prediction_by_session',
  'app_save_world_cup_winner_prediction_by_session',
  'app_get_active_flash_challenges',
  'app_save_flash_prediction_by_session',
  'app_get_player_flash_predictions_by_session',
  'app_get_public_player_flash_predictions',
  'app_sync_matches',
]) {
  if (!schemaSource.includes(`function public.${rpc}`)) {
    throw new Error(`Missing Supabase RPC: ${rpc}`);
  }
}

if (/service[_-]?role/i.test(`${appSource}\n${bottomNavSource}\n${appStateSource}`)) {
  throw new Error('Frontend must not mention or expose a service_role key.');
}

if (/grant execute on function public\.app_sync_matches\(jsonb\) to anon/.test(schemaSource)) {
  throw new Error('app_sync_matches must not be anonymously writable without a sync token.');
}

if (!/function public\.app_sync_matches\(p_sync_token text, p_matches jsonb\)/.test(schemaSource)) {
  throw new Error('app_sync_matches must require a sync token parameter.');
}

if (!schemaSource.includes('app_private_require_match_sync_token(p_sync_token)')) {
  throw new Error('app_sync_matches must validate the sync token server-side.');
}

if (!schemaSource.includes('grant execute on function public.app_sync_matches(text, jsonb) to anon')) {
  throw new Error('The token-protected match sync RPC grant is missing.');
}

if (schemaSource.includes('grant execute on function public.app_save_prediction(uuid, text, int, int, text) to anon')) {
  throw new Error('Legacy code-based prediction writes must not be granted to anon.');
}

if (!schemaSource.includes('app_private_save_prediction(v_player_id, v_match_id, v_home, v_away)')) {
  throw new Error('Local prediction sync must reuse the locked server-side save path.');
}

if (!schemaSource.includes('Pays indisponible pour le Top 3')) {
  throw new Error('World Cup Top 3 RPC must reject unknown country codes.');
}

if (appStateSource.includes('syncMatchesToCloud') || liveMatchesSource.includes('syncMatchesToCloud')) {
  throw new Error('The browser must not sync live match scores to Supabase as an anonymous side effect.');
}

if (!/export const savePrediction = async/.test(appStateSource)) {
  throw new Error('savePrediction must await cloud persistence when Supabase is configured.');
}

for (const warning of [
  'Prediction cloud sync failed.',
  'Player avatar cloud sync failed.',
  'World Cup top 3 cloud sync failed.',
  'Flash prediction cloud sync failed.',
]) {
  if (appStateSource.includes(`console.warn('${warning}'`)) {
    throw new Error(`Cloud write failure must not be silently downgraded: ${warning}`);
  }
}

if (read('src/components/FlashChallengeCard.tsx').includes('+0 pts')) {
  throw new Error('Lost flash predictions must not display a big +0 pts label.');
}

console.log('App integrity checks passed.');
