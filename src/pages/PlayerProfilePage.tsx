import { Link, useParams } from 'react-router-dom';
import PlayerAvatar from '../components/PlayerAvatar';
import TeamBadge from '../components/TeamBadge';
import { mockPlayers } from '../data/mockPlayers';
import { useLiveMatches } from '../hooks/useLiveMatches';
import { buildStandings, getPlayerAvatarUrl, getPredictionsForPlayer, getStoredPredictions, samePlayerId } from '../utils/appState';
import { formatKickoffDay } from '../utils/date';
import { calculatePredictionPointsForMatch } from '../utils/points';

const PlayerProfilePage = () => {
  const { playerId } = useParams();
  const { matches } = useLiveMatches();
  const player = mockPlayers.find((item) => samePlayerId(item.id, playerId));

  if (!player) {
    return (
      <section className="empty-state">
        <strong>Joueur introuvable</strong>
        <p>Ce profil n'est pas disponible.</p>
        <Link className="btn secondary" to="/classement">Retour au classement</Link>
      </section>
    );
  }

  const allPredictions = getStoredPredictions();
  const predictions = getPredictionsForPlayer(player.id, allPredictions);
  const standings = buildStandings(mockPlayers, allPredictions, matches);
  const standing = standings.find((row) => samePlayerId(row.playerId, player.id));
  const finishedRows = predictions
    .map((prediction) => {
      const match = matches.find((item) => item.id === prediction.matchId);
      if (!match || match.status !== 'finished' || typeof match.homeScore !== 'number' || typeof match.awayScore !== 'number') return null;
      return { prediction, match, points: calculatePredictionPointsForMatch(prediction.homeScore, prediction.awayScore, match) };
    })
    .filter(Boolean);

  return (
    <div className="screen-stack">
      <Link className="back-link" to="/classement">Retour au classement</Link>

      <section className="profile-panel social-profile">
        <PlayerAvatar nickname={player.nickname} avatarUrl={getPlayerAvatarUrl(player.id) ?? player.avatarUrl} size="xlarge" />
        <div>
          <p className="eyebrow">Profil joueur</p>
          <h1>{player.nickname}</h1>
          <p>{standing?.points ?? player.points} pts · rang #{standing?.position ?? '-'}</p>
        </div>
        <span className="social-badge">{standing?.exactScores ?? player.exactScores} scores exacts</span>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Historique</p>
            <h2>Pronos terminés</h2>
          </div>
        </div>

        <div className="prediction-list">
          {finishedRows.length > 0 ? (
            finishedRows.map((row) =>
              row ? (
                <article className="social-prono-row" key={row.prediction.id}>
                  <div className="social-prono-teams">
                    <TeamBadge team={row.match.homeTeam} competitionCode={row.match.competitionCode} />
                    <span>
                      <strong>{row.match.homeTeam.shortName} - {row.match.awayTeam.shortName}</strong>
                      <small>{formatKickoffDay(row.match.kickoff)}</small>
                    </span>
                    <TeamBadge team={row.match.awayTeam} competitionCode={row.match.competitionCode} />
                  </div>
                  <div className="social-prono-score">
                    <span>Prono {row.prediction.homeScore} - {row.prediction.awayScore}</span>
                    <strong>{row.points} pts</strong>
                  </div>
                </article>
              ) : null,
            )
          ) : (
            <div className="empty-state inline">
              <strong>Aucun prono terminé</strong>
              <p>Les pronos de ce joueur apparaîtront ici une fois les matchs finis.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default PlayerProfilePage;
