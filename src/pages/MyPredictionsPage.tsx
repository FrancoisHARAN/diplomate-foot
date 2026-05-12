import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FlashChallengeCard from '../components/FlashChallengeCard';
import MatchCard from '../components/MatchCard';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { useLiveMatches } from '../hooks/useLiveMatches';
import type { FlashChallenge, FlashPrediction, Match, Prediction } from '../types';
import { fetchPlayerFlashPredictions, getFlashPredictionsForPlayer, getPredictionsForPlayer, getStoredFlashChallenges, getUserPointsMock, saveFlashPrediction, samePlayerId } from '../utils/appState';
import { canEditPrediction, isLiveDisplayMatch } from '../utils/date';
import { flashMatchesPredictionFilter, isFlashChallengeOpen } from '../utils/flashChallenges';
import { calculatePredictionPointsForMatch } from '../utils/points';
import { getWorldCupTeamDisplayName } from '../utils/worldCupFilters';

type PredictionFilter = 'all' | 'live' | 'finished' | 'upcoming' | 'won' | 'lost';

const predictionFilters: Array<{ id: PredictionFilter; label: string }> = [
  { id: 'all', label: 'Matchs' },
  { id: 'live', label: 'Live' },
  { id: 'finished', label: 'Terminés' },
  { id: 'upcoming', label: 'À venir' },
  { id: 'won', label: 'Gagnés' },
  { id: 'lost', label: 'Perdus' },
];

const getFinishedPoints = (prediction: Prediction | undefined, match: Match): number | null => {
  if (!prediction || match.status !== 'finished' || typeof match.homeScore !== 'number' || typeof match.awayScore !== 'number') return null;
  return calculatePredictionPointsForMatch(prediction.homeScore, prediction.awayScore, match);
};

const sortByTemporalProximity = (now: number) => (left: Match, right: Match): number => {
  const leftLive = isLiveDisplayMatch(left);
  const rightLive = isLiveDisplayMatch(right);
  if (leftLive !== rightLive) return leftLive ? -1 : 1;

  const leftDistance = Math.abs(new Date(left.kickoff).getTime() - now);
  const rightDistance = Math.abs(new Date(right.kickoff).getTime() - now);
  return leftDistance - rightDistance;
};

const MyPredictionsPage = () => {
  const { player } = usePlayerSession();
  const { matches } = useLiveMatches();
  const [filter, setFilter] = useState<PredictionFilter>('all');
  const [flashPredictions, setFlashPredictions] = useState<FlashPrediction[]>([]);
  const [flashChallenges, setFlashChallenges] = useState<FlashChallenge[]>(getStoredFlashChallenges());

  useEffect(() => {
    let mounted = true;
    void fetchPlayerFlashPredictions().then((items) => {
      if (!mounted) return;
      setFlashPredictions(items);
      setFlashChallenges(getStoredFlashChallenges());
    });
    return () => {
      mounted = false;
    };
  }, [player?.id]);

  if (!player) {
    return (
      <section className="empty-state">
        <strong>Mes pronos</strong>
        <p>Connecte-toi pour retrouver tes scores enregistrés.</p>
        <Link className="btn primary" to="/connexion">Connexion</Link>
      </section>
    );
  }

  const mine = getPredictionsForPlayer(player.id);
  const predictionByMatch = new Map(mine.map((prediction) => [prediction.matchId, prediction]));
  const remaining = matches.filter((match) => match.status !== 'finished' && !predictionByMatch.has(match.id)).length;
  const now = Date.now();
  const flashChallengeById = new Map(flashChallenges.map((challenge) => [challenge.id, challenge]));
  const myFlashRows = flashPredictions
    .filter((prediction) => prediction.playerId === player.id || getFlashPredictionsForPlayer(player.id).some((item) => item.id === prediction.id))
    .map((prediction) => ({ prediction, challenge: flashChallengeById.get(prediction.flashId) }))
    .filter((item): item is { prediction: FlashPrediction; challenge: FlashChallenge } => Boolean(item.challenge))
    .sort((left, right) => {
      const leftOpen = isFlashChallengeOpen(left.challenge);
      const rightOpen = isFlashChallengeOpen(right.challenge);
      if (leftOpen !== rightOpen) return leftOpen ? -1 : 1;
      return new Date(left.challenge.closesAt).getTime() - new Date(right.challenge.closesAt).getTime();
    });
  const filteredFlashRows = myFlashRows.filter(({ challenge, prediction }) => flashMatchesPredictionFilter(filter, challenge, prediction));
  const predictedMatches = matches
    .filter((match) => predictionByMatch.has(match.id))
    .sort(sortByTemporalProximity(now));
  const filteredMatches = predictedMatches.filter((match) => {
    const prediction = predictionByMatch.get(match.id);
    const points = getFinishedPoints(prediction, match);

    if (filter === 'live') return isLiveDisplayMatch(match);
    if (filter === 'finished') return match.status === 'finished';
    if (filter === 'upcoming') return match.status !== 'finished' && !isLiveDisplayMatch(match);
    if (filter === 'won') return points !== null && points > 0;
    if (filter === 'lost') return points !== null && points === 0;
    return true;
  });

  const handleFlashAnswer = async (challenge: FlashChallenge, optionId: string) => {
    const prediction = await saveFlashPrediction(challenge, optionId);
    setFlashPredictions((items) => [
      ...items.filter((item) => !(samePlayerId(item.playerId, prediction.playerId) && item.flashId === prediction.flashId)),
      prediction,
    ]);
    setFlashChallenges(getStoredFlashChallenges());
  };

  return (
    <div className="screen-stack">
      <section className="page-hero">
        <p className="eyebrow">Espace joueur</p>
        <h1>Mes pronos</h1>
        <p>{getUserPointsMock(matches)} pts · {mine.length} pronostics faits · {remaining} matchs restants</p>
      </section>

      <div className="filter-row my-pronos-filters" role="tablist" aria-label="Filtres de mes pronos">
        {predictionFilters.map((item) => (
          <button key={item.id} type="button" className={`pill ${filter === item.id ? 'active' : ''}`} onClick={() => setFilter(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      {filteredFlashRows.length > 0 ? (
        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Priorité</p>
              <h2>Flashs</h2>
            </div>
          </div>
          <div className="flash-history-list">
            {filteredFlashRows.map(({ challenge, prediction }) => (
              <FlashChallengeCard
                key={`${challenge.id}-${prediction.id}`}
                challenge={challenge}
                player={player}
                prediction={prediction}
                onAnswer={handleFlashAnswer}
                compact
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section-block my-pronos-match-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Classiques</p>
            <h2>Matchs</h2>
          </div>
        </div>

        {predictedMatches.length > 0 ? (
          filteredMatches.length > 0 ? (
            <div className="match-list">
              {filteredMatches.map((match) => (
                <MatchCard key={match.id} match={match} prediction={predictionByMatch.get(match.id)} />
              ))}
            </div>
          ) : (
            <div className="empty-state inline">
              <strong>Aucun prono dans ce filtre</strong>
              <p>Change de filtre pour retrouver tes autres matchs.</p>
            </div>
          )
        ) : (
          <div className="empty-state inline">
            <strong>Aucun prono pour l'instant</strong>
            <p>Va dans Matchs et choisis un bloc pour commencer.</p>
            <Link className="btn secondary" to="/matchs">Voir les matchs</Link>
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Détail</p>
            <h2>Suivi des points</h2>
          </div>
        </div>
        <div className="prediction-list">
          {filteredMatches.length > 0 ? (
            filteredMatches.map((match) => {
              const prediction = predictionByMatch.get(match.id);
              const editable = canEditPrediction(match);
              const state = match.status === 'finished' ? 'Terminé' : editable ? 'Modifiable' : 'Verrouillé';
              const points = getFinishedPoints(prediction, match);

              return (
                <Link className="prediction-row" key={match.id} to={`/matchs/${match.id}`}>
                  <span>
                    <strong>{getWorldCupTeamDisplayName(match.homeTeam, match)} - {getWorldCupTeamDisplayName(match.awayTeam, match)}</strong>
                    <small>{state}</small>
                  </span>
                  <span className="prediction-score-chip">{prediction?.homeScore} - {prediction?.awayScore}</span>
                  <strong>{points !== null ? `${points} pts` : 'À venir'}</strong>
                  {editable ? <span className="edit-pencil" aria-label="Modifier le prono">✎</span> : null}
                </Link>
              );
            })
          ) : (
            <div className="empty-state inline">
              <strong>Aucun détail à afficher</strong>
              <p>Les lignes de suivi reviennent dès qu'un prono correspond au filtre.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default MyPredictionsPage;
