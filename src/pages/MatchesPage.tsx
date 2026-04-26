import { useMemo, useState } from 'react';
import MatchCard from '../components/MatchCard';
import PredictionForm from '../components/PredictionForm';
import { matchService } from '../services/matchService';
import { playerService } from '../services/playerService';
import { predictionService } from '../services/predictionService';
import type { Match } from '../types';

const MatchesPage = () => {
  const matches = matchService.list();
  const player = playerService.getCurrent();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const existingPredictions = useMemo(() => {
    if (!player) return [];
    return predictionService.listByPlayer(player.id);
  }, [player, refreshToken]);

  return (
    <section>
      <h2>Matchs</h2>
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
          onSave={(homeScore, awayScore) => {
            predictionService.upsert({
              matchId: selectedMatch.id,
              playerId: player.id,
              homeScore,
              awayScore,
            });
            setSelectedMatch(null);
            setRefreshToken((value) => value + 1);
          }}
        />
      ) : null}
    </section>
  );
};

export default MatchesPage;
