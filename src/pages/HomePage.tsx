import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FlashChallengeCard from '../components/FlashChallengeCard';
import MatchCard from '../components/MatchCard';
import PlayerAvatar from '../components/PlayerAvatar';
import PrizePanel from '../components/PrizePanel';
import RankingMovementBadge from '../components/RankingMovementBadge';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { mockPlayers } from '../data/mockPlayers';
import { useLiveMatches } from '../hooks/useLiveMatches';
import { useRankingMovements } from '../hooks/useRankingMovements';
import type { ExactPredictionHighlight, FlashChallenge, FlashPrediction, Match, WorldCupWinnerPrediction } from '../types';
import { buildStandings, fetchActiveFlashChallenges, fetchPlayerFlashPredictions, fetchRecentExactPredictionHighlights, fetchWorldCupWinnerPrediction, getFlashPredictionForChallenge, getPredictionsForPlayer, getStoredFlashPredictions, getStoredPredictions, getUserPointsMock, getUserRankMock, saveFlashPrediction, samePlayerId } from '../utils/appState';
import { canEditPrediction, isLiveDisplayMatch } from '../utils/date';
import { selectExactPredictionsForHomePage } from '../utils/exactPredictions';
import { shouldShowFlashOnHome } from '../utils/flashChallenges';
import { isMatchFinal } from '../utils/points';
import { getWorldCupTeamDisplayName, shouldShowMatchInApp } from '../utils/worldCupFilters';

const localDayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const dayKey = (iso: string) => localDayKey(new Date(iso));

const homeDayTitle = (iso: string) => {
  const date = new Date(iso);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((target - start) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Demain';
  if (diffDays === 2) return 'Après-demain';

  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }).format(date);
};

const groupHomeMatchesByDay = (matches: Match[]) => {
  const groups = new Map<string, Match[]>();
  matches.forEach((match) => {
    const key = dayKey(match.kickoff);
    groups.set(key, [...(groups.get(key) ?? []), match]);
  });
  return Array.from(groups.entries()).map(([key, items]) => ({ key, title: homeDayTitle(items[0].kickoff), matches: items }));
};

const selectHomeMatches = (matches: Match[]): Match[] => {
  const playableMatches = matches
    .filter((match) => !isMatchFinal(match) && shouldShowMatchInApp(match))
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
  const todayKey = localDayKey(new Date());
  const todayMatches = playableMatches.filter((match) => dayKey(match.kickoff) === todayKey);

  return todayMatches.length > 3 ? todayMatches : playableMatches.slice(0, 3);
};

const HomePage = () => {
  const { player } = usePlayerSession();
  const { matches } = useLiveMatches();
  const predictions = useMemo(() => getStoredPredictions(), [matches, player?.id]);
  const standings = useMemo(() => buildStandings(mockPlayers, predictions, matches), [matches, predictions]);
  const movements = useRankingMovements(standings);
  const [exactHighlights, setExactHighlights] = useState<ExactPredictionHighlight[]>([]);
  const [worldCupTop3, setWorldCupTop3] = useState<WorldCupWinnerPrediction | null>(null);
  const [flashChallenges, setFlashChallenges] = useState<FlashChallenge[]>([]);
  const [flashPredictions, setFlashPredictions] = useState<FlashPrediction[]>(getStoredFlashPredictions());
  const nextMatches = selectHomeMatches(matches);
  const nextMatchGroups = groupHomeMatchesByDay(nextMatches);
  const myMap = new Map(getPredictionsForPlayer(player?.id, predictions).map((prediction) => [prediction.matchId, prediction]));
  const visibleMatches = matches.filter(shouldShowMatchInApp);
  const openMatches = visibleMatches.filter((match) => match.status === 'upcoming' && canEditPrediction(match)).length;
  const liveMatches = visibleMatches.filter((match) => isLiveDisplayMatch(match)).length;
  const getFlashPrediction = (challenge: FlashChallenge) =>
    flashPredictions.find((item) => item.flashId === challenge.id) ?? getFlashPredictionForChallenge(challenge.id, player?.id);
  const unansweredFlashChallenges = player
    ? flashChallenges.filter((challenge) => shouldShowFlashOnHome(challenge, player.id, getFlashPrediction(challenge)))
    : [];

  useEffect(() => {
    let mounted = true;

    void fetchRecentExactPredictionHighlights(matches, predictions, standings).then((items) => {
      const visibleItems = items.filter((item) => shouldShowMatchInApp(item.match));
      if (mounted) setExactHighlights(selectExactPredictionsForHomePage(visibleItems));
    });

    return () => {
      mounted = false;
    };
  }, [matches, predictions, standings]);

  useEffect(() => {
    let mounted = true;

    void fetchWorldCupWinnerPrediction().then((prediction) => {
      if (mounted) setWorldCupTop3(prediction);
    });

    void fetchActiveFlashChallenges().then((challenges) => {
      if (mounted) setFlashChallenges(challenges);
    });

    void fetchPlayerFlashPredictions().then((items) => {
      if (mounted) setFlashPredictions(items);
    });

    return () => {
      mounted = false;
    };
  }, [player?.id]);

  const handleFlashAnswer = async (challenge: FlashChallenge, optionId: string) => {
    const prediction = await saveFlashPrediction(challenge, optionId);
    setFlashPredictions((items) => [
      ...items.filter((item) => !(samePlayerId(item.playerId, prediction.playerId) && item.flashId === prediction.flashId)),
      prediction,
    ]);
  };

  return (
    <div className="screen-stack">
      <section className="hero-panel">
        <div className="hero-content">
          <h1>Qui fera les meilleurs pronos&nbsp;?</h1>
          <p className="hero-copy">Grimpe au classement du bar des meilleurs pronostics.</p>
          <div className="hero-actions single">
            <Link className="btn secondary" to={player ? '/matchs' : '/connexion'}>{player ? 'Jouer mes matchs' : 'Se connecter'}</Link>
          </div>
        </div>
        <div className="hero-visuals" aria-hidden="true">
          <img className="hero-mascot" src={`${import.meta.env.BASE_URL}hero/mascotte.png`} alt="" />
        </div>
      </section>

      {!player ? (
        <section className="intro-panel">
          <strong>Entre dans la compétition</strong>
          <p>Connecte-toi avec ton pseudo, pronostique les matchs ouverts et marque des points dès le score final.</p>
        </section>
      ) : null}

      <section className="quick-stats" aria-label="Résumé de la compétition">
        <article>
          <small>Mon score</small>
          <strong>{player ? `${getUserPointsMock(matches)} pts` : 'Invité'}</strong>
        </article>
        <article>
          <small>Mon rang</small>
          <strong>{player ? `#${getUserRankMock(matches)}` : '-'}</strong>
        </article>
        <article>
          <small>Matchs ouverts</small>
          <strong>{openMatches}</strong>
        </article>
        <article>
          <small>Live</small>
          <strong>{liveMatches}</strong>
        </article>
      </section>

      {player && !worldCupTop3 ? (
        <section className="notice-panel top3-reminder-card">
          <span className="mini-badge danger">À compléter</span>
          <strong>Prédiction champion du monde à compléter</strong>
          <p>Choisis tes 3 favoris pour devenir champion du monde.</p>
          <Link className="btn primary" to="/mon-compte">Compléter mon top 3</Link>
        </section>
      ) : null}

      {unansweredFlashChallenges.length > 0 ? (
        <section className="flash-home-list">
          {unansweredFlashChallenges.map((challenge) => (
            <FlashChallengeCard
              key={challenge.id}
              challenge={challenge}
              player={player}
              prediction={getFlashPrediction(challenge)}
              onAnswer={handleFlashAnswer}
            />
          ))}
        </section>
      ) : null}

      <section className="section-block home-ranking-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">En direct</p>
            <h2>Classement du bar</h2>
          </div>
          <Link className="text-link" to="/classement">Voir tout</Link>
        </div>

        <div className="ranking-list compact">
          {standings.slice(0, 3).map((row) => (
            <Link key={row.playerId} to={`/joueurs/${row.playerId}`} className={`ranking-row ${samePlayerId(row.playerId, player?.id) ? 'is-me' : ''}`}>
              <span className="rank-number">{row.position}</span>
              <RankingMovementBadge movement={movements[row.playerId]} />
              <PlayerAvatar nickname={row.nickname} avatarUrl={row.avatarUrl} />
              <span className="ranking-player-summary">
                <strong>{row.nickname}</strong>
                <small>{row.exactScores} scores exacts</small>
              </span>
              <strong>{row.points} pts</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-block home-match-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">À jouer</p>
            <h2>Prochains matchs</h2>
          </div>
          <Link className="text-link" to="/matchs">Tous</Link>
        </div>
        <div className="home-match-groups">
          {nextMatchGroups.map((group) => (
            <section className="home-match-day" key={group.key}>
              <h3>{group.title}</h3>
              <div className="match-list">
                {group.matches.map((match) => <MatchCard key={match.id} match={match} prediction={myMap.get(match.id)} />)}
              </div>
            </section>
          ))}
        </div>
        <Link className="btn secondary home-match-cta" to="/matchs">Voir tous les matchs</Link>
      </section>

      <section className="section-block exact-history-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Historique</p>
            <h2>Pronos parfaits</h2>
            <p className="section-subtitle">Les joueurs qui ont trouvé le score exact.</p>
          </div>
        </div>

        <div className="exact-history-list">
          {exactHighlights.length > 0 ? (
            exactHighlights.map((highlight) => (
              <article className="exact-history-card" key={highlight.matchId}>
                <span className="exact-history-badge">Score exact 🎯</span>
                <strong>
                  {getWorldCupTeamDisplayName(highlight.match.homeTeam, highlight.match)} {highlight.match.homeScore} - {highlight.match.awayScore} {getWorldCupTeamDisplayName(highlight.match.awayTeam, highlight.match)}
                </strong>
                <small>{homeDayTitle(highlight.match.kickoff)}</small>
                <div className="exact-history-winners">
                  {highlight.winners.map((winner) => (
                    <Link className="exact-history-winner-link" key={`${highlight.matchId}-${winner.playerId}`} to={`/joueurs/${winner.playerId}`}>
                      {winner.nickname} — prono {winner.homeScore} - {winner.awayScore}
                    </Link>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state inline exact-history-empty">
              <strong>Aucun score exact pour le moment.</strong>
            </div>
          )}
        </div>
      </section>

      <section className="section-block prize-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">À gagner</p>
            <h2>Lots du podium</h2>
          </div>
        </div>
        <PrizePanel />
      </section>
    </div>
  );
};

export default HomePage;
