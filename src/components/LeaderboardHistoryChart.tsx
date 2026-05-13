import { Link } from 'react-router-dom';
import type { LeaderboardHistoryPeriod } from '../types';

type HistoryLimit = 5 | 8 | 'all';
type PointHistoryRange = 'two-weeks' | 'since-start';

interface LeaderboardHistoryChartProps {
  periods: LeaderboardHistoryPeriod[];
  currentPlayerId?: string;
  limit: HistoryLimit;
  range: PointHistoryRange;
}

interface PointSeriesItem {
  periodIndex: number;
  points: number;
  changed: boolean;
}

const palette = ['#d2ff52', '#25e6b7', '#ffffff', '#ff5c70', '#8ab0ff', '#ffd166', '#f77fbe', '#9dffcb'];

const sortPeriods = (periods: LeaderboardHistoryPeriod[]): LeaderboardHistoryPeriod[] =>
  [...periods].sort((left, right) => new Date(left.snapshotAt).getTime() - new Date(right.snapshotAt).getTime());

const periodDay = (period: LeaderboardHistoryPeriod): string => new Date(period.snapshotAt).toISOString().slice(0, 10);

const visiblePeriods = (periods: LeaderboardHistoryPeriod[], range: PointHistoryRange): LeaderboardHistoryPeriod[] => {
  const ordered = sortPeriods(periods);
  if (ordered.length === 0) return [];

  const firstScoringIndex = ordered.findIndex((period) => period.entries.some((entry) => entry.points > 0));
  const fromFirstScore = firstScoringIndex >= 0 ? ordered.slice(firstScoringIndex) : ordered;
  if (range === 'since-start') return fromFirstScore;

  const latestTime = new Date(fromFirstScore[fromFirstScore.length - 1].snapshotAt).getTime();
  const cutoff = latestTime - 13 * 24 * 60 * 60 * 1000;
  const lastTwoWeeks = fromFirstScore.filter((period) => new Date(period.snapshotAt).getTime() >= cutoff);
  return lastTwoWeeks.length > 0 ? lastTwoWeeks : fromFirstScore.slice(-1);
};

const selectPlayers = (periods: LeaderboardHistoryPeriod[], limit: HistoryLimit, currentPlayerId?: string): string[] => {
  const latest = periods[periods.length - 1];
  const ordered = latest?.entries
    .filter((entry) => entry.points > 0 || latest.entries.some((item) => item.points > 0))
    .map((entry) => entry.playerId) ?? [];
  const visible = limit === 'all' ? ordered : ordered.slice(0, limit);

  if (currentPlayerId && ordered.includes(currentPlayerId) && !visible.includes(currentPlayerId) && limit !== 'all') {
    return [...visible.slice(0, Math.max(0, visible.length - 1)), currentPlayerId];
  }

  return visible;
};

const playerName = (periods: LeaderboardHistoryPeriod[], playerId: string): string => {
  for (let index = periods.length - 1; index >= 0; index -= 1) {
    const entry = periods[index].entries.find((item) => item.playerId === playerId);
    if (entry) return entry.nickname;
  }
  return 'Joueur';
};

const playerPoints = (periods: LeaderboardHistoryPeriod[], playerId: string): PointSeriesItem[] => {
  let lastPoints: number | null = null;

  return periods
    .map((period, periodIndex) => {
      const entry = period.entries.find((item) => item.playerId === playerId);
      if (entry) {
        const changed = lastPoints === null || entry.points !== lastPoints;
        lastPoints = entry.points;
        return { periodIndex, points: entry.points, changed };
      }

      if (lastPoints === null) return null;
      return { periodIndex, points: lastPoints, changed: false };
    })
    .filter((item): item is PointSeriesItem => Boolean(item));
};

const compactDate = (period: LeaderboardHistoryPeriod): string => {
  if (period.isCurrent) return 'Auj.';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(new Date(period.snapshotAt));
};

const LeaderboardHistoryChart = ({ periods, currentPlayerId, limit, range }: LeaderboardHistoryChartProps) => {
  const chartPeriods = visiblePeriods(periods, range);
  if (chartPeriods.length === 0) return null;

  const visiblePlayers = selectPlayers(chartPeriods, limit, currentPlayerId);
  if (visiblePlayers.length === 0) {
    return (
      <div className="empty-state inline history-empty">
        <strong>Pas encore de points.</strong>
        <p>Le graphique se remplira dès les premiers résultats.</p>
      </div>
    );
  }

  const left = 42;
  const top = 24;
  const bottom = 42;
  const right = 22;
  const chartHeight = 188;
  const stepX = range === 'two-weeks' ? 36 : Math.max(24, Math.min(40, Math.round(720 / Math.max(1, chartPeriods.length - 1))));
  const width = Math.max(330, left + right + stepX * Math.max(1, chartPeriods.length - 1));
  const height = top + chartHeight + bottom;
  const maxPoints = Math.max(1, ...visiblePlayers.flatMap((playerId) => playerPoints(chartPeriods, playerId).map((item) => item.points)));
  const tickValues = Array.from(new Set([0, Math.ceil(maxPoints / 2), maxPoints]));
  const labelEvery = Math.max(1, Math.ceil(chartPeriods.length / (range === 'two-weeks' ? 7 : 8)));
  const xFor = (periodIndex: number) => left + periodIndex * stepX;
  const yFor = (points: number) => top + chartHeight - (points / maxPoints) * chartHeight;

  return (
    <div className="history-chart-scroll" role="img" aria-label="Évolution des points cumulés">
      <svg className="history-chart" viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
        {tickValues.map((value) => (
          <g key={value}>
            <line x1={left} x2={width - right} y1={yFor(value)} y2={yFor(value)} className="history-grid-line" />
            <text x={8} y={yFor(value) + 4} className="history-value-label">{value}</text>
          </g>
        ))}

        {chartPeriods.map((period, index) => (
          <g key={`${periodDay(period)}-${period.label}`}>
            <line x1={xFor(index)} x2={xFor(index)} y1={top} y2={height - bottom} className="history-period-line" />
            {index % labelEvery === 0 || index === chartPeriods.length - 1 ? (
              <text x={xFor(index)} y={height - 13} textAnchor="middle" className={period.isCurrent ? 'history-axis-label current' : 'history-axis-label'}>
                {compactDate(period)}
              </text>
            ) : null}
          </g>
        ))}

        {visiblePlayers.map((playerId, playerIndex) => {
          const series = playerPoints(chartPeriods, playerId);
          const isLeader = playerIndex === 0;
          const isMe = playerId === currentPlayerId;
          const color = palette[playerIndex % palette.length];
          const path = series.map((item, index) => `${index === 0 ? 'M' : 'L'} ${xFor(item.periodIndex)} ${yFor(item.points)}`).join(' ');
          return (
            <g key={playerId}>
              <path d={path} className={`history-player-line ${isLeader ? 'is-leader' : ''} ${isMe ? 'is-me' : ''}`} style={{ stroke: color }} />
              {series.filter((item) => item.changed).map((item) => (
                <circle
                  key={`${playerId}-${item.periodIndex}`}
                  cx={xFor(item.periodIndex)}
                  cy={yFor(item.points)}
                  r={isLeader ? 4.8 : 3.8}
                  className={`history-player-dot ${isLeader ? 'is-leader' : ''} ${isMe ? 'is-me' : ''}`}
                  style={{ fill: color }}
                />
              ))}
            </g>
          );
        })}
      </svg>

      <div className="history-legend" aria-label="Joueurs affichés">
        {visiblePlayers.map((playerId, index) => (
          <Link key={playerId} to={`/joueurs/${playerId}`} className={`history-legend-chip ${index === 0 ? 'is-leader' : ''} ${playerId === currentPlayerId ? 'is-me' : ''}`}>
            <i style={{ background: palette[index % palette.length] }} />
            {playerName(chartPeriods, playerId)}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default LeaderboardHistoryChart;
export type { HistoryLimit, PointHistoryRange };
