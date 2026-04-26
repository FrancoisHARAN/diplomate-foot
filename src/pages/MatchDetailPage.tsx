import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PredictionForm from '../components/PredictionForm';
import MatchCard from '../components/MatchCard';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { matchService } from '../services/matchService';
import { predictionService } from '../services/predictionService';
import type { Match, Prediction } from '../types';
import { canEditPrediction } from '../utils/date';

const MatchDetailPage = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { player } = usePlayerSession();
  const [match, setMatch] = useState<Match | null>(null);
  const [prediction, setPrediction] = useState<Prediction | undefined>();
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!matchId) return;
      const found = await matchService.getById(matchId);
      setMatch(found ?? null);
      if (!player || !found) return;
      const playerPredictions = await predictionService.getPredictionsForPlayer(player.id);
      setPrediction(playerPredictions.find((item) => item.matchId === found.id));
    };
    void load();
  }, [matchId, player]);

  if (!match) return <section className="card">Match introuvable.</section>;

  const editable = canEditPrediction(match);

  return (
    <div className="stack">
      <Link className="back-link" to="/matchs">← Retour aux matchs</Link>
      <MatchCard match={match} prediction={prediction} />

      <section className="card stack-sm">
        <h1>Pronostiquer maintenant</h1>

        {!player ? (
          <div className="stack-sm">
            <p>Connectez-vous pour enregistrer ce pronostic.</p>
            <button className="btn" onClick={() => navigate('/connexion', { state: { from: location.pathname } })}>
              Se connecter
            </button>
          </div>
        ) : null}

        {player && editable ? (
          <PredictionForm
            match={match}
            initial={prediction}
            loading={saving}
            onSubmit={async (homeScore, awayScore) => {
              setSaving(true);
              await predictionService.savePrediction(player.id, match.id, homeScore, awayScore);
              const refreshed = await predictionService.getPredictionsForPlayer(player.id);
              setPrediction(refreshed.find((item) => item.matchId === match.id));
              setMessage('Pronostic enregistré ✅ Vous pouvez le modifier avant la clôture.');
              setSaving(false);
            }}
          />
        ) : null}

        {player && !editable && match.status !== 'finished' ? (
          <>
            <p>Les pronostics sont clôturés pour ce match.</p>
            {prediction ? <p>Ton prono : {prediction.homeScore} - {prediction.awayScore}</p> : null}
          </>
        ) : null}

        {player && match.status === 'finished' ? (
          <>
            <p>Score final : {match.homeScore} - {match.awayScore}</p>
            <p>Ton prono : {prediction ? `${prediction.homeScore} - ${prediction.awayScore}` : 'Aucun'}</p>
            <p>Points gagnés : {prediction ? predictionService.calculatePointsForPrediction(prediction, match) : 0} pts</p>
          </>
        ) : null}

        {message ? <p className="success-msg">{message}</p> : null}
      </section>
    </div>
  );
};

export default MatchDetailPage;
