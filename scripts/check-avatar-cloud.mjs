import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');

for (const expected of [
  'app_update_player_avatar',
  'avatar_url',
  'app_get_player_state',
  'app_get_leaderboard',
  'app_get_public_player_profile',
  'length(p_avatar_url) > 350000',
]) {
  if (!schema.includes(expected)) {
    throw new Error(`Missing avatar cloud marker in schema: ${expected}`);
  }
}

console.log('Avatar cloud checks passed.');
