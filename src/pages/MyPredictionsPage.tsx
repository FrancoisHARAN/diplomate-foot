import { Link } from 'react-router-dom';
import MatchCard from '../components/MatchCard';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { useLiveMatches } from '../hooks/useLiveMatches';
import { getStoredPredictions, getUserPointsMock } from '../utils/appState';
import { canEditPrediction } from '../utils/date';
import { calculatePredictionPoints } from '../utils/points';

const MyPredictionsPage = () => {
  const { player } = usePlayerSession();
  const { matches } = useLiveMatches();

  if (!player) {
    return (
      <section className="empty-state">
        <strong>Mes pronos</strong>
        <p>Connecte-toi pour retrouver tes scores enregistrés.</p>
        <Link className="btn primary" to="/connexion">Connexion</Link>
      </section>
    );
  }

  const mine = getStoredPredictions().filter((prediction) => prediction.playerId === player.id);
  const predictionByMatch = new Map(mine.map((prediction) => [prediction.matchId, prediction]));
  const remaining = matches.filter((match) => match.status !== 'finished' && !predictionByMatch.has(match.id)).length;
  const predictedMatches = matches.filter((match) => predictionByMatch.has(match.id));

  return (
    <div className="screen-stack">
      <section className="page-hero">
        <p className="eyebrow">Espace joueur</p>
        <h1>Mes pronos</h1>
        <p>{getUserPointsMock(matches)} pts · {mine.length} pronostics faits · {remaining} matchs restants</p>
      </section>

      {predictedMatches.length > 0 ? (
        <section className="match-list">
          {predictedMatches.map((match) => {
            const prediction = predictionByMatch.get(match.id);
            return <MatchCard key={match.id} match={match} prediction={prediction} />;
          })}
        </section>
      ) : (
        <section className="empty-state inline">
          <strong>Aucun prono pour l’instant</strong>
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
          {predictedMatches.map((match) => {
            const prediction = predictionByMatch.get(match.id);
            const state = match.status === 'finished' ? 'Terminé' : canEditPrediction(match) ? 'Modifiable' : 'Verrouillé';
            const points =
              prediction && match.status === 'finished' && typeof match.homeScore === 'number' && typeof match.awayScore === 'number'
                ? calculatePredictionPoints(prediction.homeScore, prediction.awayScore, match.homeScore, match.awayScore)
                : null;

            return (
              <Link className="prediction-row" key={match.id} to={`/matchs/${match.id}`}>
                <span>
                  <strong>{match.homeTeam.shortName} - {match.awayTeam.shortName}</strong>
                  <small>{state}</small>
                </span>
                <span>{prediction?.homeScore} - {prediction?.awayScore}</span>
                <strong>{points !== null ? `${points} pts` : 'À venir'}</strong>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default MyPredictionsPage;
