import type { ExactPredictionHighlight, Match, Prediction } from '../types';
import { calculatePredictionPoints } from './points';

interface PlayerLike {
  id?: string;
  playerId?: string;
  nickname: string;
  avatarUrl?: string;
}

const playerIdOf = (player: PlayerLike): string => player.id ?? player.playerId ?? '';

export const getRecentExactPredictionHighlights = (
  matches: Match[],
  predictions: Prediction[],
  players: PlayerLike[],
): ExactPredictionHighlight[] => {
  const playerById = new Map(players.map((player) => [playerIdOf(player), player]));
  const finishedMatches = matches.filter(
    (match) => match.status === 'finished' && typeof match.homeScore === 'number' && typeof match.awayScore === 'number',
  );

  return finishedMatches
    .map((match): ExactPredictionHighlight | null => {
      const winners = predictions
        .filter((prediction) => prediction.matchId === match.id)
        .filter((prediction) => calculatePredictionPoints(prediction.homeScore, prediction.awayScore, match.homeScore ?? 0, match.awayScore ?? 0) === 3)
        .map((prediction) => {
          const player = playerById.get(prediction.playerId);
          return {
            playerId: prediction.playerId,
            nickname: player?.nickname ?? 'Joueur',
            avatarUrl: player?.avatarUrl,
            homeScore: prediction.homeScore,
            awayScore: prediction.awayScore,
          };
        });

      return winners.length > 0 ? { matchId: match.id, match, winners } : null;
    })
    .filter((item): item is ExactPredictionHighlight => Boolean(item))
    .sort((left, right) => new Date(right.match.kickoff).getTime() - new Date(left.match.kickoff).getTime())
    .slice(0, 3);
};
