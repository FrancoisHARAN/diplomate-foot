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

  const upcoming = useMemo(() => matches.filter((match) => match.status === 'upcoming').slice(0, 3), [matches]);
  const predictionsByMatch = useMemo(
    () => Object.fromEntries(predictions.map((prediction) => [prediction.matchId, prediction])),
    [predictions],
  );
  const userRank = getUserRank(standings, player?.id);

  return (
    <div className="stack">
      <section className="card hero-card">
        <p className="brand">LE DIPLOMATE</p>
        <h1>Pronos Coupe du Monde 2026</h1>
        <p className="prize-badge">1er prix : 50 € de consommation</p>
      </section>

      <LiveRankingCard standings={standings} userRank={userRank} />

      <section className="card">
        <h2>Matchs à venir</h2>
        <MatchList matches={upcoming} predictionsByMatch={predictionsByMatch} />
      </section>

      {!player ? (
        <article className="card">
          <h2>Prêt à jouer ?</h2>
          <p>Connecte-toi avec ton pseudo et ton code secret donné au bar.</p>
          <Link className="btn" to="/connexion">Se connecter</Link>
        </article>
      ) : (
        <article className="card">
          <h2>Ton espace</h2>
          <p>{player.nickname}</p>
          <p>{predictions.length} pronos enregistrés</p>
          <Link className="btn" to="/mes-pronos">Voir mes pronos</Link>
        </article>
      )}

      <article className="card">
        <h2>Règles rapides</h2>
        <p>Score exact = 3 pts · Bon écart = 2 pts · Bon vainqueur = 1 pt</p>
        <Link className="btn secondary" to="/reglement">Règlement complet</Link>
      </article>
    </div>
  );
};

export default HomePage;
