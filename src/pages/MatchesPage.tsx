import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MatchCard from '../components/MatchCard';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { matchService } from '../services/matchService';
import { predictionService } from '../services/predictionService';
import type { Match, Prediction } from '../types';

const MatchesPage = () => {
  const navigate = useNavigate();
  const { player } = usePlayerSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const loadedMatches = await matchService.getAll();
        setMatches(loadedMatches);

        if (player) {
          const loadedPredictions = await predictionService.getPredictionsForPlayer(player.id);
          setPredictions(loadedPredictions);
        } else {
          setPredictions([]);
        }
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

  return (
    <section>
      <h2>Matchs</h2>
      {isLoading ? <p className="card">Chargement des matchs...</p> : null}
      {error ? <p className="card">⚠️ {error}</p> : null}
      {!player ? <p className="card">Connectez-vous pour enregistrer vos pronostics.</p> : null}

      <div className="grid">
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            prediction={predictionsByMatchId[match.id]}
            ctaLabel={player ? 'Voir mes pronos' : 'Connexion'}
            onPredict={() => navigate(player ? '/mes-pronos' : '/connexion')}
          />
        ))}
      </div>
    </section>
  );
};

export default MatchesPage;
