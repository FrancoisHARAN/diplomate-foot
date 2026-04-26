import { useState } from 'react';
import type { Match, Prediction } from '../types';

interface PredictionFormProps {
  match: Match;
  existing?: Prediction;
  onSave: (homeScore: number, awayScore: number) => void;
}

const PredictionForm = ({ match, existing, onSave }: PredictionFormProps) => {
  const [homeScore, setHomeScore] = useState<number>(existing?.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState<number>(existing?.awayScore ?? 0);

  return (
    <form
      className="card prediction-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(homeScore, awayScore);
      }}
    >
      <h3>Pronostic : {match.homeTeam.name} vs {match.awayTeam.name}</h3>
      <label>
        {match.homeTeam.name}
        <input type="number" min={0} value={homeScore} onChange={(event) => setHomeScore(Number(event.target.value))} />
      </label>
      <label>
        {match.awayTeam.name}
        <input type="number" min={0} value={awayScore} onChange={(event) => setAwayScore(Number(event.target.value))} />
      </label>
      <button type="submit" className="btn">Enregistrer</button>
    </form>
  );
};

export default PredictionForm;
