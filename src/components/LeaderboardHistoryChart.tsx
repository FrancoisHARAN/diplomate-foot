import type { LeaderboardHistoryPeriod } from '../types';

type HistoryLimit = 5 | 8 | 'all';

interface LeaderboardHistoryChartProps {
  periods: LeaderboardHistoryPeriod[];
  currentPlayerId?: string;
  limit: HistoryLimit;
}

const palette = ['#d2ff52', '#25e6b7', '#ffffff', '#ff4f5e', '#8ab0ff', '#ffd166', '#f77fbe', '#9dffcb'];

const selectPlayers = (periods: LeaderboardHistoryPeriod[], limit: HistoryLimit, currentPlayerId?: string): string[] => {
  const latest = periods[periods.length - 1];
  const ordered = latest?.entries.map((entry) => entry.playerId) ?? [];
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

const playerRanks = (periods: LeaderboardHistoryPeriod[], playerId: string) =>
  periods.map((period, periodIndex) => {
    const entry = period.entries.find((item) => item.playerId === playerId);
    return entry ? { periodIndex, rank: entry.rank, points: entry.points } : null;
  }).filter((item): item is { periodIndex: number; rank: number; points: number } => Boolean(item));

const LeaderboardHistoryChart = ({ periods, currentPlayerId, limit }: LeaderboardHistoryChartProps) => {
  if (periods.length === 0) return null;

  const visiblePlayers = selectPlayers(periods, limit, currentPlayerId);
  const left = 46;
  const top = 24;
  const bottom = 42;
  const right = 24;
  const stepX = Math.max(84, Math.round(300 / Math.max(1, periods.length - 1)));
  const rowGap = 34;
  const maxRank = Math.max(1, ...visiblePlayers.flatMap((playerId) => playerRanks(periods, playerId).map((item) => item.rank)));
  const width = left + right + stepX * Math.max(1, periods.length - 1);
  const height = top + bottom + rowGap * Math.max(1, maxRank - 1);
  const xFor = (periodIndex: number) => left + periodIndex * stepX;
  const yFor = (rank: number) => top + (rank - 1) * rowGap;

  return (
    <div className="history-chart-scroll" role="img" aria-label="Evolution hebdomadaire du classement">
      <svg className="history-chart" viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
        {Array.from({ length: maxRank }).map((_, index) => {
          const rank = index + 1;
          return (
            <g key={rank}>
              <line x1={left} x2={width - right} y1={yFor(rank)} y2={yFor(rank)} className="history-grid-line" />
              <text x={8} y={yFor(rank) + 4} className="history-rank-label">#{rank}</text>
            </g>
          );
        })}

        {periods.map((period, index) => (
          <g key={period.label}>
            <line x1={xFor(index)} x2={xFor(index)} y1={top - 8} y2={height - bottom + 8} className="history-period-line" />
            <text x={xFor(index)} y={height - 12} textAnchor="middle" className={period.isCurrent ? 'history-period-label current' : 'history-period-label'}>
              {period.label}
            </text>
          </g>
        ))}

        {visiblePlayers.map((playerId, playerIndex) => {
          const ranks = playerRanks(periods, playerId);
          const color = playerId === currentPlayerId ? '#d2ff52' : palette[playerIndex % palette.length];
          const path = ranks.map((item, index) => `${index === 0 ? 'M' : 'L'} ${xFor(item.periodIndex)} ${yFor(item.rank)}`).join(' ');
          return (
            <g key={playerId}>
              <path d={path} className={playerId === currentPlayerId ? 'history-player-line is-me' : 'history-player-line'} style={{ stroke: color }} />
              {ranks.map((item) => (
                <g key={`${playerId}-${item.periodIndex}`}>
                  <circle cx={xFor(item.periodIndex)} cy={yFor(item.rank)} r={playerId === currentPlayerId ? 5 : 4} className="history-player-dot" style={{ fill: color }} />
                  <text x={xFor(item.periodIndex)} y={yFor(item.rank) - 8} textAnchor="middle" className="history-points-label">{item.points}p</text>
                </g>
              ))}
            </g>
          );
        })}
      </svg>

      <div className="history-legend">
        {visiblePlayers.map((playerId, index) => (
          <span key={playerId} className={playerId === currentPlayerId ? 'is-me' : ''}>
            <i style={{ background: playerId === currentPlayerId ? '#d2ff52' : palette[index % palette.length] }} />
            {playerName(periods, playerId)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default LeaderboardHistoryChart;
export type { HistoryLimit };
