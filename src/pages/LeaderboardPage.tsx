import { useEffect, useState } from 'react';
import Leaderboard from '../components/Leaderboard';
import { matchService } from '../services/matchService';
import { playerService } from '../services/playerService';
import { predictionService } from '../services/predictionService';
import type { Standing } from '../types';

const LeaderboardPage = () => {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [players, predictions, matches] = await Promise.all([
          playerService.getPlayers(),
          predictionService.getAllPredictions(),
          matchService.getAll(),
        ]);

        const matchesById = new Map(matches.map((match) => [match.id, match]));
        const pointsByPlayer = new Map<string, number>();

        predictions.forEach((prediction) => {
          const match = matchesById.get(prediction.matchId);
          if (!match) return;

          const points = predictionService.calculatePointsForPrediction(prediction, match);
          pointsByPlayer.set(prediction.playerId, (pointsByPlayer.get(prediction.playerId) ?? 0) + points);
        });

        const ranked = players
          .map((player) => ({
            position: 0,
            playerId: player.id,
            nickname: player.nickname,
            points: pointsByPlayer.get(player.id) ?? player.points ?? 0,
            exactScores: player.exactScores ?? 0,
            correctResults: player.correctResults ?? 0,
          }))
          .sort((a, b) => b.points - a.points)
          .map((standing, index) => ({ ...standing, position: index + 1 }));

        setStandings(ranked);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Chargement impossible.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <section>
      <h2>Classement du bar</h2>
      {isLoading ? <p className="card">Chargement du classement...</p> : null}
      {error ? <p className="card">⚠️ {error}</p> : null}
      {standings[0] ? (
        <p className="card">
          🏆 Première place actuelle : <strong>{standings[0].nickname}</strong> avec {standings[0].points} points.
        </p>
      ) : null}
      <Leaderboard standings={standings} />
    </section>
  );
};

export default LeaderboardPage;
