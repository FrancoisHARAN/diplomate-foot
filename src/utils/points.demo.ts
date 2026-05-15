import { calculatePredictionPoints } from './points';

const checks = [
  { pred: [2, 1], actual: [2, 1], expected: 4 },
  { pred: [1, 0], actual: [3, 2], expected: 2 },
  { pred: [3, 2], actual: [2, 1], expected: 2 },
  { pred: [2, 2], actual: [1, 1], expected: 1 },
  { pred: [2, 0], actual: [3, 2], expected: 1 },
  { pred: [0, 1], actual: [0, 2], expected: 1 },
  { pred: [1, 0], actual: [0, 1], expected: 0 },
  { pred: [1, 1], actual: [2, 1], expected: 0 },
  { pred: [1, 1], actual: [1, 1], expected: 4 },
  { pred: [0, 0], actual: [1, 1], expected: 1 },
];

export const runPointsDemo = (): boolean =>
  checks.every(({ pred, actual, expected }) => calculatePredictionPoints(pred[0], pred[1], actual[0], actual[1]) === expected);
