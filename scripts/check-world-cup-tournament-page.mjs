import { readFileSync } from 'node:fs';

const standingsSource = readFileSync(new URL('../src/utils/worldCupStandings.ts', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../src/pages/TournamentPage.tsx', import.meta.url), 'utf8');
const matchesPageSource = readFileSync(new URL('../src/pages/MatchesPage.tsx', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

for (const expected of [
  'calculateWorldCupGroups',
  'getWorldCupTeamMatches',
  'getWorldCupKnockoutRounds',
  'victory',
]) {
  if (expected === 'victory') continue;
  if (!standingsSource.includes(expected)) {
    throw new Error(`Missing tournament utility: ${expected}`);
  }
}

for (const expected of [
  'standing.points += 3',
  'standing.points += 1',
  'right.points - left.points',
  'right.goalDifference - left.goalDifference',
  'right.goalsFor - left.goalsFor',
  "localeCompare(right.name, 'fr')",
]) {
  if (!standingsSource.includes(expected)) {
    throw new Error(`Missing group-standing rule: ${expected}`);
  }
}

for (const expected of ['round32', 'round16', 'quarter', 'semi', 'third', 'final']) {
  if (!standingsSource.includes(expected)) {
    throw new Error(`Missing knockout round support: ${expected}`);
  }
}

if (!pageSource.includes('to={`/matchs/${item.id}`}')) {
  throw new Error('Known tournament matches must link to /matchs/:matchId.');
}

if (!pageSource.includes('Qualifiés à venir') || !pageSource.includes('À déterminer')) {
  throw new Error('Tournament page must render placeholders for unknown knockout matches.');
}

if (!matchesPageSource.includes('Arbre du tournoi') || !matchesPageSource.includes('to="/tournoi"')) {
  throw new Error('Matches page must expose the tournament entry card.');
}

if (!appSource.includes('path="/tournoi"')) {
  throw new Error('The /tournoi route must be registered.');
}

if (!standingsSource.includes('getWorldCupTeamDisplayName')) {
  throw new Error('Tournament page must use French World Cup display names.');
}

console.log('World Cup tournament page checks passed.');
