import { readFileSync } from 'node:fs';

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date('2026-05-17T12:00:00Z');

const isOpen = (challenge) => challenge.status === 'open' && new Date(challenge.closesAt).getTime() > now.getTime();
const resolvedTime = (challenge) => challenge.status === 'resolved'
  ? new Date(challenge.updatedAt ?? challenge.closesAt ?? challenge.createdAt).getTime()
  : null;
const isPriority = (challenge) => {
  if (isOpen(challenge)) return true;
  if (challenge.status === 'closed') return true;
  if (challenge.status !== 'resolved') return true;
  return now.getTime() - resolvedTime(challenge) <= 3 * DAY_MS;
};
const chronologicalTime = (challenge, matchKickoff) =>
  new Date(matchKickoff ?? challenge.closesAt ?? challenge.updatedAt ?? challenge.createdAt).getTime();

const base = {
  id: 'flash-world-cup',
  title: 'Flash Coupe du Monde',
  closesAt: '2026-05-13T19:00:00Z',
  createdAt: '2026-05-10T10:00:00Z',
};

if (!isPriority({ ...base, status: 'open', closesAt: '2026-05-18T19:00:00Z' })) {
  throw new Error('Open flash must be priority.');
}

if (!isPriority({ ...base, status: 'closed', updatedAt: '2026-05-13T19:10:00Z' })) {
  throw new Error('Closed unresolved flash must be priority.');
}

if (!isPriority({ ...base, status: 'resolved', updatedAt: '2026-05-16T12:00:00Z' })) {
  throw new Error('Flash resolved one day ago must be priority.');
}

if (isPriority({ ...base, status: 'resolved', updatedAt: '2026-05-13T11:00:00Z' })) {
  throw new Error('Flash resolved four days ago must not be priority.');
}

const oldResolved = { ...base, status: 'resolved', updatedAt: '2026-05-13T11:00:00Z' };
if (chronologicalTime(oldResolved, '2026-05-13T19:00:00Z') !== new Date('2026-05-13T19:00:00Z').getTime()) {
  throw new Error('Associated match kickoff must drive old flash chronology.');
}

const flashSource = readFileSync(new URL('../src/utils/flashChallenges.ts', import.meta.url), 'utf8');
for (const expected of ['FLASH_PRIORITY_DAYS = 3', 'isFlashPriority', 'getFlashChronologicalTime', 'calculateFlashPredictionPoints']) {
  if (!flashSource.includes(expected)) throw new Error(`Missing flash priority utility marker: ${expected}`);
}

const myPredictionsSource = readFileSync(new URL('../src/pages/MyPredictionsPage.tsx', import.meta.url), 'utf8');
for (const expected of ['priorityFlashRows', 'historicalFlashRows', 'historyItems', 'FlashChallengeCard']) {
  if (!myPredictionsSource.includes(expected)) throw new Error(`Mes pronos must keep flash priority/history split: ${expected}`);
}

const profileSource = readFileSync(new URL('../src/pages/PlayerProfilePage.tsx', import.meta.url), 'utf8');
if (!profileSource.includes('visibleHistoryItems') || !profileSource.includes('getFlashChronologicalTime')) {
  throw new Error('Public profiles must merge visible flashs into chronological history.');
}

const homeSource = readFileSync(new URL('../src/pages/HomePage.tsx', import.meta.url), 'utf8');
if (!homeSource.includes('shouldShowFlashOnHome')) {
  throw new Error('Home page must keep active unanswered flash gating.');
}

console.log('Flash priority window checks passed.');
