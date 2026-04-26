import { Navigate, useNavigate } from 'react-router-dom';
import PlayerSummary from '../components/PlayerSummary';
import { mockPlayers } from '../data/mockPlayers';
import { matchService } from '../services/matchService';
import { playerService } from '../services/playerService';
import { predictionService } from '../services/predictionService';

const PlayerSpacePage = () => {
  const navigate = useNavigate();
  const auth = playerService.getCurrent();

  if (!auth) return <Navigate to="/connexion" replace />;

  const predictions = predictionService.listByPlayer(auth.id);
  const matchesById = Object.fromEntries(matchService.list().map((match) => [match.id, match]));
  const known = mockPlayers.find((player) => player.id === auth.id);

  return (
    <PlayerSummary
      nickname={auth.nickname}
      points={known?.points ?? 0}
      predictions={predictions}
      matchesById={matchesById}
      onLogout={() => {
        playerService.logout();
        navigate('/connexion');
      }}
    />
  );
};

export default PlayerSpacePage;
