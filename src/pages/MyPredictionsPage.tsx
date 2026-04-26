import { useEffect, useMemo, useState } from 'react';
import EmptyState from '../components/EmptyState';
import PageTitle from '../components/PageTitle';
import UserPredictionsList from '../components/UserPredictionsList';
import UserStats from '../components/UserStats';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { matchService } from '../services/matchService';
import { predictionService } from '../services/predictionService';
import type { Match, Prediction } from '../types';

const MyPredictionsPage = () => {
  const { player } = usePlayerSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  useEffect(() => {
    const load = async () => {
      const allMatches = await matchService.getAll();
      setMatches(allMatches);
      if (!player) return setPredictions([]);
      setPredictions(await predictionService.getPredictionsForPlayer(player.id));
    };
    void load();
  }, [player]);

  const map = useMemo(() => Object.fromEntries(predictions.map((item) => [item.matchId, item])), [predictions]);

  if (!player) return <EmptyState title="Connecte-toi" text="Connecte-toi pour voir tes pronostics." ctaLabel="Connexion" to="/connexion" />;

  const upcoming = matches.filter((match) => match.status === 'upcoming').map((match) => ({ match, prediction: map[match.id] }));
  const locked = matches.filter((match) => match.status === 'live').map((match) => ({ match, prediction: map[match.id] }));
  const done = matches
    .filter((match) => match.status === 'finished')
    .map((match) => ({ match, prediction: map[match.id], points: map[match.id] ? predictionService.calculatePointsForPrediction(map[match.id], match) : 0 }));

  return (
    <div className="stack">
      <PageTitle title="Mes pronos" />
      <UserStats
        items={[
          { label: 'Pronostics faits', value: predictions.length },
          { label: 'Points totaux', value: done.reduce((sum, item) => sum + (item.points ?? 0), 0) },
          { label: 'Matchs restants', value: upcoming.length },
        ]}
      />
      <UserPredictionsList title="À venir" items={upcoming} />
      <UserPredictionsList title="Verrouillés" items={locked} />
      <UserPredictionsList title="Terminés" items={done} />
    </div>
  );
};

export default MyPredictionsPage;
