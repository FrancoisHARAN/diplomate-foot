import { useEffect, useMemo, useRef, useState, type FormEvent, type TouchEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import TeamBadge from '../components/TeamBadge';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { useLiveMatches } from '../hooks/useLiveMatches';
import { getPredictionForMatch, savePrediction } from '../utils/appState';
import { canEditPrediction, formatKickoffLong, formatTimeUntilKickoff } from '../utils/date';
import { calculatePredictionPointsForMatch, getMatchMultiplier } from '../utils/points';

const MatchDetailPage = () => {
  const { matchId } = useParams();
  const { player } = usePlayerSession();
  const { matches } = useLiveMatches();
  const navigate = useNavigate();
  const location = useLocation();
  const [refresh, setRefresh] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const match = matches.find((item) => item.id === matchId);
  const playableMatches = matches.filter((item) => item.status !== 'finished');
  const currentIndex = match ? playableMatches.findIndex((item) => item.id === match.id) : -1;
  const canStep = currentIndex >= 0 && playableMatches.length > 1;
  const nextMatch = canStep ? playableMatches[currentIndex + 1] ?? playableMatches[0] : null;
  const previousMatch = canStep ? playableMatches[currentIndex - 1] ?? playableMatches[playableMatches.length - 1] : null;
  const prediction = useMemo(() => (match ? getPredictionForMatch(match.id) : undefined), [match, refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (prediction) {
      setHomeScore(prediction.homeScore);
      setAwayScore(prediction.awayScore);
    } else {
      setHomeScore(0);
      setAwayScore(0);
    }
    setMessage('');
    setError('');
  }, [match?.id, prediction]);

  if (!match) {
    return (
      <section className="empty-state">
        <strong>Match introuvable</strong>
        <p>Ce match n'existe pas ou n'est plus disponible.</p>
        <Link className="btn secondary" to="/matchs">Retour aux matchs</Link>
      </section>
    );
  }

  const editable = canEditPrediction(match, new Date(clock)) && match.status === 'upcoming';
  const multiplier = getMatchMultiplier(match);
  const points =
    match.status === 'finished' && prediction && typeof match.homeScore === 'number' && typeof match.awayScore === 'number'
      ? calculatePredictionPointsForMatch(prediction.homeScore, prediction.awayScore, match)
      : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      savePrediction(match, homeScore, awayScore);
      setRefresh((value) => value + 1);
      setMessage('Ton prono a bien été pris en compte.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Impossible d'enregistrer ce prono.");
      setClock(Date.now());
    }
  };

  const updateScore = (team: 'home' | 'away', delta: number) => {
    const setter = team === 'home' ? setHomeScore : setAwayScore;
    setter((value) => Math.max(0, value + delta));
    setMessage('');
    setError('');
  };

  const navigateToMatch = (target: typeof match | null) => {
    if (!target) return;
    navigate(`/matchs/${target.id}`);
  };

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (!touchStart.current) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(deltaX) < 70 || Math.abs(deltaY) > 90) return;
    if (deltaX > 0) navigateToMatch(nextMatch);
    if (deltaX < 0) navigateToMatch(previousMatch);
  };

  return (
    <div className="screen-stack match-detail-screen" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <Link className="back-link" to="/matchs">Retour aux matchs</Link>

      <section className={`match-detail-card ${multiplier > 1 ? 'is-boosted' : ''}`}>
        <div className="match-detail-kickoff">
          <p className="eyebrow">Coup d'envoi</p>
          <h1>{formatKickoffLong(match.kickoff)}</h1>
          <span className={`mini-badge ${editable ? 'success' : ''}`}>{editable ? formatTimeUntilKickoff(match, new Date(clock)) : 'Prono fermé'}</span>
        </div>

        {multiplier > 1 ? (
          <div className="booster-panel">
            <strong>Boost x{multiplier}</strong>
            <span>Les points comptent x{multiplier} sur ce match.</span>
          </div>
        ) : null}

        <div className="match-detail-teams">
          <div className="detail-team">
            <TeamBadge team={match.homeTeam} competitionCode={match.competitionCode} />
            <strong>{match.homeTeam.name}</strong>
            <small>{match.homeTeam.shortName}</small>
          </div>
          <span className="detail-versus">{match.status === 'finished' || match.status === 'live' ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}` : 'VS'}</span>
          <div className="detail-team">
            <TeamBadge team={match.awayTeam} competitionCode={match.competitionCode} />
            <strong>{match.awayTeam.name}</strong>
            <small>{match.awayTeam.shortName}</small>
          </div>
        </div>

        {prediction ? (
          <div className="detail-current-prono">
            <span>Ton prono</span>
            <strong>{prediction.homeScore} - {prediction.awayScore}</strong>
            {points !== null ? <small>{points} pts</small> : <small>{editable ? 'Modifiable jusqu’au coup d’envoi' : 'Enregistré'}</small>}
          </div>
        ) : null}

        {!player ? (
          <div className="empty-state inline">
            <strong>Connecte-toi pour pronostiquer</strong>
            <p>Ton score sera gardé pour cette version de test.</p>
            <button className="btn primary" type="button" onClick={() => navigate('/connexion', { state: { redirectTo: location.pathname } })}>Connexion</button>
          </div>
        ) : null}

        {player && editable ? (
          <form className="score-form" onSubmit={submit}>
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Ton score</p>
                <h2>{prediction ? 'Modifier le prono' : 'Faire un prono'}</h2>
              </div>
            </div>

            <div className="score-editor">
              <div className="score-team">
                <strong>{match.homeTeam.name}</strong>
                <div className="score-stepper">
                  <button type="button" onClick={() => updateScore('home', -1)} aria-label={`Retirer un but à ${match.homeTeam.name}`}>-</button>
                  <input type="number" min={0} value={homeScore} onChange={(event) => setHomeScore(Math.max(0, Number(event.target.value)))} />
                  <button type="button" onClick={() => updateScore('home', 1)} aria-label={`Ajouter un but à ${match.homeTeam.name}`}>+</button>
                </div>
              </div>

              <span className="score-separator">-</span>

              <div className="score-team">
                <strong>{match.awayTeam.name}</strong>
                <div className="score-stepper">
                  <button type="button" onClick={() => updateScore('away', -1)} aria-label={`Retirer un but à ${match.awayTeam.name}`}>-</button>
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
        {error ? <p className="error-msg">{error}</p> : null}
      </section>

      <nav className="match-step-nav" aria-label="Navigation entre les matchs">
        <button className="btn ghost" type="button" disabled={!previousMatch} onClick={() => navigateToMatch(previousMatch)}>Match précédent</button>
        <button className="btn secondary" type="button" disabled={!nextMatch} onClick={() => navigateToMatch(nextMatch)}>Match suivant</button>
      </nav>
    </div>
  );
};

export default MatchDetailPage;
