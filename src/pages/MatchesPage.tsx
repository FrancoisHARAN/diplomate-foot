import { useEffect, useMemo, useState } from 'react';
import MatchList from '../components/MatchList';
import PageTitle from '../components/PageTitle';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { matchService } from '../services/matchService';
import { predictionService } from '../services/predictionService';
import type { Match, Prediction } from '../types';
import { canEditPrediction } from '../utils/date';

type Filter = 'all' | 'open' | 'mine' | 'closed' | 'finished';

const MatchesPage = () => {
  const { player } = usePlayerSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    const load = async () => {
      const loadedMatches = await matchService.getAll();
      setMatches(loadedMatches);
      if (!player) return setPredictions([]);
      setPredictions(await predictionService.getPredictionsForPlayer(player.id));
    };
    void load();
  }, [player]);

  const predictionsByMatch = useMemo(
    () => Object.fromEntries(predictions.map((prediction) => [prediction.matchId, prediction])),
    [predictions],
  );

  const filteredMatches = useMemo(() => {
    if (filter === 'all') return matches;
    if (filter === 'mine') return matches.filter((match) => Boolean(predictionsByMatch[match.id]));
    if (filter === 'finished') return matches.filter((match) => match.status === 'finished');
    if (filter === 'closed') return matches.filter((match) => match.status !== 'finished' && !canEditPrediction(match));
    return matches.filter((match) => match.status === 'upcoming' && canEditPrediction(match));
  }, [filter, matches, predictionsByMatch]);

  return (
    <div className="stack">
      <PageTitle title="Matchs" subtitle="Choisis un match pour faire ton prono." />
      <section className="filter-row">
        {[
          ['all', 'Tous'],
          ['open', 'Ouverts'],
          ['mine', 'Mes pronos'],
          ['closed', 'Fermés'],
          ['finished', 'Terminés'],
        ].map(([value, label]) => (
          <button key={value} className={`pill ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value as Filter)}>
            {label}
          </button>
        ))}
      </section>
      <MatchList matches={filteredMatches} predictionsByMatch={predictionsByMatch} />
    </div>
  );
};

export default MatchesPage;
