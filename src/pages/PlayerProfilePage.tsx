import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PlayerAvatar from '../components/PlayerAvatar';
import TeamBadge from '../components/TeamBadge';
import { useLiveMatches } from '../hooks/useLiveMatches';
import type { PublicPlayerProfile } from '../types';
import { fetchPublicPlayerProfile, getStoredPredictions } from '../utils/appState';
import { formatKickoffDay, getMatchStatusLabel } from '../utils/date';

const PlayerProfilePage = () => {
  const { playerId } = useParams();
  const { matches } = useLiveMatches();
  const [profile, setProfile] = useState<PublicPlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Pronostics publics</p>
            <h2>Historique visible</h2>
          </div>
        </div>

        <div className="prediction-list">
          {profile.predictions.length > 0 ? (
            profile.predictions.map(({ id, prediction, match, points }) => (
              <article className="social-prono-row public-prono-row" key={id}>
                <div className="social-prono-teams">
                  <TeamBadge team={match.homeTeam} competitionCode={match.competitionCode} />
                  <span>
                    <strong>{match.homeTeam.shortName} - {match.awayTeam.shortName}</strong>
                    <small>{formatKickoffDay(match.kickoff)} · {getMatchStatusLabel(match.status)}</small>
                  </span>
                  <TeamBadge team={match.awayTeam} competitionCode={match.competitionCode} />
                </div>
                <div className="public-prono-details">
                  <span>Prono : {prediction.homeScore} - {prediction.awayScore}</span>
                  {match.status === 'finished' ? (
                    <>
                      <span>Score final : {match.homeScore} - {match.awayScore}</span>
                      <strong>+{points ?? 0} pts</strong>
                    </>
                  ) : (
                    <strong>Pronostic verrouillé</strong>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state inline">
              <strong>Ce joueur n’a pas encore de pronostics visibles.</strong>
              <p>Les pronostics restent cachés tant que les matchs sont encore ouverts.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default PlayerProfilePage;
