import type { ExactPredictionHighlight, Match, Prediction } from '../types';
import { calculatePredictionPoints, isMatchFinal } from './points';

interface PlayerLike {
  id?: string;
  playerId?: string;
  nickname: string;
  avatarUrl?: string;
}

const playerIdOf = (player: PlayerLike): string => player.id ?? player.playerId ?? '';

const localDayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const highlightDayKey = (highlight: ExactPredictionHighlight): string => localDayKey(new Date(highlight.match.kickoff));

const sortByKickoffDesc = (left: ExactPredictionHighlight, right: ExactPredictionHighlight): number =>
  new Date(right.match.kickoff).getTime() - new Date(left.match.kickoff).getTime();

export const getRecentExactPredictionHighlights = (
  matches: Match[],
  predictions: Prediction[],
  players: PlayerLike[],
): ExactPredictionHighlight[] => {
  const playerById = new Map(players.map((player) => [playerIdOf(player), player]));
  const finishedMatches = matches.filter(
    (match) => isMatchFinal(match) && typeof match.homeScore === 'number' && typeof match.awayScore === 'number',
  );

  return finishedMatches
    .map((match): ExactPredictionHighlight | null => {
      const winners = predictions
        .filter((prediction) => prediction.matchId === match.id)
        .filter((prediction) => calculatePredictionPoints(prediction.homeScore, prediction.awayScore, match.homeScore ?? 0, match.awayScore ?? 0) === 4)
        .map((prediction) => {
          const player = playerById.get(prediction.playerId);
          return {
            playerId: prediction.playerId,
            nickname: player?.nickname ?? 'Joueur',
            avatarUrl: player?.avatarUrl,
            homeScore: prediction.homeScore,
            awayScore: prediction.awayScore,
          };
        })
        .sort((left, right) => left.nickname.localeCompare(right.nickname, 'fr'));

      return winners.length > 0 ? { matchId: match.id, match, winners } : null;
    })
    .filter((item): item is ExactPredictionHighlight => Boolean(item))
    .sort(sortByKickoffDesc);
};

export const selectExactPredictionsForHomePage = (
  highlights: ExactPredictionHighlight[],
  now: Date = new Date(),
): ExactPredictionHighlight[] => {
  const sorted = [...highlights].sort(sortByKickoffDesc);
  if (sorted.length === 0) return [];

  const todayKey = localDayKey(now);
  const todayHighlights = sorted.filter((highlight) => highlightDayKey(highlight) === todayKey);

  if (todayHighlights.length >= 3) return todayHighlights;
  if (todayHighlights.length > 0) {
    const previousHighlights = sorted.filter((highlight) => highlightDayKey(highlight) !== todayKey);
    return [...todayHighlights, ...previousHighlights].slice(0, 3);
  }

  return sorted.slice(0, 3);
};
