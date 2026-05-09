import { useMemo, useState } from 'react';
import type { LeaderboardHistoryPeriod } from '../types';
import LeaderboardHistoryChart, { type HistoryLimit } from './LeaderboardHistoryChart';

interface LeaderboardHistorySectionProps {
  periods: LeaderboardHistoryPeriod[];
  currentPlayerId?: string;
  isFallback?: boolean;
  hasFrozenSnapshots?: boolean;
}

const filters: Array<{ id: HistoryLimit; label: string }> = [
  { id: 5, label: 'Top 5' },
  { id: 8, label: 'Top 8' },
  { id: 'all', label: 'Tous' },
];

const LeaderboardHistorySection = ({ periods, currentPlayerId, isFallback, hasFrozenSnapshots }: LeaderboardHistorySectionProps) => {
  const [limit, setLimit] = useState<HistoryLimit>(8);
  const visiblePlayerCount = useMemo(() => new Set(periods.flatMap((period) => period.entries.map((entry) => entry.playerId))).size, [periods]);

  return (
    <section className="section-block leaderboard-history-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Semaines figées + semaine en cours</p>
          <h2>Historique du classement</h2>
        </div>
      </div>

      <p className="history-intro">
        Le classement évolue en direct pendant la semaine. Chaque semaine, une version est figée pour suivre les changements de position.
      </p>

      <div className="history-filter-row" role="tablist" aria-label="Filtrer les joueurs affichés">
        {filters.map((filter) => (
          <button
            key={filter.label}
            className={`pill ${limit === filter.id ? 'active' : ''}`}
            type="button"
            onClick={() => setLimit(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {!hasFrozenSnapshots ? (
        <div className="notice-panel compact history-note">
          <strong>Aucun historique figé pour le moment.</strong>
          <p>Le classement live apparaît déjà en “En cours”. Les semaines seront ajoutées après le premier snapshot.</p>
        </div>
      ) : null}

      {periods.length > 0 ? (
        <>
          <LeaderboardHistoryChart periods={periods} currentPlayerId={currentPlayerId} limit={limit} />
          <p className="history-footnote">
            {limit === 'all'
              ? `${visiblePlayerCount} joueurs affichés.`
              : 'Affichage des meilleurs joueurs pour garder le graphique lisible.'}
            {isFallback ? ' Données de démonstration si Supabase est indisponible.' : ''}
          </p>
        </>
      ) : (
        <div className="empty-state inline">
          <strong>Aucun historique figé pour le moment.</strong>
          <p>Le classement live apparaîtra ici dès que des semaines seront enregistrées.</p>
        </div>
      )}
    </section>
  );
};

export default LeaderboardHistorySection;
