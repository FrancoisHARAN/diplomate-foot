import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { matchService } from '../services/matchService';
import { playerService } from '../services/playerService';
import { predictionService } from '../services/predictionService';
import type { Standing } from '../types';
import { buildStandings, getUserRank } from '../utils/appState';

const PlayerSpacePage = () => {
  const navigate = useNavigate();
  const { player, logout } = usePlayerSession();
  const [points, setPoints] = useState(0);
  const [rank, setRank] = useState<Standing | undefined>();

  useEffect(() => {
    const load = async () => {
      if (!player) return;
      const [players, predictions, matches] = await Promise.all([
        playerService.getPlayers(),
        predictionService.getAllPredictions(),
        matchService.getAll(),
      ]);
      const standings = buildStandings(players, predictions, matches);
      const mine = predictions.filter((item) => item.playerId === player.id);
      const donePoints = mine.reduce((sum, prediction) => {
        const match = matches.find((item) => item.id === prediction.matchId);
        return match ? sum + predictionService.calculatePointsForPrediction(prediction, match) : sum;
      }, 0);
      setPoints(donePoints);
      setRank(getUserRank(standings, player.id));
    };
    void load();
  }, [player]);

  if (!player) return <Navigate to="/connexion" replace />;

  return (
    <div className="stack">
      <section className="card stack-sm">
        <h1>Mon compte</h1>
        <p>{player.nickname}</p>
        <p>{points} pts</p>
        <p>Rang : {rank?.position ?? '-'}</p>
      </section>
      <Link className="btn" to="/mes-pronos">Mes pronos</Link>
      <Link className="btn secondary" to="/classement">Classement</Link>
      <button
        className="btn secondary"
        onClick={() => {
          logout();
          navigate('/connexion');
        }}
      >
        Déconnexion
      </button>
    </div>
  );
};

export default PlayerSpacePage;
