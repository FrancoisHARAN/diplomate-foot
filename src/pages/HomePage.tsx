import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LiveRankingCard from '../components/LiveRankingCard';
import MatchList from '../components/MatchList';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { matchService } from '../services/matchService';
import { playerService } from '../services/playerService';
import { predictionService } from '../services/predictionService';
import type { Match, Prediction, Standing } from '../types';
import { buildStandings, getUserRank } from '../utils/appState';

const HomePage = () => {
  const { player } = usePlayerSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  useEffect(() => {
    const load = async () => {
      const [allMatches, allPlayers, allPredictions] = await Promise.all([
        matchService.getAll(),
        playerService.getPlayers(),
        predictionService.getAllPredictions(),
      ]);
      setMatches(allMatches);
      setStandings(buildStandings(allPlayers, allPredictions, allMatches));
      setPredictions(player ? allPredictions.filter((item) => item.playerId === player.id) : []);
    };
    void load();
  }, [player]);

  const upcoming = useMemo(
    () => matches.filter((match) => match.status !== 'finished').slice(0, 3),
    [matches],
  );
  const predictionsByMatch = useMemo(
    () => Object.fromEntries(predictions.map((prediction) => [prediction.matchId, prediction])),
    [predictions],
  );
  const userRank = getUserRank(standings, player?.id);

  return (
    <div className="stack">
      <section className="card hero-card stack-sm">
        <p className="hero-brand">LE DIPLOMATE</p>
        <h1>Pronos Coupe du Monde 2026</h1>
        <p className="prize-badge">1er prix : 50 €</p>
        {player ? <p>Salut {player.nickname}</p> : <Link className="btn" to="/connexion">Se connecter</Link>}
      </section>

      <LiveRankingCard standings={standings} userRank={userRank} />

      <section className="stack-sm">
        <h2>Prochains matchs</h2>
        <MatchList matches={upcoming} predictionsByMatch={predictionsByMatch} />
      </section>

      {!player ? (
        <article className="card stack-sm">
          <h2>Prêt à jouer ?</h2>
          <p>Connecte-toi pour commencer tes pronostics.</p>
          <Link className="btn" to="/connexion">Connexion</Link>
        </article>
      ) : (
        <article className="card stack-sm">
          <h2>Mes pronos</h2>
          <p>{predictions.length} pronostics faits</p>
          <Link className="btn" to="/mes-pronos">Voir mes pronos</Link>
        </article>
      )}

      <article className="card stack-sm">
        <h2>Règles rapides</h2>
        <p>Score exact : 3 pts</p>
        <p>Bon écart : 2 pts</p>
        <p>Bon vainqueur : 1 pt</p>
      </article>
    </div>
  );
};

export default HomePage;
