import assert from 'node:assert/strict';
import {
  isDisplayableMatch,
  normalizeTeam,
} from './lib/football-data-team-utils.mjs';

const normalizeMatchTeams = (homeTeam, awayTeam, id = 999) => ({
  homeTeam: normalizeTeam(homeTeam, undefined, `home-${id}`, 'Home team', true),
  awayTeam: normalizeTeam(awayTeam, undefined, `away-${id}`, 'Away team', true),
});

assert.equal(
  isDisplayableMatch(normalizeMatchTeams({ name: 'South Africa' }, { name: 'Canada' })),
  true,
  'South Africa vs Canada with fallback ids but real names must be displayable.',
);

assert.equal(
  isDisplayableMatch(normalizeMatchTeams({ name: 'Brazil', id: 764 }, { name: 'TBD' })),
  false,
  'Brazil vs TBD must stay hidden.',
);

assert.equal(
  isDisplayableMatch(normalizeMatchTeams({ name: 'Winner Group A' }, { name: 'Canada' })),
  false,
  'Winner Group A vs Canada must stay hidden.',
);

assert.equal(
  isDisplayableMatch(normalizeMatchTeams({ name: '1st Group A' }, { name: '2nd Group B' })),
  false,
  'Bracket-position placeholders must stay hidden.',
);

assert.equal(
  isDisplayableMatch(normalizeMatchTeams({ id: 773, name: 'France', shortName: 'FRA' }, { id: 828, name: 'Canada', shortName: 'CAN' })),
  true,
  'Existing complete group-stage teams must stay displayable.',
);

assert.equal(
  isDisplayableMatch(normalizeMatchTeams({ name: 'Japan' }, { name: 'Canada' })),
  true,
  'Knockout matches with real names and fallback ids must be displayable.',
);

console.log('Football-data displayable team checks passed.');
