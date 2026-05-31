import { useEffect, useMemo, useRef, useState, type FormEvent, type TouchEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import DeadlineBadge from '../components/DeadlineBadge';
import MatchPublicPredictionsSection from '../components/MatchPublicPredictionsSection';
import TeamBadge from '../components/TeamBadge';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { useLiveMatches } from '../hooks/useLiveMatches';
import type { Match, PredictionResultType } from '../types';
import { getPredictionForMatch, savePrediction } from '../utils/appState';
import { canEditPrediction, formatKickoffLong, formatLastUpdated, isLiveDisplayMatch } from '../utils/date';
import { calculatePredictionPointsForMatch, getMatchMultiplier, getPredictionResultTypeForMatch, isMatchFinal } from '../utils/points';
import { getWorldCupBoostLabel, getWorldCupTeamDisplayName, getWorldCupTeamShortCode, shouldShowMatchInApp } from '../utils/worldCupFilters';

const SWIPE_HINT_KEY = 'diplomate.matchSwipeHintSeen.v1';

const predictionResultLabels: Record<PredictionResultType, string> = {
  exact: 'score exact',
  'two-point': 'bon écart',
  winner: 'bon gagnant',
  draw: 'bon nul',
  lost: 'perdu',
  pending: 'en attente',
};

const formatPredictionPointsLabel = (points: number, resultType: PredictionResultType): string => {
  const unit = points > 1 ? 'pts' : 'pt';
  return `${points} ${unit} (${predictionResultLabels[resultType]})`;
};

const MatchDetailPage = () => {
  const { matchId } = useParams();
  const { player } = usePlayerSession();
  const { matches, lastDataChangedAt } = useLiveMatches();
  const navigate = useNavigate();
  const location = useLocation();
  const [refresh, setRefresh] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const dirtyRef = useRef(false);
  const latestDraft = useRef<{
    match: Match | null;
    homeScore: number;
    awayScore: number;
    playerReady: boolean;
    editable: boolean;
  }>({ match: null, homeScore: 0, awayScore: 0, playerReady: false, editable: false });
  const persistDraftRef = useRef<(silent?: boolean) => Promise<boolean>>(async () => true);

  const match = matches.find((item) => item.id === matchId);
  const playableMatches = useMemo(
    () =>
      matches
        .filter((item) => !isMatchFinal(item) && shouldShowMatchInApp(item))
        .sort((left, right) => new Date(left.kickoff).getTime() - new Date(right.kickoff).getTime()),
    [matches],
  );
  const currentIndex = match ? playableMatches.findIndex((item) => item.id === match.id) : -1;
  const canStep = currentIndex >= 0 && playableMatches.length > 1;
  const nextMatch = canStep ? playableMatches[currentIndex + 1] ?? null : null;
  const previousMatch = canStep ? playableMatches[currentIndex - 1] ?? null : null;
  const prediction = useMemo(() => (match ? getPredictionForMatch(match.id) : undefined), [match, refresh]);
  const editable = Boolean(match && canEditPrediction(match, new Date(clock)) && match.status === 'upcoming');

  const persistDraft = async (silent = true): Promise<boolean> => {
    const draft = latestDraft.current;
    if (!dirtyRef.current || !draft.match || !draft.playerReady || !draft.editable) return true;

    try {
      await savePrediction(draft.match, draft.homeScore, draft.awayScore);
      dirtyRef.current = false;
      if (!silent) {
        setRefresh((value) => value + 1);
        setMessage('Ton prono a bien été pris en compte.');
      }
      return true;
    } catch (draftError) {
      if (!silent) {
        setError(draftError instanceof Error ? draftError.message : "Impossible d'enregistrer ce prono.");
        setClock(Date.now());
      }
      return false;
    }
  };

  persistDraftRef.current = persistDraft;

  useEffect(() => {
    latestDraft.current = {
      match: match ?? null,
      homeScore,
      awayScore,
      playerReady: Boolean(player),
      editable,
    };
  }, [awayScore, editable, homeScore, match, player]);

  useEffect(() => {
    const saveBeforeUnload = () => {
      void persistDraftRef.current(true);
    };

    window.addEventListener('beforeunload', saveBeforeUnload);
    return () => {
      saveBeforeUnload();
      window.removeEventListener('beforeunload', saveBeforeUnload);
    };
  }, []);

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
    dirtyRef.current = false;
    setMessage('');
    setError('');
  }, [match?.id, prediction]);

  useEffect(() => {
    if (!match || !editable) {
      setShowSwipeHint(false);
      return;
    }

    try {
      if (localStorage.getItem(SWIPE_HINT_KEY)) return;
      localStorage.setItem(SWIPE_HINT_KEY, '1');
    } catch {
      // If localStorage is unavailable, the hint can still play for this visit.
    }

    setShowSwipeHint(true);
    const timer = window.setTimeout(() => setShowSwipeHint(false), 1800);
    return () => window.clearTimeout(timer);
  }, [editable, match?.id]);

  if (!match) {
    return (
      <section className="empty-state">
        <strong>Match introuvable</strong>
        <p>Ce match n'existe pas ou n'est plus disponible.</p>
        <Link className="btn secondary" to="/matchs">Retour aux matchs</Link>
      </section>
    );
  }

  const multiplier = getMatchMultiplier(match);
  const boostLabel = getWorldCupBoostLabel(match, multiplier);
  const isFinal = isMatchFinal(match);
  const isLiveDisplay = isLiveDisplayMatch(match, new Date(clock));
  const hasScore = typeof match.homeScore === 'number' && typeof match.awayScore === 'number';
  const detailStatusLabel = isFinal ? 'Terminé' : isLiveDisplay ? 'Live' : 'Fermé';
  const homeName = getWorldCupTeamDisplayName(match.homeTeam, match);
  const awayName = getWorldCupTeamDisplayName(match.awayTeam, match);
  const homeCode = getWorldCupTeamShortCode(match.homeTeam, match);
  const awayCode = getWorldCupTeamShortCode(match.awayTeam, match);
  const scoreUpdatedAt = formatLastUpdated(match.lastUpdated ?? lastDataChangedAt);
  const points =
    isFinal && prediction && typeof match.homeScore === 'number' && typeof match.awayScore === 'number'
      ? calculatePredictionPointsForMatch(prediction.homeScore, prediction.awayScore, match)
      : null;
  const predictionResultType =
    isFinal && prediction ? getPredictionResultTypeForMatch(prediction.homeScore, prediction.awayScore, match) : 'pending';
  const showLockedSummary = Boolean(player && !editable && !(isFinal && prediction));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSaving(true);

    try {
      await savePrediction(match, homeScore, awayScore);
      dirtyRef.current = false;
      setRefresh((value) => value + 1);
      setMessage('Ton prono a bien été pris en compte.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Impossible d'enregistrer ce prono.");
      setClock(Date.now());
    } finally {
      setIsSaving(false);
    }
  };

  const updateScore = (team: 'home' | 'away', delta: number) => {
    const setter = team === 'home' ? setHomeScore : setAwayScore;
    dirtyRef.current = true;
    setter((value) => Math.max(0, value + delta));
    setMessage('');
    setError('');
  };

  const navigateToMatch = async (target: typeof match | null) => {
    if (!target) return;
    await persistDraftRef.current(true);
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
    if (deltaX < 0) void navigateToMatch(nextMatch);
    if (deltaX > 0) void navigateToMatch(previousMatch);
  };

  return (
    <div className="screen-stack match-detail-screen" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <Link className="back-link" to="/matchs">Retour aux matchs</Link>

      <section className={`match-detail-card ${multiplier > 1 ? 'is-boosted' : ''}`}>
        {showSwipeHint ? (
          <div className="swipe-hint" aria-hidden="true">
            <span className="swipe-arrow">‹</span>
            <span className="swipe-handle" />
            <span className="swipe-arrow">›</span>
          </div>
        ) : null}

        <div className="match-detail-kickoff">
          <p className="eyebrow">Coup d'envoi</p>
          <h1>{formatKickoffLong(match.kickoff)}</h1>
          <DeadlineBadge deadline={match.kickoff} closed={!editable} closedLabel={detailStatusLabel} label="Ouvert" />
        </div>

        {multiplier > 1 ? (
          <div className="booster-panel">
            <strong>Boost x{multiplier}</strong>
            <span>{boostLabel}. Les points comptent x{multiplier} sur ce match.</span>
          </div>
        ) : null}

        <div className="match-detail-teams">
          <div className="detail-team">
            <TeamBadge team={match.homeTeam} competitionCode={match.competitionCode} match={match} />
            <strong>{homeName}</strong>
            <small>{homeCode}</small>
          </div>
          <span className="detail-versus">{(isFinal || isLiveDisplay) && hasScore ? `${match.homeScore} - ${match.awayScore}` : isLiveDisplay ? 'Live' : 'VS'}</span>
          <div className="detail-team">
            <TeamBadge team={match.awayTeam} competitionCode={match.competitionCode} match={match} />
            <strong>{awayName}</strong>
            <small>{awayCode}</small>
          </div>
        </div>

        {isLiveDisplay ? (
          <div className="live-update-alert detail-live-alert">
            <span>Match en live</span>
            <small>{scoreUpdatedAt ? `Score actualisé à ${scoreUpdatedAt}` : 'Actualisation récente'}</small>
          </div>
        ) : null}

        {prediction ? (
          <div className="detail-current-prono">
            <span>Ton prono</span>
            <strong>{prediction.homeScore} - {prediction.awayScore}</strong>
            {points !== null ? (
              <small>{formatPredictionPointsLabel(points, predictionResultType)}</small>
            ) : (
              <small>{editable ? "Modifiable jusqu'au coup d'envoi" : 'Points en attente'}</small>
            )}
          </div>
        ) : null}

        {!player ? (
          <div className="empty-state inline">
            <strong>Connecte-toi pour pronostiquer</strong>
            <p>Connecte-toi pour enregistrer ton score Coupe du Monde.</p>
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
                <strong>{homeName}</strong>
                <div className="score-stepper">
                  <button type="button" onClick={() => updateScore('home', -1)} aria-label={`Retirer un but à ${homeName}`}>-</button>
                  <input
                    type="number"
                    min={0}
                    value={homeScore}
                    onChange={(event) => {
                      dirtyRef.current = true;
                      setMessage('');
                      setError('');
                      setHomeScore(Math.max(0, Number(event.target.value)));
                    }}
                  />
                  <button type="button" onClick={() => updateScore('home', 1)} aria-label={`Ajouter un but à ${homeName}`}>+</button>
                </div>
              </div>

              <span className="score-separator">-</span>

              <div className="score-team">
                <strong>{awayName}</strong>
                <div className="score-stepper">
                  <button type="button" onClick={() => updateScore('away', -1)} aria-label={`Retirer un but à ${awayName}`}>-</button>
                  <input
                    type="number"
                    min={0}
                    value={awayScore}
                    onChange={(event) => {
                      dirtyRef.current = true;
                      setMessage('');
                      setError('');
                      setAwayScore(Math.max(0, Number(event.target.value)));
                    }}
                  />
                  <button type="button" onClick={() => updateScore('away', 1)} aria-label={`Ajouter un but à ${awayName}`}>+</button>
                </div>
              </div>
            </div>

            <button className="btn primary" type="submit" disabled={isSaving}>
              {isSaving ? 'Enregistrement...' : prediction ? 'Enregistrer la modification' : 'Valider mon prono'}
            </button>
          </form>
        ) : null}

        {showLockedSummary ? (
          <div className="locked-summary">
            <strong>{isFinal ? 'Match terminé' : 'Pronostics verrouillés'}</strong>
            <p>{prediction ? `Ton prono : ${prediction.homeScore} - ${prediction.awayScore}` : 'Aucun prono enregistré.'}</p>
            {hasScore ? <p>{isFinal ? 'Score retenu' : 'Score en cours'} : {match.homeScore} - {match.awayScore}</p> : null}
            {points !== null ? <p>Points gagnés : {points} pts</p> : null}
          </div>
        ) : null}

        {message ? <p className="success-msg">{message}</p> : null}
        {error ? <p className="error-msg">{error}</p> : null}
      </section>

      <nav className="match-step-nav" aria-label="Navigation entre les matchs">
        <button className="btn ghost" type="button" disabled={!previousMatch || isSaving} onClick={() => void navigateToMatch(previousMatch)}>Match précédent</button>
        <button className="btn secondary" type="button" disabled={!nextMatch || isSaving} onClick={() => void navigateToMatch(nextMatch)}>Match suivant</button>
      </nav>

      <MatchPublicPredictionsSection match={match} />
    </div>
  );
};

export default MatchDetailPage;
