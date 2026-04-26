import { Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PlayerSummary from '../components/PlayerSummary';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { matchService } from '../services/matchService';
import { predictionService } from '../services/predictionService';
import type { Match, Prediction } from '../types';

const PlayerSpacePage = () => {
  const navigate = useNavigate();
  const { player, logout } = usePlayerSession();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [matchesById, setMatchesById] = useState<Record<string, Match>>({});
  const [points, setPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!player) return;

      setIsLoading(true);
      setError(null);

      try {
        const [playerPredictions, matches] = await Promise.all([
          predictionService.getPredictionsForPlayer(player.id),
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
  }, [player]);

  if (!player) return <Navigate to="/connexion" replace />;

  return (
    <>
      {isLoading ? <p className="card">Chargement de ton espace...</p> : null}
      {error ? <p className="card">⚠️ {error}</p> : null}
      <PlayerSummary
        nickname={player.nickname}
        points={points}
        predictionCount={predictions.length}
        onLogout={() => {
          logout();
          navigate('/connexion');
        }}
      />
      <p className="card">Matchs analysés : {Object.keys(matchesById).length}</p>
    </>
  );
};

export default PlayerSpacePage;
