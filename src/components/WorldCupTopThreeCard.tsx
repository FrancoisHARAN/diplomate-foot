import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DeadlineBadge from './DeadlineBadge';
import { WORLD_CUP_TOP_THREE_LOCKS_AT, WORLD_CUP_WINNER_COUNTRIES, WORLD_CUP_WINNER_POINTS_BY_POSITION } from '../config/worldCupWinnerPredictions';
import type { CurrentPlayer } from '../utils/appState';
import { fetchWorldCupWinnerPrediction, saveWorldCupWinnerPrediction } from '../utils/appState';
import { isWorldCupTopThreeLocked } from '../utils/worldCupWinnerPredictions';

interface WorldCupTopThreeCardProps {
  player: CurrentPlayer | null;
  onSaved?: () => void;
}

const emptyChoices = ['', '', ''];

const WorldCupTopThreeCard = ({ player, onSaved }: WorldCupTopThreeCardProps) => {
  const [choices, setChoices] = useState<string[]>(emptyChoices);
  const [status, setStatus] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let mounted = true;
    if (!player) return undefined;

    void fetchWorldCupWinnerPrediction().then((prediction) => {
      if (!mounted || !prediction) return;
      setChoices([prediction.firstChoiceCode, prediction.secondChoiceCode, prediction.thirdChoiceCode]);
    });

    return () => {
      mounted = false;
    };
  }, [player?.id]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const duplicate = useMemo(() => choices.filter(Boolean).length !== new Set(choices.filter(Boolean)).size, [choices]);
  const complete = choices.every(Boolean) && !duplicate;
  const locked = isWorldCupTopThreeLocked(now);

  if (!player) {
    return (
      <section className="section-block worldcup-top3-card" id="top3-coupe-du-monde">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Prédiction champion du monde</p>
            <h2>Champion du monde</h2>
          </div>
        </div>
        <p className="section-subtitle">Connecte-toi pour choisir tes 3 favoris.</p>
        <Link className="btn primary" to="/connexion">Connexion</Link>
      </section>
    );
  }

  return (
    <section className="section-block worldcup-top3-card" id="top3-coupe-du-monde">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Top 3</p>
          <h2>Champion du monde</h2>
          <p className="section-subtitle">Choisis tes 3 favoris.</p>
        </div>
      </div>
      <div className="worldcup-top3-meta">
        <p>20 / 15 / 10 pts si le champion est dans ton top 3.</p>
        <DeadlineBadge deadline={WORLD_CUP_TOP_THREE_LOCKS_AT} closed={locked} closedLabel="Fermé" label="Clôture dans" />
      </div>

      <div className="worldcup-top3-list">
        {choices.map((choice, index) => {
          const selectedCountry = WORLD_CUP_WINNER_COUNTRIES.find((country) => country.code === choice);
          const takenByAnotherSlot = (code: string) => choices.some((item, itemIndex) => itemIndex !== index && item === code);

          return (
            <label className="worldcup-top3-row" key={`top3-${index + 1}`}>
              <span className="worldcup-top3-rank">{index + 1}</span>
              <select
                value={choice}
                disabled={locked}
                onChange={(event) => {
                  const next = [...choices];
                  next[index] = event.target.value;
                  setChoices(next);
                  setStatus('');
                }}
              >
                <option value="">Choisir un pays</option>
                {WORLD_CUP_WINNER_COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code} disabled={takenByAnotherSlot(country.code)}>
                    {country.name} · Groupe {country.group}
                  </option>
                ))}
              </select>
              <span className="worldcup-top3-points">+{WORLD_CUP_WINNER_POINTS_BY_POSITION[index]} pts si champion</span>
              {selectedCountry?.flagUrl ? <img src={selectedCountry.flagUrl} alt="" /> : null}
            </label>
          );
        })}
      </div>

      {duplicate ? <p className="form-error">Tu dois choisir 3 pays différents.</p> : null}
      {status ? <p className="form-success">{status}</p> : null}

      <button
        className="btn primary"
        type="button"
        disabled={!complete || saving || locked}
        onClick={async () => {
          setSaving(true);
          setStatus('');
          try {
            await saveWorldCupWinnerPrediction(choices[0], choices[1], choices[2]);
            setStatus('Top 3 enregistré.');
            onSaved?.();
          } catch (error) {
            setStatus(error instanceof Error ? error.message : 'Enregistrement impossible.');
          } finally {
            setSaving(false);
          }
        }}
      >
        {locked ? 'Prédiction verrouillée' : saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </section>
  );
};

export default WorldCupTopThreeCard;
