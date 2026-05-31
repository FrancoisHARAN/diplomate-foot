import assert from 'node:assert/strict';
import { hasMeaningfulFootballDataChange, buildLiveDataPayload } from './lib/football-data-change-utils.mjs';

const previousPayload = {
  generatedAt: '2026-05-12T10:00:00.000Z',
  lastDataChangedAt: '2026-05-12T10:00:00.000Z',
  source: 'football-data.org',
  dateFrom: '2026-06-11',
  dateTo: '2026-07-19',
  competitions: ['WC2026'],
  message: null,
  matches: [
    {
      id: 'fd-1',
      externalId: '1',
      competitionCode: 'WC2026',
      competitionName: 'Coupe du Monde 2026',
      kickoff: '2026-06-12T18:00:00Z',
      status: 'live',
      homeScore: 1,
      awayScore: 0,
      minute: 55,
      stage: null,
      round: null,
      group: null,
      pointsMultiplier: 1,
      homeTeam: { id: 'fra', name: 'France', shortName: 'FRA', countryCode: 'FRA' },
      awayTeam: { id: 'can', name: 'Canada', shortName: 'CAN', countryCode: 'CAN' },
    },
  ],
};

const sameMatchesNewTimestamp = {
  ...previousPayload,
  generatedAt: '2026-05-12T10:05:00.000Z',
  lastCheckedAt: '2026-05-12T10:05:00.000Z',
};

assert.equal(
  hasMeaningfulFootballDataChange(previousPayload, sameMatchesNewTimestamp),
  false,
  'Technical timestamps alone must not count as a useful update.',
);

const scoreChangedPayload = {
  ...sameMatchesNewTimestamp,
  matches: previousPayload.matches.map((match) => ({ ...match, homeScore: 2 })),
};

assert.equal(
  hasMeaningfulFootballDataChange(previousPayload, scoreChangedPayload),
  true,
  'A score change must count as a useful update.',
);

const statusChangedPayload = {
  ...sameMatchesNewTimestamp,
  matches: previousPayload.matches.map((match) => ({ ...match, status: 'finished', minute: null })),
};

assert.equal(
  hasMeaningfulFootballDataChange(previousPayload, statusChangedPayload),
  true,
  'A live/finished status change must count as a useful update.',
);

const minuteChangedPayload = {
  ...sameMatchesNewTimestamp,
  matches: previousPayload.matches.map((match) => ({ ...match, minute: 56 })),
};

assert.equal(
  hasMeaningfulFootballDataChange(previousPayload, minuteChangedPayload),
  true,
  'A live minute change must count as a useful update.',
);

const nextPayload = buildLiveDataPayload({
  previousPayload,
  nextPayload: sameMatchesNewTimestamp,
  nowIso: '2026-05-12T10:05:00.000Z',
});

assert.equal(
  nextPayload.lastDataChangedAt,
  previousPayload.lastDataChangedAt,
  'The visible timestamp must stay frozen when matches are unchanged.',
);

assert.equal(
  nextPayload.generatedAt,
  previousPayload.generatedAt,
  'generatedAt must also stay frozen when no useful data changed.',
);

console.log('check-football-update-status: ok');
