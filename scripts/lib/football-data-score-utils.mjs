const FINISHED_STATUSES = new Set(['FINISHED']);
const EXTRA_TIME_DURATIONS = new Set(['EXTRA_TIME', 'PENALTY_SHOOTOUT']);

const normalizeDuration = (value) => String(value ?? 'REGULAR').toUpperCase();
const normalizeStatus = (value) => String(value ?? '').toUpperCase();

const getScoreValue = (scoreNode, side) => {
  if (!scoreNode || typeof scoreNode !== 'object') return undefined;
  const legacySide = side === 'home' ? 'homeTeam' : 'awayTeam';
  const value = scoreNode[side] ?? scoreNode[legacySide];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const getScorePair = (scoreNode) => {
  const homeScore = getScoreValue(scoreNode, 'home');
  const awayScore = getScoreValue(scoreNode, 'away');
  if (typeof homeScore !== 'number' || typeof awayScore !== 'number') return null;
  return { homeScore, awayScore };
};

export const getPredictionScoreFromApiMatch = (match) => {
  const score = match?.score ?? {};
  const duration = normalizeDuration(score.duration);
  const status = normalizeStatus(match?.status);
  const isFinished = FINISHED_STATUSES.has(status);
  const regularTime = getScorePair(score.regularTime);

  if (regularTime) {
    return {
      ...regularTime,
      scoreKind: 'regularTime',
      scoreSource: 'football-data.score.regularTime',
    };
  }

  if (duration === 'REGULAR') {
    const fullTime = getScorePair(score.fullTime);
    if (fullTime) {
      return {
        ...fullTime,
        scoreKind: isFinished ? 'fullTimeRegular' : 'liveRegularRunning',
        scoreSource: 'football-data.score.fullTime',
      };
    }

    if (!isFinished) {
      const halfTime = getScorePair(score.halfTime);
      if (halfTime) {
        return {
          ...halfTime,
          scoreKind: 'halfTimeRunning',
          scoreSource: 'football-data.score.halfTime',
        };
      }
    }

    if (isFinished) {
      return {
        homeScore: undefined,
        awayScore: undefined,
        scoreKind: 'unavailable',
        scoreSource: null,
        warning: 'football-data.org marked this REGULAR match FINISHED without a usable score.fullTime; scoring score left empty.',
      };
    }
  }

  if (EXTRA_TIME_DURATIONS.has(duration)) {
    return {
      homeScore: undefined,
      awayScore: undefined,
      scoreKind: 'ambiguousAfterRegularTime',
      scoreSource: null,
      warning: `football-data.org did not provide score.regularTime for a ${duration} match; scoring score left empty.`,
    };
  }

  return {
    homeScore: undefined,
    awayScore: undefined,
    scoreKind: 'unavailable',
    scoreSource: null,
  };
};
