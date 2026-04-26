import { useEffect, useState } from 'react';
import type { Match, Prediction } from '../types';

const PredictionForm = ({
  match,
  initial,
  onSubmit,
  loading,
}: {
  match: Match;
  initial?: Prediction;
  onSubmit: (homeScore: number, awayScore: number) => Promise<void>;
  loading: boolean;
}) => {
  const [home, setHome] = useState(initial?.homeScore ?? 0);
  const [away, setAway] = useState(initial?.awayScore ?? 0);

  useEffect(() => {
    setHome(initial?.homeScore ?? 0);
    setAway(initial?.awayScore ?? 0);
  }, [initial?.homeScore, initial?.awayScore]);

  return (
    <form
      className="stack-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit(home, away);
      }}
    >
      <div className="score-row">
        <label>
          {match.homeTeam.name}
          <input type="number" min={0} value={home} onChange={(event) => setHome(Number(event.target.value))} required />
        </label>
        <span>-</span>
        <label>
          {match.awayTeam.name}
          <input type="number" min={0} value={away} onChange={(event) => setAway(Number(event.target.value))} required />
        </label>
      </div>
      <button className="btn" type="submit" disabled={loading}>
        {loading ? 'Enregistrement...' : initial ? 'Modifier mon prono' : 'Valider mon prono'}
      </button>
    </form>
  );
};

export default PredictionForm;
