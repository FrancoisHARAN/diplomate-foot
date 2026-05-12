import { readFile } from 'node:fs/promises';

const liveDataPath = new URL('../public/live-data/matches.json', import.meta.url);

const env = {
  url: process.env.VITE_SUPABASE_URL,
  anonKey: process.env.VITE_SUPABASE_ANON_KEY,
  syncToken: process.env.SUPABASE_MATCH_SYNC_TOKEN,
};

const configuredValues = Object.values(env).filter(Boolean).length;
if (configuredValues === 0) {
  console.log('Supabase football sync skipped: no Supabase environment variables configured.');
  process.exit(0);
}

const missing = Object.entries(env)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  throw new Error(`Supabase football sync is missing: ${missing.join(', ')}`);
}

const toRpcMatchPayload = (match) => ({
  id: match.id,
  external_id: match.externalId ?? null,
  competition_code: match.competitionCode ?? null,
  competition_name: match.competitionName ?? null,
  home_team: match.homeTeam ?? {},
  away_team: match.awayTeam ?? {},
  kickoff: match.kickoff,
  status: match.status ?? 'upcoming',
  home_score: match.homeScore ?? null,
  away_score: match.awayScore ?? null,
  minute: match.minute ?? null,
  venue: match.venue ?? null,
  matchday: match.matchday ?? null,
  stage: match.stage ?? null,
  round: match.round ?? null,
  group_name: match.group ?? null,
  season: match.season ?? null,
  source_competition_id: match.sourceCompetitionId ?? null,
  points_multiplier: match.pointsMultiplier ?? 1,
  source: match.source ?? null,
  last_updated: match.lastUpdated ?? null,
});

const payload = JSON.parse(await readFile(liveDataPath, 'utf8'));
const matches = Array.isArray(payload.matches) ? payload.matches : [];

if (matches.length === 0) {
  console.log('Supabase football sync skipped: no matches in public/live-data/matches.json.');
  process.exit(0);
}

const response = await fetch(`${env.url}/rest/v1/rpc/app_sync_matches`, {
  method: 'POST',
  headers: {
    apikey: env.anonKey,
    authorization: `Bearer ${env.anonKey}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    p_sync_token: env.syncToken,
    p_matches: matches.map(toRpcMatchPayload),
  }),
});

if (!response.ok) {
  throw new Error(`Supabase football sync failed (${response.status}): ${await response.text()}`);
}

const result = await response.json();
console.log(`Supabase football sync: ${result?.synced_count ?? matches.length} matches synced.`);
