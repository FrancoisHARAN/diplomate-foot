import type { Match, Player, Prediction, Standing } from '../types';
import { canEditPrediction } from './date';

export type PredictionUiStatus = 'open' | 'closing' | 'closed' | 'done';

export const getPredictionUiStatus = (match: Match, prediction?: Prediction): PredictionUiStatus => {
  if (match.status === 'finished') return 'done';
  if (match.status === 'live') return 'closed';
  if (!canEditPrediction(match)) return 'closed';

  const kickoff = new Date(match.kickoff).getTime();
  const diffMinutes = (kickoff - Date.now()) / (1000 * 60);
  if (diffMinutes <= 180) return 'closing';
  if (prediction) return 'open';
  return 'open';
};

export const buildStandings = (players: Player[], predictions: Prediction[], matches: Match[]): Standing[] => {
  const matchesById = new Map(matches.map((match) => [match.id, match]));
  const pointsByPlayer = new Map<string, number>();

  predictions.forEach((prediction) => {
    const match = matchesById.get(prediction.matchId);
    if (!match || typeof match.homeScore !== 'number' || typeof match.awayScore !== 'number') return;

    const exact = prediction.homeScore === match.homeScore && prediction.awayScore === match.awayScore;
    const predictedDiff = prediction.homeScore - prediction.awayScore;
    const actualDiff = match.homeScore - match.awayScore;

    let points = 0;
    if (exact) points = 3;
    else if (predictedDiff === actualDiff) points = 2;
    else if (Math.sign(predictedDiff) === Math.sign(actualDiff)) points = 1;

    pointsByPlayer.set(prediction.playerId, (pointsByPlayer.get(prediction.playerId) ?? 0) + points);
  });

  return players
    .map((player) => ({
      position: 0,
      playerId: player.id,
      nickname: player.nickname,
      points: pointsByPlayer.get(player.id) ?? player.points,
      exactScores: player.exactScores,
      correctResults: player.correctResults,
    }))
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ ...entry, position: index + 1 }));
};

export const getUserRank = (standings: Standing[], playerId?: string) => standings.find((entry) => entry.playerId === playerId);
