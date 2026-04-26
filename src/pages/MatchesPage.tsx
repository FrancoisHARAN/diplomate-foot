import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MatchList from '../components/MatchList';
import PageTitle from '../components/PageTitle';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { matchService } from '../services/matchService';
import { predictionService } from '../services/predictionService';
import type { Match, Prediction } from '../types';
import { canEditPrediction } from '../utils/date';

type StatusFilter = 'all' | 'upcoming' | 'live' | 'finished' | 'closed';

const MatchesPage = () => {
  const { player } = usePlayerSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  const status = (searchParams.get('status') as StatusFilter) || 'all';
  const mineOnly = searchParams.get('mine') === '1';
  const date = searchParams.get('date') ?? '';

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
    return matches
      .filter((match) => {
        if (mineOnly && !predictionsByMatch[match.id]) return false;
        if (status === 'closed') return match.status !== 'finished' && !canEditPrediction(match);
        if (status === 'upcoming' || status === 'live' || status === 'finished') {
          if (match.status !== status) return false;
        }
        if (date) {
          const day = new Date(match.kickoff).toISOString().slice(0, 10);
          if (day !== date) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
  }, [date, matches, mineOnly, predictionsByMatch, status]);

  const updateFilters = (next: Partial<{ status: StatusFilter; mine: boolean; date: string }>) => {
    const params = new URLSearchParams(searchParams);
    if (next.status) params.set('status', next.status); else if ('status' in next) params.delete('status');
    if (typeof next.mine === 'boolean') {
      if (next.mine) params.set('mine', '1');
      else params.delete('mine');
    }
    if (typeof next.date === 'string') {
      if (next.date) params.set('date', next.date);
      else params.delete('date');
    }
    setSearchParams(params);
  };

  return (
    <div className="stack">
      <PageTitle title="Matchs à venir" subtitle="Choisis un match et pronostique en quelques secondes." />

      <section className="card stack-sm">
        <h2>Filtres</h2>
        <div className="filter-row">
          {[
            ['all', 'Tous'],
            ['upcoming', 'À venir'],
            ['live', 'En cours'],
            ['closed', 'Verrouillés'],
            ['finished', 'Terminés'],
          ].map(([value, label]) => (
            <button key={value} className={`pill ${status === value ? 'active' : ''}`} onClick={() => updateFilters({ status: value as StatusFilter })}>
              {label}
            </button>
          ))}
        </div>
        <div className="filter-controls">
          <label>
            Date
            <input type="date" value={date} onChange={(event) => updateFilters({ date: event.target.value })} />
          </label>
          <label className="checkbox-inline">
            <input type="checkbox" checked={mineOnly} onChange={(event) => updateFilters({ mine: event.target.checked })} />
            Mes matchs non pronostiqués
          </label>
          <button className="btn small secondary" type="button" onClick={() => setSearchParams(new URLSearchParams())}>Réinitialiser</button>
        </div>
      </section>

      <MatchList matches={filteredMatches} predictionsByMatch={predictionsByMatch} />
    </div>
  );
};

export default MatchesPage;
