const pointsByPosition = [20, 15, 10];

const validate = (codes) => {
  if (codes.length !== 3 || codes.some((code) => !code)) return false;
  return new Set(codes).size === 3;
};

const calculate = (prediction, championCode) => {
  const index = prediction.findIndex((code) => code === championCode);
  return index >= 0 ? pointsByPosition[index] : 0;
};

if (validate(['FRA', 'FRA', 'ENG'])) {
  throw new Error('Duplicate countries should be rejected.');
}

if (!validate(['FRA', 'POR', 'ENG'])) {
  throw new Error('Three distinct countries should be accepted.');
}

const prediction = ['FRA', 'POR', 'ENG'];
const cases = [
  ['FRA', 20],
  ['POR', 15],
  ['ENG', 10],
  ['BRA', 0],
];

for (const [champion, expected] of cases) {
  const actual = calculate(prediction, champion);
  if (actual !== expected) throw new Error(`Expected ${expected} for ${champion}, got ${actual}.`);
}

console.log('World Cup winner prediction checks passed.');
