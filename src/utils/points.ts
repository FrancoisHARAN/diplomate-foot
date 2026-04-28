export const calculatePredictionPoints = (
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
): number => {
  if (predictedHome === actualHome && predictedAway === actualAway) return 3;

  const predictedDiff = predictedHome - predictedAway;
  const actualDiff = actualHome - actualAway;

  if (predictedDiff === 0 || actualDiff === 0) {
    return predictedDiff === actualDiff ? 1 : 0;
  }

  if (predictedDiff === actualDiff) return 2;

  const predictedOutcome = Math.sign(predictedDiff);
  const actualOutcome = Math.sign(actualDiff);

  if (predictedOutcome === actualOutcome) return 1;

  return 0;
};
