import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { matchService } from '../services/matchService';
import { playerService } from '../services/playerService';
import { predictionService } from '../services/predictionService';
import type { Match, Player } from '../types';
import { formatKickoff } from '../utils/date';

const HomePage = () => {
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [nextMatches, allPlayers, predictions, allMatches] = await Promise.all([
          matchService.getUpcoming(4),
          playerService.getPlayers(),
          predictionService.getAllPredictions(),
          matchService.getAll(),
        ]);

        const matchesById = new Map(allMatches.map((match) => [match.id, match]));
        const pointsByPlayer = new Map<string, number>();

        predictions.forEach((prediction) => {
          const match = matchesById.get(prediction.matchId);
          if (!match) return;

          const points = predictionService.calculatePointsForPrediction(prediction, match);
          pointsByPlayer.set(prediction.playerId, (pointsByPlayer.get(prediction.playerId) ?? 0) + points);
        });

        setUpcomingMatches(nextMatches);
        setPlayers(
          allPlayers.map((player) => ({
            ...player,
            points: pointsByPlayer.get(player.id) ?? player.points ?? 0,
          })),
        );
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Chargement impossible.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const standings = useMemo(
    () =>
      [...players]
        .sort((a, b) => b.points - a.points)
        .slice(0, 5)
        .map((player, index) => `${index + 1}. ${player.nickname} — ${player.points} pts`),
    [players],
  );

  return (
    <section className="home-landing card">
      <p className="landing-brand">LE DIPLOMATE</p>
      <h2>Pronos Coupe du Monde 2026</h2>
      {isLoading ? <p>Chargement des données...</p> : null}
      {error ? <p>⚠️ {error}</p> : null}

      <div className="hero-words">
        <span>PRONOSTIQUE</span>
        <span>GAGNE</span>
        <span>FÊTE LE FOOT</span>
      </div>

      <div className="landing-grid">
        <article className="promo-card promo-yellow">
          <h3>1er prix : 50 € de consommation</h3>
          <p>Ambiance bar, compétition et bonne humeur à chaque match.</p>
        </article>

        <article className="promo-card promo-purple">
          <h3>Faire mes pronos</h3>
          <Link className="round-btn" to="/matchs" aria-label="Faire mes pronostics">
            →
          </Link>
        </article>

        <article className="promo-card promo-blue">
          <h3>Prochains matchs</h3>
          <ul>
            {upcomingMatches.map((match) => (
              <li key={match.id}>
                {match.homeTeam.name} vs {match.awayTeam.name} — {formatKickoff(match.kickoff)}
              </li>
            ))}
          </ul>
        </article>

        <article className="promo-card promo-green">
          <h3>Classement du bar</h3>
          <ol>
            {standings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </article>

        <article className="promo-card promo-red">
          <h3>Règles des points</h3>
          <p>Score exact = 3 pts · Bon écart = 2 pts · Bon résultat = 1 pt.</p>
        </article>
      </div>

      <div className="cta-row">
        <Link className="btn" to="/matchs">
          Faire mes pronos
        </Link>
        <Link className="btn secondary" to="/classement">
          Voir le classement
        </Link>
      </div>
    </section>
  );
};

export default HomePage;
