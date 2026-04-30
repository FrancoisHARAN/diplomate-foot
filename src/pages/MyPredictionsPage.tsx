import { useState } from 'react';
import { Link } from 'react-router-dom';
import MatchCard from '../components/MatchCard';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { useLiveMatches } from '../hooks/useLiveMatches';
import type { Match, Prediction } from '../types';
import { getPredictionsForPlayer, getUserPointsMock } from '../utils/appState';
import { canEditPrediction, isLiveDisplayMatch } from '../utils/date';
import { calculatePredictionPointsForMatch } from '../utils/points';

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

      {predictedMatches.length > 0 ? (
        filteredMatches.length > 0 ? (
          <section className="match-list">
            {filteredMatches.map((match) => (
              <MatchCard key={match.id} match={match} prediction={predictionByMatch.get(match.id)} />
            ))}
          </section>
        ) : (
          <section className="empty-state inline">
            <strong>Aucun prono dans ce filtre</strong>
            <p>Change de filtre pour retrouver tes autres matchs.</p>
          </section>
        )
      ) : (
        <section className="empty-state inline">
          <strong>Aucun prono pour l'instant</strong>
          <p>Va dans Matchs et choisis un bloc pour commencer.</p>
          <Link className="btn secondary" to="/matchs">Voir les matchs</Link>
        </section>
      )}

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
                    <strong>{match.homeTeam.shortName} - {match.awayTeam.shortName}</strong>
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
