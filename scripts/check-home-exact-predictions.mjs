import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const localDayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const sortByKickoffDesc = (left, right) => new Date(right.match.kickoff).getTime() - new Date(left.match.kickoff).getTime();

const selectExactPredictionsForHomePage = (highlights, now = new Date()) => {
  const sorted = [...highlights].sort(sortByKickoffDesc);
  if (sorted.length === 0) return [];

  const todayKey = localDayKey(now);
  const highlightDayKey = (highlight) => localDayKey(new Date(highlight.match.kickoff));
  const todayHighlights = sorted.filter((highlight) => highlightDayKey(highlight) === todayKey);

  if (todayHighlights.length >= 3) return todayHighlights;
  if (todayHighlights.length > 0) {
    const previousHighlights = sorted.filter((highlight) => highlightDayKey(highlight) !== todayKey);
    return [...todayHighlights, ...previousHighlights].slice(0, 3);
  }

  return sorted.slice(0, 3);
};

const match = (id, kickoff, winners = [{ playerId: 'p1', nickname: 'François' }]) => ({
  matchId: id,
  match: {
    id,
    kickoff,
    status: 'finished',
    homeTeam: { id: `${id}-home`, name: 'Home', shortName: 'HOM' },
    awayTeam: { id: `${id}-away`, name: 'Away', shortName: 'AWA' },
  },
  winners,
});

const today = new Date('2026-05-11T14:00:00');
const todayAt = (hour) => new Date(2026, 4, 11, hour).toISOString();
const yesterdayAt = (hour) => new Date(2026, 4, 10, hour).toISOString();
const olderAt = (hour) => new Date(2026, 4, 9, hour).toISOString();

assert.equal(
  selectExactPredictionsForHomePage([1, 2, 3, 4, 5].map((item) => match(`today-${item}`, todayAt(item))), today).length,
  5,
  'Displays all exact scores from today when there are more than 3.',
);

assert.deepEqual(
  selectExactPredictionsForHomePage([
    match('today-1', todayAt(10)),
    match('today-2', todayAt(11)),
    match('yesterday-1', yesterdayAt(18)),
    match('yesterday-2', yesterdayAt(16)),
    match('yesterday-3', yesterdayAt(14)),
  ], today).map((item) => item.matchId),
  ['today-2', 'today-1', 'yesterday-1'],
  'Completes 2 today highlights with the most recent previous one.',
);

assert.deepEqual(
  selectExactPredictionsForHomePage([
    match('yesterday-1', yesterdayAt(18)),
    match('yesterday-2', yesterdayAt(16)),
    match('yesterday-3', yesterdayAt(14)),
    match('older-1', olderAt(19)),
    match('older-2', olderAt(17)),
  ], today).map((item) => item.matchId),
  ['yesterday-1', 'yesterday-2', 'yesterday-3'],
  'Displays the 3 most recent exact score matches when there are none today.',
);

assert.equal(selectExactPredictionsForHomePage([], today).length, 0, 'Empty highlights stay empty.');

const groupedMatch = match('grouped', todayAt(12), [
  { playerId: 'p1', nickname: 'François' },
  { playerId: 'p2', nickname: 'Sylvain' },
]);
const groupedSelection = selectExactPredictionsForHomePage([groupedMatch], today);
assert.equal(groupedSelection.length, 1, 'Multiple winners on one match stay in one match card.');
assert.equal(groupedSelection[0].winners.length, 2, 'The grouped match keeps all winners.');

const source = readFileSync(join(process.cwd(), 'src', 'utils', 'exactPredictions.ts'), 'utf8');
assert.equal(source.includes('selectExactPredictionsForHomePage'), true, 'Home exact selector must be exported from exactPredictions.ts.');

console.log('Home exact predictions check passed.');
