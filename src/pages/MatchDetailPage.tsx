import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import MatchCard from '../components/MatchCard';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { mockMatches } from '../data/mockMatches';
import { getPredictionForMatch, savePrediction } from '../utils/appState';
import { canEditPrediction, formatKickoff, getMinutesBeforeLock } from '../utils/date';
import { calculatePredictionPoints } from '../utils/points';

const MatchDetailPage = () => {
  const { matchId } = useParams();
  const { player } = usePlayerSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [refresh, setRefresh] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [message, setMessage] = useState('');

  const match = mockMatches.find((item) => item.id === matchId);
  const prediction = useMemo(() => (match ? getPredictionForMatch(match.id) : undefined), [match, refresh]);

  useEffect(() => {
    if (prediction) {
      setHomeScore(prediction.homeScore);
      setAwayScore(prediction.awayScore);
    }
  }, [prediction]);

  if (!match) {
    return (
      <section className="empty-state">
        <strong>Match introuvable</strong>
        <p>Ce match n’existe pas ou n’est plus disponible.</p>
        <Link className="btn secondary" to="/matchs">Retour aux matchs</Link>
      </section>
    );
  }

  const editable = canEditPrediction(match) && match.status === 'upcoming';
  const points =
    match.status === 'finished' && prediction && typeof match.homeScore === 'number' && typeof match.awayScore === 'number'
      ? calculatePredictionPoints(prediction.homeScore, prediction.awayScore, match.homeScore, match.awayScore)
      : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    savePrediction(match.id, homeScore, awayScore);
    setRefresh((value) => value + 1);
    setMessage('Pronostic enregistré');
  };

  const updateScore = (team: 'home' | 'away', delta: number) => {
    const setter = team === 'home' ? setHomeScore : setAwayScore;
    setter((value) => Math.max(0, value + delta));
    setMessage('');
  };

  return (
    <div className="screen-stack">
      <Link className="back-link" to="/matchs">Retour aux matchs</Link>

      <MatchCard match={match} prediction={prediction} variant="compact" />

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Coup d’envoi</p>
            <h1>{formatKickoff(match.kickoff)}</h1>
          </div>
          <span className="mini-badge">{editable ? `${getMinutesBeforeLock(match)} min avant verrouillage` : 'Prono fermé'}</span>
        </div>
      </section>

      <section className="prediction-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Ton score</p>
            <h2>{prediction ? 'Modifier le prono' : 'Faire un prono'}</h2>
          </div>
          {prediction ? <span className="mini-badge success">Déjà joué</span> : null}
        </div>

        {!player ? (
          <div className="empty-state inline">
            <strong>Connecte-toi pour pronostiquer</strong>
            <p>Ton score sera ensuite gardé en localStorage pour cette version MVP.</p>
            <button className="btn primary" type="button" onClick={() => navigate('/connexion', { state: { redirectTo: location.pathname } })}>Connexion</button>
          </div>
        ) : null}

        {player && editable ? (
          <form className="score-form" onSubmit={submit}>
            <div className="score-editor">
              <div className="score-team">
                <strong>{match.homeTeam.name}</strong>
                <div className="score-stepper">
                  <button type="button" onClick={() => updateScore('home', -1)} aria-label={`Retirer un but à ${match.homeTeam.name}`}>−</button>
                  <input type="number" min={0} value={homeScore} onChange={(event) => setHomeScore(Math.max(0, Number(event.target.value)))} />
                  <button type="button" onClick={() => updateScore('home', 1)} aria-label={`Ajouter un but à ${match.homeTeam.name}`}>+</button>
                </div>
              </div>

              <span className="score-separator">-</span>

              <div className="score-team">
                <strong>{match.awayTeam.name}</strong>
                <div className="score-stepper">
                  <button type="button" onClick={() => updateScore('away', -1)} aria-label={`Retirer un but à ${match.awayTeam.name}`}>−</button>
                  <input type="number" min={0} value={awayScore} onChange={(event) => setAwayScore(Math.max(0, Number(event.target.value)))} />
                  <button type="button" onClick={() => updateScore('away', 1)} aria-label={`Ajouter un but à ${match.awayTeam.name}`}>+</button>
                </div>
              </div>
            </div>

            <button className="btn primary" type="submit">{prediction ? 'Enregistrer la modification' : 'Valider mon prono'}</button>
          </form>
        ) : null}

        {player && !editable ? (
          <div className="locked-summary">
            <strong>{match.status === 'finished' ? 'Match terminé' : 'Pronostics verrouillés'}</strong>
            <p>{prediction ? `Ton prono : ${prediction.homeScore} - ${prediction.awayScore}` : 'Aucun prono enregistré.'}</p>
            {match.status === 'finished' ? <p>Score final : {match.homeScore} - {match.awayScore}</p> : null}
            {points !== null ? <p>Points gagnés : {points} pts</p> : null}
          </div>
        ) : null}

        {message ? <p className="success-msg">{message}</p> : null}
      </section>
    </div>
  );
};

export default MatchDetailPage;
