import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import MatchCard from '../components/MatchCard';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { useLiveMatches } from '../hooks/useLiveMatches';
import type { CompetitionCode, Match } from '../types';
import { getPredictionsForPlayer, getStoredPredictions } from '../utils/appState';
import { isLiveDisplayMatch } from '../utils/date';
import { getLiveDataNotice } from '../utils/liveDataNotice';

type FilterKey = 'all' | CompetitionCode | 'live' | 'done';

const filters: Array<{ id: FilterKey; label: string }> = [
  { id: 'all', label: 'Tous' },
  { id: 'live', label: 'Live' },
  { id: 'done', label: 'Terminés' },
  { id: 'CL', label: 'Champions League' },
  { id: 'EL', label: 'Europa League' },
  { id: 'UCL', label: 'Conference League' },
  { id: 'PD', label: 'Liga' },
  { id: 'FL1', label: 'Ligue 1' },
  { id: 'PL', label: 'Premier League' },
];

const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);

const dayTitle = (iso: string) => {
  const date = new Date(iso);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((target - start) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Demain';

  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: diffDays > 5 ? 'numeric' : undefined,
    month: diffDays > 5 ? 'short' : undefined,
  }).format(date);
};

const groupByDay = (matches: Match[]) => {
  const groups = new Map<string, Match[]>();
  matches.forEach((match) => {
    const key = dayKey(match.kickoff);
    groups.set(key, [...(groups.get(key) ?? []), match]);
  });
  return Array.from(groups.entries()).map(([key, items]) => ({ key, title: dayTitle(items[0].kickoff), matches: items }));
};

const sortMatchesForFilter = (matches: Match[], filter: FilterKey): Match[] =>
  [...matches].sort((left, right) => {
    const leftKickoff = new Date(left.kickoff).getTime();
    const rightKickoff = new Date(right.kickoff).getTime();
    return filter === 'done' ? rightKickoff - leftKickoff : leftKickoff - rightKickoff;
  });

const MatchesPage = () => {
  const { player } = usePlayerSession();
  const { matches, isFallback, message } = useLiveMatches();
  const [filter, setFilter] = useState<FilterKey>('all');
  const predictions = getStoredPredictions();
  const myPredictions = getPredictionsForPlayer(player?.id, predictions);
  const myMap = new Map(myPredictions.map((prediction) => [prediction.matchId, prediction]));
  const liveDataNotice = getLiveDataNotice(message);

  const filtered = useMemo(() => {
    const filteredMatches = matches.filter((match) => {
      if (filter === 'live') return isLiveDisplayMatch(match);
      if (filter === 'done') return match.status === 'finished';
      if (['CL', 'EL', 'UCL', 'FL1', 'PL', 'PD', 'WORLD', 'TEST'].includes(filter)) return match.competitionCode === filter && match.status !== 'finished';
      return match.status !== 'finished';
    });

    return sortMatchesForFilter(filteredMatches, filter);
  }, [filter, matches]);

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  return (
    <div className="screen-stack">
      <section className="page-hero">
        <p className="eyebrow">Calendrier</p>
        <h1>Matchs</h1>
        <p>Choisis un match, pose ton score, puis passe au suivant avec la flèche.</p>
      </section>

      {isFallback ? (
        <section className="notice-panel compact">
          <strong>Mode test actif</strong>
          <p>Ajoute une clé API dans GitHub pour remplacer ces matchs par les données live.</p>
        </section>
      ) : null}

      {liveDataNotice && !isFallback ? (
        <section className="notice-panel compact">
          <strong>Données foot partielles</strong>
          <p>{liveDataNotice}</p>
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

      {grouped.length > 0 ? (
        grouped.map((group) => (
          <section className="match-day-group" key={group.key}>
            <h2>{group.title}</h2>
            <div className="match-list">
              {group.matches.map((match) => <MatchCard key={match.id} match={match} prediction={myMap.get(match.id)} />)}
            </div>
          </section>
        ))
      ) : (
        <div className="empty-state">
          <strong>Aucun match ici</strong>
          <p>Change de filtre ou reviens dès que de nouveaux matchs sont ouverts.</p>
        </div>
      )}
    </div>
  );
};

export default MatchesPage;
