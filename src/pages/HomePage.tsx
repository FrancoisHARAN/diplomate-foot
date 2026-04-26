import { Link } from 'react-router-dom';
import Leaderboard from '../components/Leaderboard';
import MatchCard from '../components/MatchCard';
import PrizeBanner from '../components/PrizeBanner';
import { mockPlayers } from '../data/mockPlayers';
import { matchService } from '../services/matchService';
import type { Standing } from '../types';

const HomePage = () => {
  const standings: Standing[] = mockPlayers
    .map((player, index) => ({
      position: index + 1,
      playerId: player.id,
      nickname: player.nickname,
      points: player.points,
      exactScores: player.exactScores,
      correctResults: player.correctResults,
    }))
    .sort((a, b) => a.position - b.position);

  const upcoming = matchService.getUpcoming(2);

  return (
    <>
      <PrizeBanner />
      <section className="card cta-row">
        <Link className="btn" to="/connexion">Se connecter</Link>
        <Link className="btn secondary" to="/matchs">Voir les matchs</Link>
      </section>

      <Leaderboard standings={standings.slice(0, 3)} />

      <section>
        <h2>Prochains matchs</h2>
        <div className="grid">
          {upcoming.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </section>
    </>
  );
};

export default HomePage;
