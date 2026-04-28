import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import MatchCard from '../components/MatchCard';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { useLiveMatches } from '../hooks/useLiveMatches';
import type { CompetitionCode } from '../types';
import { getStoredPredictions } from '../utils/appState';
import { canEditPrediction } from '../utils/date';

type FilterKey = 'all' | CompetitionCode | 'open' | 'live' | 'mine' | 'locked' | 'done';

const filters: Array<{ id: FilterKey; label: string }> = [
  { id: 'all', label: 'Tous' },
  { id: 'CL', label: 'Champions League' },
  { id: 'FL1', label: 'Ligue 1' },
  { id: 'PL', label: 'Premier League' },
  { id: 'PD', label: 'Liga' },
  { id: 'open', label: 'Ouverts' },
  { id: 'live', label: 'Live' },
  { id: 'mine', label: 'Mes pronos' },
  { id: 'locked', label: 'Verrouillés' },
  { id: 'done', label: 'Terminés' },
];

const MatchesPage = () => {
  const { player } = usePlayerSession();
  const { matches, isFallback } = useLiveMatches();
  const [filter, setFilter] = useState<FilterKey>('all');
  const predictions = getStoredPredictions();
  const myPredictions = predictions.filter((prediction) => prediction.playerId === player?.id);
  const myMap = new Map(myPredictions.map((prediction) => [prediction.matchId, prediction]));

  const filtered = useMemo(
    () =>
      matches.filter((match) => {
        const mine = myMap.get(match.id);
        if (filter === 'mine') return Boolean(mine);
        if (filter === 'open') return match.status === 'upcoming' && canEditPrediction(match);
        if (filter === 'live') return match.status === 'live';
        if (filter === 'locked') return (match.status === 'upcoming' && !canEditPrediction(match)) || match.status === 'live';
        if (filter === 'done') return match.status === 'finished';
        if (['CL', 'FL1', 'PL', 'PD', 'WORLD', 'TEST'].includes(filter)) return match.competitionCode === filter;
        return true;
      }),
    [filter, matches, myMap],
  );

  return (
    <div className="screen-stack">
      <section className="page-hero">
        <p className="eyebrow">Calendrier</p>
        <h1>Matchs</h1>
        <p>Choisis un bloc match, puis saisis ton score sur la page dédiée.</p>
      </section>

      {isFallback ? (
        <section className="notice-panel compact">
          <strong>Mode test actif</strong>
          <p>Ajoute une clé API dans GitHub pour remplacer ces matchs par les données live.</p>
        </section>
      ) : null}

      <div className="filter-row" role="tablist" aria-label="Filtres des matchs">
        {filters.map((item) => (
          <button key={item.id} type="button" className={`pill ${filter === item.id ? 'active' : ''}`} onClick={() => setFilter(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      {!player ? (
        <section className="notice-panel">
          <strong>Mode visiteur</strong>
          <p>Tu peux consulter les matchs. Connecte-toi pour enregistrer un prono.</p>
          <Link className="btn secondary" to="/connexion">Connexion</Link>
        </section>
      ) : null}

      <section className="match-list">
        {filtered.length > 0 ? (
          filtered.map((match) => <MatchCard key={match.id} match={match} prediction={myMap.get(match.id)} />)
        ) : (
          <div className="empty-state">
            <strong>Aucun match ici</strong>
            <p>Change de filtre ou reviens dès que de nouveaux matchs sont ouverts.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default MatchesPage;
