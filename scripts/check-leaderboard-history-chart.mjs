import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const chartSource = read('src/components/LeaderboardHistoryChart.tsx');
const sectionSource = read('src/components/LeaderboardHistorySection.tsx');
const hookSource = read('src/hooks/useLeaderboardHistory.ts');
const schemaSource = read('supabase/schema.sql');
const cssSource = read('src/styles/global.css');

if (!chartSource.includes('PointHistoryRange') || !chartSource.includes('points cumulés')) {
  throw new Error('Leaderboard history chart must be a cumulative points line chart.');
}

if (chartSource.includes('playerRanks') || chartSource.includes('history-rank-label')) {
  throw new Error('Leaderboard history chart must not render the old rank bump chart.');
}

for (const expected of ['two-weeks', 'since-start', '2 semaines', 'Depuis le début']) {
  if (!sectionSource.includes(expected)) {
    throw new Error(`Missing history period filter: ${expected}`);
  }
}

if (!hookSource.includes('p_limit_weeks: 104')) {
  throw new Error('Leaderboard history hook must request enough history for the since-start view.');
}

for (const sql of ['generate_series', 'app_rpc_scored_predictions', 'app_rpc_flash_scored_predictions']) {
  if (!schemaSource.includes(sql)) {
    throw new Error(`Leaderboard history RPC must build daily point history with: ${sql}`);
  }
}

for (const cssClass of ['.history-axis-label', '.history-value-label', '.history-range-row']) {
  if (!cssSource.includes(cssClass)) {
    throw new Error(`Missing leaderboard history style: ${cssClass}`);
  }
}

console.log('Leaderboard history chart checks passed.');
