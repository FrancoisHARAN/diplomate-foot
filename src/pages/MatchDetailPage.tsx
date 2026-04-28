import { useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import MatchCard from '../components/MatchCard';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { mockMatches } from '../data/mockMatches';
import { canEditPrediction } from '../utils/date';
import { getPredictionForMatch, getStoredPredictions, savePrediction } from '../utils/appState';
import { calculatePredictionPoints } from '../utils/points';

const MatchDetailPage = () => {
  const { matchId } = useParams();
  const { player } = usePlayerSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [refresh, setRefresh] = useState(0);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [message, setMessage] = useState('');

  const match = mockMatches.find((m) => m.id === matchId);
  const prediction = useMemo(() => (match ? getPredictionForMatch(match.id) : undefined), [match, refresh]);

  if (!match) return <section className="card">Match introuvable.</section>;

  const editable = canEditPrediction(match) && match.status === 'upcoming';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    savePrediction(match.id, Number(homeScore), Number(awayScore));
    setRefresh((v) => v + 1);
    setMessage('Pronostic enregistré');
  };

  const points =
    match.status === 'finished' && prediction && typeof match.homeScore === 'number' && typeof match.awayScore === 'number'
      ? calculatePredictionPoints(prediction.homeScore, prediction.awayScore, match.homeScore, match.awayScore)
      : 0;

  return (
    <div className="stack">
      <Link className="back-link" to="/matchs">← Matchs</Link>
      <MatchCard match={match} prediction={prediction} variant="full" />

      <section className="card stack-sm">
        <h2>Ton pronostic</h2>

        {!player ? (
          <div className="stack-sm">
            <p>Connecte-toi pour pronostiquer ce match.</p>
            <button className="btn full" type="button" onClick={() => navigate('/connexion', { state: { redirectTo: location.pathname } })}>Connexion</button>
          </div>
        ) : null}

        {player && editable ? (
          <form className="stack-sm" onSubmit={submit}>
            <div className="score-row">
              <label>{match.homeTeam.name}<input type="number" min={0} required value={homeScore} onChange={(e) => setHomeScore(e.target.value)} /></label>
              <strong>-</strong>
              <label>{match.awayTeam.name}<input type="number" min={0} required value={awayScore} onChange={(e) => setAwayScore(e.target.value)} /></label>
            </div>
            <button className="btn full" type="submit">{prediction ? 'Modifier mon prono' : 'Valider mon prono'}</button>
          </form>
        ) : null}

        {player && !editable && match.status !== 'finished' ? (
          <>
            <p>Les pronostics sont fermés pour ce match.</p>
            <p>{prediction ? `Ton prono : ${prediction.homeScore} - ${prediction.awayScore}` : 'Aucun prono enregistré.'}</p>
          </>
        ) : null}

        {player && match.status === 'finished' ? (
          <>
            <p>Score final : {match.homeScore} - {match.awayScore}</p>
            <p>{prediction ? `Ton prono : ${prediction.homeScore} - ${prediction.awayScore}` : 'Aucun prono enregistré.'}</p>
            <p>Tes points : {points} pts</p>
          </>
        ) : null}

        {message ? <p className="success-msg">{message}</p> : null}
      </section>
    </div>
  );
};

export default MatchDetailPage;
