import { useEffect, useMemo, useState } from 'react';
import MatchCard from '../components/MatchCard';
import PredictionForm from '../components/PredictionForm';
import { matchService } from '../services/matchService';
import { playerService } from '../services/playerService';
import { predictionService } from '../services/predictionService';
import type { Match, Prediction } from '../types';

const MatchesPage = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [player] = useState(playerService.getCurrentPlayer());
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loadedMatches = await matchService.getAll();
      setMatches(loadedMatches);

      if (player) {
        const loadedPredictions = await predictionService.getPredictionsForPlayer(player.id);
        setPredictions(loadedPredictions);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Chargement impossible.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.id]);

  const existingPredictions = useMemo(() => predictions, [predictions]);

  return (
    <section>
      <h2>Matchs</h2>
      {isLoading ? <p className="card">Chargement des matchs...</p> : null}
      {error ? <p className="card">⚠️ {error}</p> : null}
      {!player ? <p className="card">Connectez-vous pour enregistrer vos pronostics.</p> : null}

      <div className="grid">
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} onPredict={setSelectedMatch} />
        ))}
      </div>

      {selectedMatch && player ? (
        <PredictionForm
          match={selectedMatch}
          existing={existingPredictions.find((prediction) => prediction.matchId === selectedMatch.id)}
          onSave={async (homeScore, awayScore) => {
            setIsSaving(true);
            setError(null);

            try {
              await predictionService.savePrediction(player.id, selectedMatch.id, homeScore, awayScore);
              await load();
              setSelectedMatch(null);
            } catch (saveError) {
              setError(saveError instanceof Error ? saveError.message : 'Enregistrement impossible.');
            } finally {
              setIsSaving(false);
            }
          }}
        />
      ) : null}

      {isSaving ? <p className="card">Enregistrement du pronostic...</p> : null}
    </section>
  );
};

export default MatchesPage;
