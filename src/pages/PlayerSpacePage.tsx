import { Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PlayerSummary from '../components/PlayerSummary';
import { matchService } from '../services/matchService';
import { playerService } from '../services/playerService';
import { predictionService } from '../services/predictionService';
import type { Match, Prediction } from '../types';

const PlayerSpacePage = () => {
  const navigate = useNavigate();
  const auth = playerService.getCurrentPlayer();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [matchesById, setMatchesById] = useState<Record<string, Match>>({});
  const [points, setPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!auth) return;

      setIsLoading(true);
      setError(null);

      try {
        const [playerPredictions, matches] = await Promise.all([
          predictionService.getPredictionsForPlayer(auth.id),
          matchService.getAll(),
        ]);

        const byId = Object.fromEntries(matches.map((match) => [match.id, match]));
        const totalPoints = playerPredictions.reduce((total, prediction) => {
          const match = byId[prediction.matchId];
          if (!match) return total;
          return total + predictionService.calculatePointsForPrediction(prediction, match);
        }, 0);

        setPredictions(playerPredictions);
        setMatchesById(byId);
        setPoints(totalPoints);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Chargement impossible.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [auth]);

  if (!auth) return <Navigate to="/connexion" replace />;

  return (
    <>
      {isLoading ? <p className="card">Chargement de ton espace...</p> : null}
      {error ? <p className="card">⚠️ {error}</p> : null}
      <PlayerSummary
        nickname={auth.nickname}
        points={points}
        predictions={predictions}
        matchesById={matchesById}
        onLogout={() => {
          playerService.logout();
          navigate('/connexion');
        }}
      />
    </>
  );
};

export default PlayerSpacePage;
