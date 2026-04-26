import { useState } from 'react';
import type { Prediction } from '../types';

const PredictionForm = ({
  initial,
  onSubmit,
  loading,
}: {
  initial?: Prediction;
  onSubmit: (homeScore: number, awayScore: number) => Promise<void>;
  loading: boolean;
}) => {
  const [home, setHome] = useState(initial?.homeScore ?? 0);
  const [away, setAway] = useState(initial?.awayScore ?? 0);

  return (
    <form
      className="stack"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit(home, away);
      }}
    >
      <label>
        Score équipe 1
        <input type="number" min={0} value={home} onChange={(event) => setHome(Number(event.target.value))} required />
      </label>
      <label>
        Score équipe 2
        <input type="number" min={0} value={away} onChange={(event) => setAway(Number(event.target.value))} required />
      </label>
      <button className="btn" type="submit" disabled={loading}>
        {loading ? 'Enregistrement...' : initial ? 'Modifier mon prono' : 'Valider mon prono'}
      </button>
    </form>
  );
};

export default PredictionForm;
