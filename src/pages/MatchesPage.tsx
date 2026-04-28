import { useMemo, useState } from 'react';
import MatchCard from '../components/MatchCard';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { mockMatches } from '../data/mockMatches';
import { canEditPrediction } from '../utils/date';
import { getStoredPredictions } from '../utils/appState';

type FilterKey = 'all' | 'open' | 'mine' | 'closed' | 'done';

const MatchesPage = () => {
  const { player } = usePlayerSession();
  const [filter, setFilter] = useState<FilterKey>('all');
  const predictions = getStoredPredictions();
  const myPredictions = predictions.filter((p) => p.playerId === player?.id);
  const myMap = new Map(myPredictions.map((p) => [p.matchId, p]));

  const filtered = useMemo(() => {
    return mockMatches.filter((match) => {
      const mine = myMap.get(match.id);
      if (filter === 'mine') return Boolean(mine);
      if (filter === 'open') return match.status === 'upcoming' && canEditPrediction(match);
      if (filter === 'closed') return (match.status === 'upcoming' && !canEditPrediction(match)) || match.status === 'live';
      if (filter === 'done') return match.status === 'finished';
      return true;
    });
  }, [filter, myMap]);

  return (
    <div className="stack">
      <section className="stack-sm">
        <h1>Matchs</h1>
        <p>Choisis un match pour faire ton prono.</p>
      </section>

      <div className="filter-row">
        {[
          ['all', 'Tous'],
          ['open', 'Ouverts'],
          ['mine', 'Mes pronos'],
          ['closed', 'Fermés'],
          ['done', 'Terminés'],
        ].map(([id, label]) => (
          <button key={id} type="button" className={`pill ${filter === id ? 'active' : ''}`} onClick={() => setFilter(id as FilterKey)}>{label}</button>
        ))}
      </div>

      <section className="stack-sm">
        {filtered.map((match) => <MatchCard key={match.id} match={match} prediction={myMap.get(match.id)} />)}
      </section>
    </div>
  );
};

export default MatchesPage;
