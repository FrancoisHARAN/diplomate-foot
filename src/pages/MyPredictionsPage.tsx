import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { matchService } from '../services/matchService';
import { predictionService } from '../services/predictionService';
import type { Match, Prediction } from '../types';
import { canEditPrediction, formatKickoff, getMatchStatusLabel } from '../utils/date';

const MyPredictionsPage = () => {
  const { player } = usePlayerSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [points, setPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const loadedMatches = await matchService.getAll();
        setMatches(loadedMatches);

        if (!player) {
          setPredictions([]);
          setPoints(0);
          return;
        }

        const loadedPredictions = await predictionService.getPredictionsForPlayer(player.id);
        setPredictions(loadedPredictions);

        const nextPoints = loadedPredictions.reduce((total, prediction) => {
          const match = loadedMatches.find((item) => item.id === prediction.matchId);
          if (!match) return total;
          return total + predictionService.calculatePointsForPrediction(prediction, match);
        }, 0);
        setPoints(nextPoints);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Chargement impossible.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [player]);

  const predictionsByMatchId = useMemo(
    () => Object.fromEntries(predictions.map((prediction) => [prediction.matchId, prediction])),
    [predictions],
  );

  if (!player) {
    return (
      <section className="card">
        <h2>Mes pronos</h2>
        <p>Connecte-toi pour voir tes pronostics.</p>
        <Link className="btn" to="/connexion">
          Connexion
        </Link>
      </section>
    );
  }

  return (
    <section className="card my-predictions-card">
      <h2>Mes pronos</h2>
      <p>
        Joueur : <strong>{player.nickname}</strong>
      </p>
      <p>
        Total de points : <strong>{points}</strong>
      </p>

      {isLoading ? <p>Chargement des pronostics...</p> : null}
      {error ? <p>⚠️ {error}</p> : null}
      {feedback ? <p>{feedback}</p> : null}

      <div className="my-predictions-list">
        {matches.map((match) => {
          const existing = predictionsByMatchId[match.id];
          const isOpen = canEditPrediction(match);

          return (
            <article key={match.id} className="card prediction-row">
              <h3>
                {match.homeTeam.name} vs {match.awayTeam.name}
              </h3>
              <p>{formatKickoff(match.kickoff)}</p>
              <p>Statut : {getMatchStatusLabel(match.status)}</p>
              <p>
                Ton prono : {existing ? `${existing.homeScore} - ${existing.awayScore}` : 'Aucun'}
              </p>

              {match.status === 'finished' ? (
                <>
                  <p>
                    Score réel : {match.homeScore} - {match.awayScore}
                  </p>
                  <p>Points gagnés : {existing ? predictionService.calculatePointsForPrediction(existing, match) : 0}</p>
                </>
              ) : null}

              {isOpen ? (
                <form
                  className="inline-score-form"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    const homeScore = Number(formData.get('homeScore'));
                    const awayScore = Number(formData.get('awayScore'));

                    setIsSaving(match.id);
                    setError(null);
                    setFeedback(null);

                    try {
                      await predictionService.savePrediction(player.id, match.id, homeScore, awayScore);
                      const refreshed = await predictionService.getPredictionsForPlayer(player.id);
                      setPredictions(refreshed);
                      const nextPoints = refreshed.reduce((total, prediction) => {
                        const linkedMatch = matches.find((item) => item.id === prediction.matchId);
                        if (!linkedMatch) return total;
                        return total + predictionService.calculatePointsForPrediction(prediction, linkedMatch);
                      }, 0);
                      setPoints(nextPoints);
                      setFeedback('Pronostic enregistré');
                    } catch (saveError) {
                      setError(saveError instanceof Error ? saveError.message : 'Enregistrement impossible.');
                    } finally {
                      setIsSaving(null);
                    }
                  }}
                >
                  <label>
                    {match.homeTeam.shortName}
                    <input name="homeScore" type="number" min={0} defaultValue={existing?.homeScore ?? 0} required />
                  </label>
                  <label>
                    {match.awayTeam.shortName}
                    <input name="awayScore" type="number" min={0} defaultValue={existing?.awayScore ?? 0} required />
                  </label>
                  <button className="btn" type="submit" disabled={isSaving === match.id}>
                    {isSaving === match.id ? 'Enregistrement...' : existing ? 'Modifier mon prono' : 'Enregistrer mon prono'}
                  </button>
                </form>
              ) : (
                <p className="locked">Pronostic verrouillé</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default MyPredictionsPage;
