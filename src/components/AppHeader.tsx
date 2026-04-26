import { Link } from 'react-router-dom';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { predictionService } from '../services/predictionService';
import { matchService } from '../services/matchService';
import { useEffect, useState } from 'react';

const AppHeader = () => {
  const { player } = usePlayerSession();
  const [points, setPoints] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!player) return setPoints(0);
      const [predictions, matches] = await Promise.all([
        predictionService.getPredictionsForPlayer(player.id),
        matchService.getAll(),
      ]);
      const byId = new Map(matches.map((match) => [match.id, match]));
      const total = predictions.reduce((sum, prediction) => {
        const match = byId.get(prediction.matchId);
        return match ? sum + predictionService.calculatePointsForPrediction(prediction, match) : sum;
      }, 0);
      setPoints(total);
    };
    void load();
  }, [player]);

  return (
    <header className="app-header">
      <div>
        <p className="brand">Le Diplomate</p>
        <p className="subtitle">Pronos 2026</p>
      </div>
      <Link className="account-chip" to={player ? '/mon-compte' : '/connexion'}>
        <span className="account-icon">👤</span>
        <span>{player ? `${player.nickname} · ${points} pts` : 'Connexion'}</span>
      </Link>
    </header>
  );
};

export default AppHeader;
