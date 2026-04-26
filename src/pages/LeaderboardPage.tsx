import Leaderboard from '../components/Leaderboard';
import { mockPlayers } from '../data/mockPlayers';
import type { Standing } from '../types';

const LeaderboardPage = () => {
  const standings: Standing[] = mockPlayers
    .map((player) => ({
      position: 0,
      playerId: player.id,
      nickname: player.nickname,
      points: player.points,
      exactScores: player.exactScores,
      correctResults: player.correctResults,
    }))
    .sort((a, b) => b.points - a.points)
    .map((standing, index) => ({ ...standing, position: index + 1 }));

  return <Leaderboard standings={standings} />;
};

export default LeaderboardPage;
