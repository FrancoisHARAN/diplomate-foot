import type { Match, Prediction } from '../types';
import { canEditPrediction } from '../utils/date';

interface PlayerSummaryProps {
  nickname: string;
  points: number;
  predictions: Prediction[];
  matchesById: Record<string, Match>;
  onLogout: () => void;
}

const PlayerSummary = ({ nickname, points, predictions, matchesById, onLogout }: PlayerSummaryProps) => (
  <section className="card">
    <h2>Espace joueur</h2>
    <p>Résumé joueur fictif : <strong>{nickname}</strong></p>
    <p><strong>Points :</strong> {points}</p>
    <h3>Pronostics fictifs</h3>
    {predictions.length === 0 ? <p>Aucun pronostic pour le moment.</p> : null}
    <ul className="prediction-list">
      {predictions.map((prediction) => {
        const match = matchesById[prediction.matchId];
        const state = match.status === 'finished' ? 'terminé' : canEditPrediction(match) ? 'ouvert' : 'verrouillé';

        return (
          <li key={prediction.id}>
            {match.homeTeam.name} {prediction.homeScore} - {prediction.awayScore} {match.awayTeam.name} · <em>{state}</em>
          </li>
        );
      })}
    </ul>
    <button type="button" className="btn secondary" onClick={onLogout}>Déconnexion</button>
  </section>
);

export default PlayerSummary;
