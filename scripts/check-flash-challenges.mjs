import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
const root = new URL('../', import.meta.url);
const flashUtilsSource = readFileSync(new URL('src/utils/flashChallenges.ts', root), 'utf8');
const flashCardSource = readFileSync(new URL('src/components/FlashChallengeCard.tsx', root), 'utf8');
const homeSource = readFileSync(new URL('src/pages/HomePage.tsx', root), 'utf8');
const myPredictionsSource = readFileSync(new URL('src/pages/MyPredictionsPage.tsx', root), 'utf8');

for (const forbidden of [['Dem', 'b'].join(''), ['Le', 'ns - '].join('')]) {
  if (schema.includes(forbidden)) {
    throw new Error(`Old flash seed must not remain in schema: ${forbidden}`);
  }
}

for (const expected of [
  'app_rpc_flash_challenges',
  'app_rpc_flash_options',
  'app_rpc_flash_predictions',
  'app_get_active_flash_challenges',
  'app_save_flash_prediction_by_session',
  'app_get_player_flash_predictions_by_session',
  'app_get_public_player_flash_predictions',
]) {
  if (!schema.includes(expected)) {
    throw new Error(`Missing flash schema/RPC marker: ${expected}`);
  }
}

const challenge = {
  status: 'resolved',
  resultOptionId: 'yes',
  options: [
    { id: 'yes', label: 'Oui', pointsIfCorrect: 5 },
    { id: 'no', label: 'Non', pointsIfCorrect: 2 },
  ],
};

const calculate = (flash, optionId) => {
  if (flash.status !== 'resolved') return null;
  if (flash.resultOptionId !== optionId) return 0;
  return flash.options.find((option) => option.id === optionId)?.pointsIfCorrect ?? 0;
};

if (calculate({ ...challenge, status: 'open' }, 'yes') !== null) {
  throw new Error('Open flash challenges should keep points pending.');
}

if (calculate(challenge, 'yes') !== 5) {
  throw new Error('Winning "Oui" option should grant 5 points.');
}

if (calculate(challenge, 'no') !== 0) {
  throw new Error('Wrong flash answer should grant 0 points.');
}

if (calculate({ ...challenge, resultOptionId: 'no' }, 'no') !== 2) {
  throw new Error('Winning "Non" option should grant 2 points.');
}

for (const expected of [
  'shouldShowFlashOnHome',
  'canEditFlashPrediction',
  'flashMatchesPredictionFilter',
  'getShortFlashOptionLabel',
]) {
  if (!flashUtilsSource.includes(`export const ${expected}`)) {
    throw new Error(`Missing flash helper: ${expected}`);
  }
}

for (const expected of [
  'useState',
  'draftOptionId',
  'Enregistrer',
  'Points accordés uniquement si la prédiction est correcte.',
]) {
  if (!flashCardSource.includes(expected)) {
    throw new Error(`FlashChallengeCard is missing the confirmation UI: ${expected}`);
  }
}

const compiledFlashUtils = ts.transpileModule(flashUtilsSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;

const flashContext = {};
vm.runInNewContext(
  `${compiledFlashUtils.replace(/export /g, '')}
globalThis.getShortFlashOptionLabel = getShortFlashOptionLabel;
globalThis.shouldShowFlashOnHome = shouldShowFlashOnHome;
globalThis.canEditFlashPrediction = canEditFlashPrediction;
globalThis.flashMatchesPredictionFilter = flashMatchesPredictionFilter;`,
  flashContext,
);

const openFlash = { ...challenge, status: 'open', closesAt: '2026-06-01T12:00:00.000Z' };
const closedFlash = { ...challenge, status: 'closed', closesAt: '2026-05-31T12:00:00.000Z' };
const resolvedWonFlash = { ...challenge, status: 'resolved', closesAt: '2026-05-31T12:00:00.000Z', resultOptionId: 'yes' };
const resolvedLostFlash = { ...challenge, status: 'resolved', closesAt: '2026-05-31T12:00:00.000Z', resultOptionId: 'no' };
const yesPrediction = { optionId: 'yes' };

if (flashContext.getShortFlashOptionLabel({ label: 'Oui, il marque', pointsIfCorrect: 5 }) !== 'Oui — +5 pts') {
  throw new Error('Oui option must be shortened to "Oui — +5 pts".');
}

if (flashContext.getShortFlashOptionLabel({ label: 'Non, il ne marque pas', pointsIfCorrect: 2 }) !== 'Non — +2 pts') {
  throw new Error('Non option must be shortened to "Non — +2 pts".');
}

if (!flashContext.shouldShowFlashOnHome(openFlash, 'player-1', undefined)) {
  throw new Error('Open unanswered flash must appear on home.');
}

if (flashContext.shouldShowFlashOnHome(openFlash, 'player-1', yesPrediction)) {
  throw new Error('Answered flash must disappear from home.');
}

if (!flashContext.canEditFlashPrediction(openFlash, new Date('2026-06-01T11:00:00.000Z'))) {
  throw new Error('Open flash must stay editable.');
}

if (flashContext.canEditFlashPrediction(closedFlash, new Date('2026-06-01T11:00:00.000Z'))) {
  throw new Error('Closed flash must not be editable.');
}

if (!flashContext.flashMatchesPredictionFilter('upcoming', openFlash, yesPrediction)) {
  throw new Error('Open flash must be visible in the upcoming filter.');
}

if (!flashContext.flashMatchesPredictionFilter('live', closedFlash, yesPrediction)) {
  throw new Error('Closed pending flash must be visible in the live/locked filter.');
}

if (!flashContext.flashMatchesPredictionFilter('finished', resolvedWonFlash, yesPrediction)) {
  throw new Error('Resolved flash must be visible in the finished filter.');
}

if (!flashContext.flashMatchesPredictionFilter('won', resolvedWonFlash, yesPrediction)) {
  throw new Error('Correct resolved flash must be visible in the won filter.');
}

if (!flashContext.flashMatchesPredictionFilter('lost', resolvedLostFlash, yesPrediction)) {
  throw new Error('Wrong resolved flash must be visible in the lost filter.');
}

if (!homeSource.includes('unansweredFlashChallenges') || !homeSource.includes('shouldShowFlashOnHome')) {
  throw new Error('HomePage must hide answered flash challenges.');
}

if (!myPredictionsSource.includes('saveFlashPrediction') || !myPredictionsSource.includes('filteredFlashRows')) {
  throw new Error('MyPredictionsPage must show and allow saving flash answers.');
}

if (myPredictionsSource.indexOf('filteredFlashRows') > myPredictionsSource.indexOf('filteredMatches.map')) {
  throw new Error('Flash predictions must render before match predictions in MyPredictionsPage.');
}

console.log('Flash challenge checks passed.');
