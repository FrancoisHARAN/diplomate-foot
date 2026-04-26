import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import AccountCard from '../components/AccountCard';
import UserStats from '../components/UserStats';
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
  const [predictionCount, setPredictionCount] = useState(0);

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
      setPredictionCount(mine.length);
      setRank(getUserRank(standings, player.id));
    };
    void load();
  }, [player]);

  if (!player) return <Navigate to="/connexion" replace />;

  return (
    <div className="stack">
      <AccountCard nickname={player.nickname} points={points} rank={rank?.position} />
      <UserStats
        items={[
          { label: 'Pronostics faits', value: predictionCount },
          { label: 'Scores exacts', value: rank?.exactScores ?? 0 },
          { label: 'Bons résultats', value: rank?.correctResults ?? 0 },
        ]}
      />
      <Link className="btn" to="/mes-pronos">Voir mes pronos</Link>
      <Link className="btn secondary" to="/classement">Voir le classement</Link>
      <Link className="btn secondary" to="/reglement">Lire le règlement</Link>
      <button
        className="btn"
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
