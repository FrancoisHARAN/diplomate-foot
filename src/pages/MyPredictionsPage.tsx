import { Link } from 'react-router-dom';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { mockMatches } from '../data/mockMatches';
import { canEditPrediction } from '../utils/date';
import { getStoredPredictions, getUserPointsMock } from '../utils/appState';
import { calculatePredictionPoints } from '../utils/points';

const MyPredictionsPage = () => {
  const { player } = usePlayerSession();

  if (!player) {
    return (
      <section className="card stack-sm">
        <h1>Mes pronos</h1>
        <p>Connecte-toi pour voir tes pronos.</p>
        <Link className="btn full" to="/connexion">Connexion</Link>
      </section>
    );
  }

  const mine = getStoredPredictions().filter((p) => p.playerId === player.id);
  const map = new Map(mine.map((p) => [p.matchId, p]));
  const remaining = mockMatches.filter((m) => m.status !== 'finished' && !map.has(m.id)).length;

  return (
    <div className="stack">
      <section className="card stack-sm">
        <h1>Mes pronos</h1>
        <p>Points : {getUserPointsMock()} · Pronostics faits : {mine.length} · Matchs restants : {remaining}</p>
      </section>

      <section className="stack-sm">
        {mockMatches.filter((m) => map.has(m.id)).map((match) => {
          const prediction = map.get(match.id);
          const state = match.status === 'finished' ? 'terminé' : canEditPrediction(match) ? 'modifiable' : 'verrouillé';
          const points = prediction && match.status === 'finished' && typeof match.homeScore === 'number' && typeof match.awayScore === 'number'
            ? calculatePredictionPoints(prediction.homeScore, prediction.awayScore, match.homeScore, match.awayScore)
            : undefined;

          return (
            <article className="card stack-sm" key={match.id}>
              <strong>{match.homeTeam.name} vs {match.awayTeam.name}</strong>
              <p>Ton prono : {prediction?.homeScore} - {prediction?.awayScore}</p>
              <p>Statut : {state}</p>
              {typeof points === 'number' ? <p>Points : {points} pts</p> : null}
              <Link className="btn small" to={`/matchs/${match.id}`}>{state === 'modifiable' ? 'Modifier' : 'Voir match'}</Link>
            </article>
          );
        })}
      </section>
    </div>
  );
};

export default MyPredictionsPage;
