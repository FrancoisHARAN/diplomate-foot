import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PlayerAvatar from '../components/PlayerAvatar';
import TeamBadge from '../components/TeamBadge';
import { useLiveMatches } from '../hooks/useLiveMatches';
import type { PredictionResultType, PublicPlayerProfile, PublicPrediction } from '../types';
import { fetchPublicPlayerProfile, getStoredPredictions } from '../utils/appState';
import { formatKickoff, getMatchStatusLabel } from '../utils/date';
import { getWorldCupTeamDisplayName } from '../utils/worldCupFilters';

type ProfileFilter = 'all' | 'finished' | 'locked' | 'won' | PredictionResultType;

const profileFilters: Array<{ id: ProfileFilter; label: string }> = [
  { id: 'all', label: 'Tous' },
  { id: 'finished', label: 'Terminés' },
  { id: 'locked', label: 'En cours / verrouillés' },
  { id: 'won', label: 'Gagnés' },
  { id: 'exact', label: 'Score exact' },
  { id: 'two-point', label: 'Bon écart' },
  { id: 'winner', label: 'Bon gagnant' },
  { id: 'lost', label: 'Perdus' },
];

const resultLabels: Record<PredictionResultType, string> = {
  exact: 'Score exact',
  'two-point': 'Bon écart',
  winner: 'Bon gagnant',
  lost: 'Perdu',
  pending: 'En attente',
};

const resultClassName: Record<PredictionResultType, string> = {
  exact: 'exact',
  'two-point': 'two-point',
  winner: 'winner',
  lost: 'lost',
  pending: 'pending',
};

const getResultSummary = (resultType: PredictionResultType, points?: number | null): string => {
  if (resultType === 'pending') return 'En attente - prono verrouillé';
  if (resultType === 'lost') return 'Pronostic perdu';
  return `+${points ?? 0} pts - ${resultLabels[resultType]}`;
};

const filterPrediction = (item: PublicPrediction, filter: ProfileFilter): boolean => {
  if (filter === 'all') return true;
  if (filter === 'finished') return item.match.status === 'finished';
  if (filter === 'locked') return item.match.status !== 'finished';
  if (filter === 'won') return item.match.status === 'finished' && (item.points ?? 0) > 0;
  if (filter === 'lost') return item.match.status === 'finished' && item.resultType === 'lost';
  return item.match.status === 'finished' && item.resultType === filter;
};

const PlayerProfilePage = () => {
  const { playerId } = useParams();
  const { matches } = useLiveMatches();
  const [profile, setProfile] = useState<PublicPlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ProfileFilter>('all');

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    void fetchPublicPlayerProfile(playerId, matches, getStoredPredictions()).then((nextProfile) => {
      if (!mounted) return;
      setProfile(nextProfile);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [matches, playerId]);

  const filteredPredictions = useMemo(
    () => profile?.predictions.filter((item) => filterPrediction(item, filter)) ?? [],
    [filter, profile],
  );

  if (loading) {
    return (
      <section className="empty-state">
        <strong>Chargement du profil</strong>
        <p>On récupère les pronostics visibles de ce joueur.</p>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="empty-state">
        <strong>Joueur introuvable</strong>
        <p>Ce profil n'est pas disponible.</p>
        <Link className="btn secondary" to="/classement">← Retour au classement</Link>
      </section>
    );
  }

  return (
    <div className="screen-stack">
      <Link className="back-link" to="/classement">← Retour au classement</Link>

      <section className="profile-panel social-profile public-profile-card">
        <PlayerAvatar nickname={profile.nickname} avatarUrl={profile.avatarUrl} size="xlarge" />
        <div>
          <p className="eyebrow">Profil joueur</p>
          <h1>{profile.nickname}</h1>
          <p>{profile.stats.points} pts · rang #{profile.stats.rank ?? '-'}</p>
        </div>
        <div className="public-profile-stats" aria-label="Statistiques publiques">
          <span><strong>{profile.stats.exactScores}</strong> scores exacts</span>
          <span><strong>{profile.stats.twoPointResults}</strong> bons écarts</span>
          <span><strong>{profile.stats.onePointResults}</strong> bons vainqueurs</span>
          <span><strong>{profile.predictions.length}</strong> pronos visibles</span>
        </div>
      </section>

      <section className="section-block public-profile-history">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Pronostics publics</p>
            <h2>Historique visible</h2>
            <p className="section-subtitle">Seuls les pronos des matchs fermés, live ou terminés sont visibles.</p>
          </div>
        </div>

        <div className="filter-row public-profile-filters" role="tablist" aria-label="Filtres des pronostics publics">
          {profileFilters.map((item) => (
            <button key={item.id} type="button" className={`pill ${filter === item.id ? 'active' : ''}`} onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="prediction-list">
          {filteredPredictions.length > 0 ? (
            filteredPredictions.map(({ id, prediction, match, points, resultType }) => (
              <article className="social-prono-row public-prono-row" key={id}>
                <div className="social-prono-teams">
                  <TeamBadge team={match.homeTeam} competitionCode={match.competitionCode} match={match} />
                  <span>
                    <strong>{getWorldCupTeamDisplayName(match.homeTeam, match)} - {getWorldCupTeamDisplayName(match.awayTeam, match)}</strong>
                    <small>{match.competitionName ?? match.competitionCode ?? 'Match'} · {formatKickoff(match.kickoff)} · {getMatchStatusLabel(match.status)}</small>
                  </span>
                  <TeamBadge team={match.awayTeam} competitionCode={match.competitionCode} match={match} />
                </div>
                <div className="public-prono-outcome">
                  <span className={`public-result-badge ${resultClassName[resultType]}`}>{resultLabels[resultType]}</span>
                </div>
                <div className="public-prono-details" aria-label="Détail du pronostic">
                  <span className="public-detail-item">
                    <small>Prono</small>
                    <strong>{prediction.homeScore} - {prediction.awayScore}</strong>
                  </span>
                  {match.status === 'finished' ? (
                    <span className="public-detail-item">
                      <small>Score final</small>
                      <strong>{match.homeScore} - {match.awayScore}</strong>
                    </span>
                  ) : null}
                </div>
                <div className={`public-result-summary ${resultClassName[resultType]}`}>
                  {getResultSummary(resultType, points)}
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state inline">
              <strong>{profile.predictions.length > 0 ? 'Aucun prono dans ce filtre.' : 'Ce joueur n’a pas encore de pronostic visible.'}</strong>
              <p>Les pronostics restent cachés tant que les matchs sont encore ouverts.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default PlayerProfilePage;
