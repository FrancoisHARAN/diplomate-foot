import { Link } from 'react-router-dom';
import MatchCard from '../components/MatchCard';
import PlayerAvatar from '../components/PlayerAvatar';
import PrizePanel from '../components/PrizePanel';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { mockPlayers } from '../data/mockPlayers';
import { useLiveMatches } from '../hooks/useLiveMatches';
import type { Match } from '../types';
import { buildStandings, countUserPredictions, getPredictionsForPlayer, getStoredPredictions, getUserPointsMock, getUserRankMock, samePlayerId } from '../utils/appState';

const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);

const homeDayTitle = (iso: string) => {
  const date = new Date(iso);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((target - start) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Demain';
  if (diffDays === 2) return 'Après-demain';

  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }).format(date);
};

const groupHomeMatchesByDay = (matches: Match[]) => {
  const groups = new Map<string, Match[]>();
  matches.forEach((match) => {
    const key = dayKey(match.kickoff);
    groups.set(key, [...(groups.get(key) ?? []), match]);
  });
  return Array.from(groups.entries()).map(([key, items]) => ({ key, title: homeDayTitle(items[0].kickoff), matches: items }));
};

const HomePage = () => {
  const { player } = usePlayerSession();
  const { matches } = useLiveMatches();
  const predictions = getStoredPredictions();
  const standings = buildStandings(mockPlayers, predictions, matches);
  const nextMatches = matches.filter((match) => match.status !== 'finished').slice(0, 3);
  const nextMatchGroups = groupHomeMatchesByDay(nextMatches);
  const myMap = new Map(getPredictionsForPlayer(player?.id, predictions).map((prediction) => [prediction.matchId, prediction]));
  const openMatches = matches.filter((match) => match.status === 'upcoming').length;
  const liveMatches = matches.filter((match) => match.status === 'live').length;

  return (
    <div className="screen-stack">
      <section className="hero-panel">
        <div className="hero-content">
          <img className="hero-brand-logo" src={`${import.meta.env.BASE_URL}brand/logo-diplomate.png`} alt="" />
          <p className="eyebrow">Le Diplomate</p>
          <h1>Deviens champion des pronos</h1>
          <p className="hero-copy">Pose tes scores, suis les vrais matchs et grimpe au classement du bar.</p>
          <div className="hero-actions single">
            <Link className="btn secondary" to={player ? '/matchs' : '/connexion'}>{player ? 'Jouer mes matchs' : 'Se connecter'}</Link>
          </div>
        </div>
        <div className="hero-visuals" aria-hidden="true">
          <img className="hero-player" src={`${import.meta.env.BASE_URL}players/mbappe.png`} alt="" />
          <img className="hero-cup" src={`${import.meta.env.BASE_URL}world-cup/trophy-cutout.png`} alt="" />
        </div>
      </section>

      {!player ? (
        <section className="intro-panel">
          <strong>Entre dans la compétition</strong>
          <p>Connecte-toi avec ton pseudo, pronostique les matchs ouverts et marque des points dès le score final.</p>
        </section>
      ) : null}

      <section className="quick-stats" aria-label="Résumé de la compétition">
        <article>
          <small>Mon score</small>
          <strong>{player ? `${getUserPointsMock(matches)} pts` : 'Invité'}</strong>
        </article>
        <article>
          <small>Mon rang</small>
          <strong>{player ? `#${getUserRankMock(matches)}` : '-'}</strong>
        </article>
        <article>
          <small>Matchs ouverts</small>
          <strong>{openMatches}</strong>
        </article>
        <article>
          <small>Live</small>
          <strong>{liveMatches}</strong>
        </article>
      </section>

      <section className="section-block home-ranking-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">En direct</p>
            <h2>Classement du bar</h2>
          </div>
          <Link className="text-link" to="/classement">Voir tout</Link>
        </div>

        <div className="ranking-list compact">
          {standings.slice(0, 3).map((row) => (
            <Link key={row.playerId} to={`/joueurs/${row.playerId}`} className={`ranking-row ${samePlayerId(row.playerId, player?.id) ? 'is-me' : ''}`}>
              <span className="rank-number">{row.position}</span>
              <PlayerAvatar nickname={row.nickname} avatarUrl={row.avatarUrl} />
              <span>
                <strong>{row.nickname}</strong>
                <small>{row.exactScores} scores exacts</small>
              </span>
              <strong>{row.points} pts</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-block home-match-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">À jouer</p>
            <h2>Prochains matchs</h2>
          </div>
          <Link className="text-link" to="/matchs">Tous</Link>
        </div>
        <div className="home-match-groups">
          {nextMatchGroups.map((group) => (
            <section className="home-match-day" key={group.key}>
              <h3>{group.title}</h3>
              <div className="match-list">
                {group.matches.map((match) => <MatchCard key={match.id} match={match} prediction={myMap.get(match.id)} />)}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="account-panel">
        {player ? (
          <>
            <PlayerAvatar nickname={player.nickname} avatarUrl={player.avatarUrl} size="large" />
            <div>
              <h2>{player.nickname}</h2>
              <p>{countUserPredictions()} pronostics enregistrés · {getUserPointsMock(matches)} pts</p>
            </div>
            <Link className="btn primary" to="/mes-pronos">Mes pronos</Link>
          </>
        ) : (
          <>
            <PlayerAvatar nickname="?" size="large" />
            <div>
              <h2>Prêt à jouer ?</h2>
              <p>Demande ton code au comptoir et rejoins la ligue du bar.</p>
            </div>
            <Link className="btn primary" to="/connexion">Connexion</Link>
          </>
        )}
      </section>

      <section className="section-block prize-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">À gagner</p>
            <h2>Lots du podium</h2>
          </div>
        </div>
        <PrizePanel />
      </section>
    </div>
  );
};

export default HomePage;
