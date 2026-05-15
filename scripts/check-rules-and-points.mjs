import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const pointsSource = readFileSync(new URL('src/utils/points.ts', root), 'utf8');
const rulesSource = readFileSync(new URL('src/pages/ReglementPage.tsx', root), 'utf8');

const functionMatch = pointsSource.match(/export const calculatePredictionPoints = \([\s\S]*?\n\};/);
if (!functionMatch) {
  throw new Error('calculatePredictionPoints was not found.');
}

const context = {};
const compiledPoints = ts.transpileModule(functionMatch[0].replace('export const', 'const'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;

vm.runInNewContext(
  `${compiledPoints}\nglobalThis.calculatePredictionPoints = calculatePredictionPoints;`,
  context,
);

const calculatePredictionPoints = context.calculatePredictionPoints;

const cases = [
  { label: 'exact', pred: [2, 1], actual: [2, 1], expected: 4 },
  { label: 'bon ecart', pred: [1, 0], actual: [3, 2], expected: 2 },
  { label: 'bon ecart autre', pred: [3, 2], actual: [2, 1], expected: 2 },
  { label: 'bon nul avec mauvais score exact', pred: [2, 2], actual: [1, 1], expected: 1 },
  { label: 'bon gagnant seulement', pred: [2, 0], actual: [3, 2], expected: 1 },
  { label: 'bon gagnant exterieur seulement', pred: [0, 1], actual: [0, 2], expected: 1 },
  { label: 'mauvais resultat', pred: [1, 0], actual: [0, 1], expected: 0 },
  { label: 'nul pronostique mais victoire reelle', pred: [1, 1], actual: [2, 1], expected: 0 },
];

const failures = cases
  .map((testCase) => ({
    ...testCase,
    actualPoints: calculatePredictionPoints(
      testCase.pred[0],
      testCase.pred[1],
      testCase.actual[0],
      testCase.actual[1],
    ),
  }))
  .filter((testCase) => testCase.actualPoints !== testCase.expected);

if (failures.length > 0) {
  throw new Error(
    failures
      .map((failure) => `${failure.label}: expected ${failure.expected}, got ${failure.actualPoints}`)
      .join('\n'),
  );
}

const requiredRulesText = [
  'Tu trouves exactement le score final.',
  'Tu as le bon gagnant et le bon écart de buts.',
  'Uniquement si une équipe gagne. Un nul non exact vaut 1 pt, pas 2.',
  'Prono 1 - 0, résultat 3 - 2.',
  'Prono 2 - 1, résultat 1 - 0.',
  'Tu as le bon gagnant sans le bon écart, ou tu as prévu un nul sans le score exact.',
  'Prono 2 - 0, résultat 3 - 2.',
  'Prono 0 - 0, résultat 2 - 2.',
];

const missingText = requiredRulesText.filter((text) => !rulesSource.includes(text));
if (missingText.length > 0) {
  throw new Error(`ReglementPage is missing expected wording:\n${missingText.join('\n')}`);
}

if (rulesSource.includes('tu joues 1 - 0, ton équipe gagne 3 - 2')) {
  throw new Error('ReglementPage still contains the old bad 1-point example.');
}

console.log('Rules wording and points examples are valid.');
