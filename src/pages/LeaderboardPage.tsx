import { useEffect, useState } from 'react';
import PageTitle from '../components/PageTitle';
import Podium from '../components/Podium';
import RankingList from '../components/RankingList';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { matchService } from '../services/matchService';
import { playerService } from '../services/playerService';
import { predictionService } from '../services/predictionService';
import type { Standing } from '../types';
import { buildStandings, getUserRank } from '../utils/appState';

const LeaderboardPage = () => {
  const { player } = usePlayerSession();
  const [standings, setStandings] = useState<Standing[]>([]);

  useEffect(() => {
    const load = async () => {
      const [players, predictions, matches] = await Promise.all([
        playerService.getPlayers(),
        predictionService.getAllPredictions(),
        matchService.getAll(),
      ]);
      setStandings(buildStandings(players, predictions, matches));
    };
    void load();
  }, []);

  const userRank = getUserRank(standings, player?.id);

  return (
    <div className="stack">
      <PageTitle title="Classement du bar" subtitle="Le 1er remporte 50 € de consommation." />
      <Podium top={standings.slice(0, 3)} />
      {userRank ? <section className="card">Tu es actuellement {userRank.position}e avec {userRank.points} points.</section> : null}
      <RankingList standings={standings} currentPlayerId={player?.id} />
    </div>
  );
};

export default LeaderboardPage;
