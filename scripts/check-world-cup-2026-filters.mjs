import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();

const requiredFlagFiles = ['ar.webp', 'br.webp', 'ca.webp', 'de.webp', 'es.webp', 'fr.webp', 'jp.webp', 'ma.webp', 'mx.webp', 'pt.webp', 'sn.webp', 'us.webp'];
requiredFlagFiles.forEach((file) => {
  assert.equal(existsSync(join(root, 'public', 'flags', file)), true, `Missing public/flags/${file}`);
});

const flagsSource = readFileSync(join(root, 'src', 'utils', 'flags.ts'), 'utf8');
assert.equal(flagsSource.includes("team.id.startsWith('t-')"), false, 'Flags must not be enabled from t-* ids.');
assert.equal(flagsSource.includes('isWorldCup2026Match'), true, 'Team crests must gate country flags behind World Cup detection.');

const configSource = readFileSync(join(root, 'src', 'config', 'worldCup2026.ts'), 'utf8');
['FRA', 'ESP', 'ARG', 'ENG', 'POR', 'BRA', 'NED', 'MAR', 'BEL', 'GER', 'CRO', 'ITA', 'COL', 'SEN'].forEach((code) => {
  assert.equal(configSource.includes(`code: '${code}'`), true, `Featured team ${code} missing from World Cup config.`);
});

const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const codeByAlias = new Map([
  ['france', 'FRA'], ['fra', 'FRA'],
  ['spain', 'ESP'], ['espagne', 'ESP'], ['esp', 'ESP'],
  ['argentina', 'ARG'], ['argentine', 'ARG'], ['arg', 'ARG'],
  ['england', 'ENG'], ['angleterre', 'ENG'], ['eng', 'ENG'],
  ['portugal', 'POR'], ['por', 'POR'],
  ['brazil', 'BRA'], ['bresil', 'BRA'], ['bra', 'BRA'],
  ['netherlands', 'NED'], ['pays bas', 'NED'], ['ned', 'NED'],
  ['morocco', 'MAR'], ['maroc', 'MAR'], ['mar', 'MAR'],
  ['belgium', 'BEL'], ['belgique', 'BEL'], ['bel', 'BEL'],
  ['germany', 'GER'], ['allemagne', 'GER'], ['deu', 'GER'], ['ger', 'GER'],
  ['croatia', 'CRO'], ['croatie', 'CRO'], ['cro', 'CRO'],
  ['italy', 'ITA'], ['italie', 'ITA'], ['ita', 'ITA'],
  ['colombia', 'COL'], ['colombie', 'COL'], ['col', 'COL'],
  ['senegal', 'SEN'], ['sen', 'SEN'],
  ['canada', 'CAN'], ['can', 'CAN'],
  ['japan', 'JPN'], ['japon', 'JPN'], ['jpn', 'JPN'],
]);

const featured = new Set(['FRA', 'ESP', 'ARG', 'ENG', 'POR', 'BRA', 'NED', 'MAR', 'BEL', 'GER', 'CRO', 'ITA', 'COL', 'SEN']);
const flagByCode = new Map([
  ['FRA', 'fr.webp'],
  ['MAR', 'ma.webp'],
  ['BRA', 'br.webp'],
  ['SEN', 'sn.webp'],
  ['GER', 'de.webp'],
  ['CAN', 'ca.webp'],
  ['JPN', 'jp.webp'],
]);

const countryName = new Map([
  ['FRA', 'France'],
  ['GER', 'Allemagne'],
  ['MAR', 'Maroc'],
  ['JPN', 'Japon'],
]);

const countryCode = (team) => {
  for (const candidate of [team.countryCode, team.shortName, team.name, team.id?.replace(/^t[-_]/i, '')]) {
    const code = codeByAlias.get(normalize(candidate)) ?? codeByAlias.get(String(candidate ?? '').toUpperCase());
    if (code) return code;
  }
  return undefined;
};

const isWorldCup = (match) => {
  const text = normalize([match.competitionCode, match.competitionName, match.sourceCompetitionId, match.season].filter(Boolean).join(' '));
  const isFinal = (text.includes('world cup') || text.includes('worldcup') || text.includes('coupe du monde')) &&
    !text.includes('qualif') &&
    !text.includes('qualification') &&
    !text.includes('friendly') &&
    !text.includes('amical');
  return match.competitionCode === 'WC2026' || (match.sourceCompetitionId === 'WC' && match.season === 2026) || isFinal;
};

const stageText = (match) => normalize([match.stage, match.round, match.group, match.matchday ? `matchday ${match.matchday}` : ''].join(' '));
const isKnockout = (match) => /(round of 32|round of 16|last 16|quarter|semi|third place|final|huitieme|quart|demi|finale)/.test(stageText(match)) || (isWorldCup(match) && match.matchday > 3);
const isGroup = (match) => !isKnockout(match) && isWorldCup(match);
const shouldShow = (match) => isWorldCup(match) && (isKnockout(match) || (isGroup(match) && (featured.has(countryCode(match.homeTeam)) || featured.has(countryCode(match.awayTeam)))));
const multiplier = (match) => isWorldCup(match) && [countryCode(match.homeTeam), countryCode(match.awayTeam)].includes('FRA') ? 2 : 1;
const flag = (team, match) => isWorldCup(match) ? flagByCode.get(countryCode(team)) : undefined;
const displayName = (team, match) => isWorldCup(match) ? countryName.get(countryCode(team)) ?? team.name : team.name;

const wc = (homeTeam, awayTeam, overrides = {}) => ({
  competitionCode: 'WC2026',
  competitionName: 'Coupe du Monde 2026',
  season: 2026,
  stage: 'GROUP_STAGE',
  matchday: 1,
  homeTeam,
  awayTeam,
  ...overrides,
});

assert.equal(shouldShow(wc({ name: 'France', shortName: 'FRA' }, { name: 'Canada', shortName: 'CAN' })), true, 'France group match must be visible.');
assert.equal(multiplier(wc({ name: 'France', shortName: 'FRA' }, { name: 'Canada', shortName: 'CAN' })), 2, 'France World Cup match must be boosted x2.');
assert.equal(flag({ name: 'France', shortName: 'FRA' }, wc({ name: 'France', shortName: 'FRA' }, { name: 'Canada', shortName: 'CAN' })), 'fr.webp');
assert.equal(shouldShow(wc({ name: 'Sénégal', shortName: 'SEN' }, { name: 'Japan', shortName: 'JPN' })), true, 'Senegal group match must be visible.');
assert.equal(multiplier(wc({ name: 'Sénégal', shortName: 'SEN' }, { name: 'Japan', shortName: 'JPN' })), 1, 'Non-France featured World Cup match must stay x1.');
assert.equal(shouldShow(wc({ name: 'Japan', shortName: 'JPN' }, { name: 'Canada', shortName: 'CAN' })), false, 'Unfeatured group match must be hidden.');
assert.equal(shouldShow(wc({ name: 'Japan', shortName: 'JPN' }, { name: 'Canada', shortName: 'CAN' }, { stage: 'LAST_16', matchday: 4 })), true, 'Knockout match must be visible.');
assert.equal(shouldShow(wc({ name: 'Japan', shortName: 'JPN' }, { name: 'Canada', shortName: 'CAN' }, { stage: 'FINAL', matchday: 7 })), true, 'Final must be visible.');
assert.equal(isWorldCup({ competitionCode: 'TEST', competitionName: 'Friendly France Espagne', homeTeam: {}, awayTeam: {} }), false, 'Friendly must not be treated as World Cup.');
assert.equal(isWorldCup({ competitionCode: 'WORLD', competitionName: 'World Cup Qualification', homeTeam: {}, awayTeam: {} }), false, 'Qualifier must not be treated as final World Cup.');
assert.equal(shouldShow(wc({ name: 'Brazil', shortName: 'BRA' }, { name: 'Canada', shortName: 'CAN' })), true, 'Brazil group match must be visible.');
assert.equal(flag({ id: 'club-om', name: 'Marseille', shortName: 'MAR' }, { competitionCode: 'FL1', competitionName: 'Ligue 1' }), undefined, 'Marseille/MAR must not receive Morocco flag.');
assert.equal(flag({ name: 'Maroc', shortName: 'MAR' }, wc({ name: 'Maroc', shortName: 'MAR' }, { name: 'Canada', shortName: 'CAN' })), 'ma.webp', 'Morocco World Cup match must use Morocco flag.');
assert.equal(displayName({ name: 'FRA', shortName: 'FRA' }, wc({ name: 'FRA', shortName: 'FRA' }, { name: 'GER', shortName: 'GER' })), 'France');
assert.equal(displayName({ name: 'GER', shortName: 'GER' }, wc({ name: 'FRA', shortName: 'FRA' }, { name: 'GER', shortName: 'GER' })), 'Allemagne');

console.log('World Cup 2026 filters check passed.');
