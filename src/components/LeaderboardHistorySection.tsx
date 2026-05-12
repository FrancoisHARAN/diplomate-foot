import { useMemo, useState } from 'react';
import type { LeaderboardHistoryPeriod } from '../types';
import LeaderboardHistoryChart, { type HistoryLimit, type PointHistoryRange } from './LeaderboardHistoryChart';

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

const rangeFilters: Array<{ id: PointHistoryRange; label: string }> = [
  { id: 'two-weeks', label: '2 semaines' },
  { id: 'since-start', label: 'Depuis le début' },
];

const LeaderboardHistorySection = ({ periods, currentPlayerId, isFallback, hasFrozenSnapshots }: LeaderboardHistorySectionProps) => {
  const [limit, setLimit] = useState<HistoryLimit>(5);
  const [range, setRange] = useState<PointHistoryRange>('two-weeks');
  const visiblePlayerCount = useMemo(() => new Set(periods.flatMap((period) => period.entries.map((entry) => entry.playerId))).size, [periods]);

  return (
    <section className="section-block leaderboard-history-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Historique</p>
          <h2>Évolution des points</h2>
        </div>
      </div>

      <p className="history-intro">
        Suis la progression des meilleurs joueurs au fil des jours.
      </p>

      <div className="history-range-row" role="tablist" aria-label="Filtrer la période affichée">
        {rangeFilters.map((filter) => (
          <button
            key={filter.id}
            className={`pill ${range === filter.id ? 'active' : ''}`}
            type="button"
            onClick={() => setRange(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

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
          <strong>Historique en préparation.</strong>
          <p>Le classement actuel reste affiché en attendant plus de journées avec points.</p>
        </div>
      ) : null}

      {periods.length > 0 ? (
        <>
          <LeaderboardHistoryChart periods={periods} currentPlayerId={currentPlayerId} limit={limit} range={range} />
          <p className="history-footnote">
            {limit === 'all'
              ? `${visiblePlayerCount} joueurs affichés.`
              : 'Les joueurs suivent le classement actuel.'}
            {isFallback ? ' Données de démonstration si Supabase est indisponible.' : ''}
          </p>
        </>
      ) : (
        <div className="empty-state inline">
          <strong>Aucun point pour le moment.</strong>
          <p>Le graphique apparaîtra dès les premiers résultats.</p>
        </div>
      )}
    </section>
  );
};

export default LeaderboardHistorySection;
