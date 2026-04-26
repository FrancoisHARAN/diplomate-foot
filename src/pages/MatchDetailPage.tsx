import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PredictionForm from '../components/PredictionForm';
import MatchStatusBadge from '../components/MatchStatusBadge';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { matchService } from '../services/matchService';
import { predictionService } from '../services/predictionService';
import type { Match, Prediction } from '../types';
import { canEditPrediction, formatKickoff } from '../utils/date';

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
      <Link className="btn secondary" to="/matchs">← Retour aux matchs</Link>
      <section className="card">
        <h1>{match.homeTeam.name} vs {match.awayTeam.name}</h1>
        <p>{formatKickoff(match.kickoff)}</p>
        <MatchStatusBadge status={match.status} />
        {match.status === 'finished' ? <p>Score final : {match.homeScore} - {match.awayScore}</p> : null}
      </section>

      <section className="card">
        {!player ? (
          <>
            <p>Connecte-toi pour pronostiquer ce match.</p>
            <button
              className="btn"
              onClick={() => navigate('/connexion', { state: { from: location.pathname } })}
            >
              Se connecter
            </button>
          </>
        ) : null}

        {player && editable ? (
          <>
            <h2>Ton pronostic</h2>
            <PredictionForm
              initial={prediction}
              loading={saving}
              onSubmit={async (homeScore, awayScore) => {
                setSaving(true);
                await predictionService.savePrediction(player.id, match.id, homeScore, awayScore);
                const refreshed = await predictionService.getPredictionsForPlayer(player.id);
                setPrediction(refreshed.find((item) => item.matchId === match.id));
                setMessage('Pronostic enregistré');
                setSaving(false);
              }}
            />
          </>
        ) : null}

        {player && !editable && match.status !== 'finished' ? (
          <>
            <p>Les pronostics sont fermés pour ce match.</p>
            {prediction ? <p>Ton prono : {prediction.homeScore} - {prediction.awayScore}</p> : null}
          </>
        ) : null}

        {player && match.status === 'finished' ? (
          <>
            <p>Ton prono : {prediction ? `${prediction.homeScore} - ${prediction.awayScore}` : 'Aucun'}</p>
            <p>Points gagnés : {prediction ? predictionService.calculatePointsForPrediction(prediction, match) : 0} pts</p>
          </>
        ) : null}

        {message ? <p>{message}</p> : null}
      </section>
    </div>
  );
};

export default MatchDetailPage;
