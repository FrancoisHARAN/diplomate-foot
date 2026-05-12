import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import LeaderboardHistorySection from '../components/LeaderboardHistorySection';
import PlayerAvatar from '../components/PlayerAvatar';
import PrizePanel from '../components/PrizePanel';
import RankingMovementBadge from '../components/RankingMovementBadge';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { mockPlayers } from '../data/mockPlayers';
import { useLiveMatches } from '../hooks/useLiveMatches';
import { useLeaderboardHistory } from '../hooks/useLeaderboardHistory';
import { useRankingMovements } from '../hooks/useRankingMovements';
import { buildStandings, getStoredPredictions, samePlayerId } from '../utils/appState';

const podiumLabels: Record<number, string> = {
  1: '1er',
  2: '2e',
  3: '3e',
};

const onePointResults = (exactScores: number, twoPointResults: number | undefined, correctResults: number): number =>
  Math.max(0, correctResults - exactScores - (twoPointResults ?? 0));

const LeaderboardPage = () => {
  const { player } = usePlayerSession();
  const { matches } = useLiveMatches();
  const predictions = useMemo(() => getStoredPredictions(), [matches, player?.id]);
  const standings = useMemo(() => buildStandings(mockPlayers, predictions, matches), [matches, predictions]);
  const movements = useRankingMovements(standings);
  const history = useLeaderboardHistory(standings);
  const me = standings.find((row) => samePlayerId(row.playerId, player?.id));
  const lowerStandings = standings.slice(3);

  return (
    <div className="screen-stack">
      <section className="page-hero">
        <p className="eyebrow">En direct</p>
        <h1>Classement en direct</h1>
        <p>Les lots du podium</p>
      </section>

      {me ? (
        <section className="notice-panel leaderboard-me-card">
          <div>
            <p className="eyebrow">Ton classement</p>
            <h2>#{me.position}</h2>
          </div>
          <div className="leaderboard-me-stats">
            <span><strong>{me.points}</strong><small>points</small></span>
            <span><strong>{me.exactScores}</strong><small>scores exacts</small></span>
            <span><strong>{me.twoPointResults ?? 0}</strong><small>bons écarts</small></span>
            <span><strong>{onePointResults(me.exactScores, me.twoPointResults, me.correctResults)}</strong><small>bons gagnants</small></span>
          </div>
        </section>
      ) : null}

      <section className="podium">
        {standings.slice(0, 3).map((row) => (
          <Link key={row.playerId} to={`/joueurs/${row.playerId}`} className={`podium-card rank-${row.position}`}>
            <span className={`podium-rank-badge rank-${row.position}`}>{podiumLabels[row.position] ?? `${row.position}e`}</span>
            <PlayerAvatar nickname={row.nickname} avatarUrl={row.avatarUrl} />
            <strong>{row.nickname}</strong>
            <p>{row.points} pts</p>
          </Link>
        ))}
      </section>

      <section className="ranking-list leaderboard-lower-list">
        {lowerStandings.length > 0 ? (
          lowerStandings.map((row) => (
            <Link key={row.playerId} to={`/joueurs/${row.playerId}`} className={`ranking-row ${samePlayerId(row.playerId, player?.id) ? 'is-me' : ''}`}>
              <span className="rank-number">{row.position}</span>
              <RankingMovementBadge movement={movements[row.playerId]} />
              <PlayerAvatar nickname={row.nickname} avatarUrl={row.avatarUrl} />
              <span className="ranking-player-summary">
                <strong>{row.nickname}</strong>
                <small>{row.exactScores} exacts · {row.correctResults} bons résultats</small>
              </span>
              <strong>{row.points} pts</strong>
            </Link>
          ))
        ) : (
          <div className="empty-state inline">
            <strong>Le podium contient tout le classement pour l'instant.</strong>
          </div>
        )}
      </section>

      <section className="section-block prize-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">À gagner</p>
            <h2>Lots du podium à gagner</h2>
          </div>
        </div>
        <PrizePanel />
      </section>

      <LeaderboardHistorySection
        periods={history.periods}
        currentPlayerId={player?.id}
        isFallback={history.isFallback}
        hasFrozenSnapshots={history.hasFrozenSnapshots}
      />
    </div>
  );
};

export default LeaderboardPage;
