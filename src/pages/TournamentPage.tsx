import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveMatches } from '../hooks/useLiveMatches';
import type { WorldCupGroupStanding, WorldCupKnockoutMatch, WorldCupTeamMatch } from '../utils/worldCupStandings';
import {
  calculateWorldCupGroups,
  getWorldCupKnockoutRounds,
  getWorldCupTeamMatches,
  hasWorldCupKnockoutMatches,
} from '../utils/worldCupStandings';
import { formatKickoff, getMatchStatusLabel } from '../utils/date';

const recordLabel = (team: WorldCupGroupStanding): string =>
  `${team.played} J · ${team.won} V · ${team.drawn} N · ${team.lost} D · ${team.goalDifference >= 0 ? '+' : ''}${team.goalDifference}`;

const matchScore = (match?: { status?: string; homeScore?: number; awayScore?: number }) => {
  if (!match || match.status !== 'finished') return 'vs';
  if (typeof match.homeScore !== 'number' || typeof match.awayScore !== 'number') return 'vs';
  return `${match.homeScore} - ${match.awayScore}`;
};

const TeamFlag = ({ flagUrl, name }: { flagUrl?: string; name: string }) => (
  flagUrl ? <img className="tournament-flag" src={flagUrl} alt="" /> : <span className="tournament-flag fallback">{name.slice(0, 2)}</span>
);

const TeamMatches = ({ team, matches }: { team: WorldCupGroupStanding; matches: WorldCupTeamMatch[] }) => (
  <div className="team-fixtures-panel">
    <div className="team-fixtures-heading">
      <TeamFlag flagUrl={team.flagUrl} name={team.name} />
      <div>
        <strong>Matchs de {team.name}</strong>
        <small>Coupe du Monde 2026</small>
      </div>
    </div>

    {matches.length > 0 ? (
      <div className="team-fixture-list">
        {matches.map((item) => {
          const content = (
            <>
              <div className="team-fixture-opponent">
                <TeamFlag flagUrl={item.opponentFlagUrl} name={item.opponentName} />
                <span>
                  <strong>{item.isHome ? team.name : item.opponentName} {matchScore(item.match)} {item.isHome ? item.opponentName : team.name}</strong>
                  <small>{item.kickoff ? formatKickoff(item.kickoff) : 'Date à venir'} · {item.status ? getMatchStatusLabel(item.status) : 'Match à venir'}</small>
                </span>
              </div>
              <span className="mini-link">Voir le match</span>
            </>
          );

          return item.available && item.id ? (
            <Link className="team-fixture-row" key={item.id} to={`/matchs/${item.id}`}>
              {content}
            </Link>
          ) : (
            <div className="team-fixture-row disabled" key={`${team.code}-unknown-${item.opponentName}`}>
              {content}
            </div>
          );
        })}
      </div>
    ) : (
      <div className="empty-state inline">
        <strong>Matchs à venir</strong>
        <p>Les affiches seront complétées automatiquement quand elles seront connues.</p>
      </div>
    )}
  </div>
);

const KnockoutMatchCard = ({ item }: { item: WorldCupKnockoutMatch }) => {
  const content = (
    <>
      <div className="knockout-teams">
        <span>
          <TeamFlag flagUrl={item.homeFlagUrl} name={item.homeLabel} />
          <strong>{item.homeLabel}</strong>
        </span>
        <b>{matchScore(item.match)}</b>
        <span>
          <TeamFlag flagUrl={item.awayFlagUrl} name={item.awayLabel} />
          <strong>{item.awayLabel}</strong>
        </span>
      </div>
      <div className="knockout-meta">
        <small>{item.kickoff ? formatKickoff(item.kickoff) : 'Match à venir'}</small>
        {item.status ? <small>{getMatchStatusLabel(item.status)}</small> : <small>À déterminer</small>}
      </div>
      {item.available ? <span className="mini-link">Voir le match</span> : <span className="muted-label">Qualifiés à venir</span>}
    </>
  );

  return item.available && item.id ? (
    <Link className="knockout-match-card" to={`/matchs/${item.id}`}>
      {content}
    </Link>
  ) : (
    <div className="knockout-match-card disabled">
      {content}
    </div>
  );
};

const TournamentPage = () => {
  const { matches } = useLiveMatches();
  const [selectedTeamCode, setSelectedTeamCode] = useState<string | null>(null);
  const groups = useMemo(() => calculateWorldCupGroups(matches), [matches]);
  const knockoutRounds = useMemo(() => getWorldCupKnockoutRounds(matches), [matches]);
  const hasKnockouts = useMemo(() => hasWorldCupKnockoutMatches(matches), [matches]);

  return (
    <div className="screen-stack tournament-page">
      <section className="page-hero tournament-hero">
        <p className="eyebrow">Coupe du Monde 2026</p>
        <h1>Arbre du tournoi</h1>
        <p>Groupes, classements et phases finales, avec les liens vers les matchs pronostiquables quand ils existent.</p>
        {hasKnockouts ? <span className="mini-badge success">Phases finales disponibles</span> : <span className="mini-badge">Groupes en premier</span>}
      </section>

      <section className="section-block tournament-groups-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Groupes</p>
            <h2>Classements de groupes</h2>
            <p className="section-subtitle">Classement indicatif calculé avec les matchs connus : points, différence de buts, buts marqués, puis ordre alphabétique.</p>
          </div>
        </div>

        <div className="tournament-group-grid">
          {groups.map((group) => {
            const selectedTeam = group.standings.find((team) => team.code === selectedTeamCode);
            const selectedMatches = selectedTeam ? getWorldCupTeamMatches(selectedTeam.code, matches) : [];

            return (
              <article className="tournament-group-card" key={group.id}>
                <h3>{group.label}</h3>
                <div className="group-standing-list">
                  {group.standings.map((team, index) => (
                    <button
                      className={`group-standing-row ${selectedTeamCode === team.code ? 'active' : ''}`}
                      key={team.code}
                      type="button"
                      onClick={() => setSelectedTeamCode((current) => current === team.code ? null : team.code)}
                    >
                      <span className="group-rank">{index + 1}</span>
                      <TeamFlag flagUrl={team.flagUrl} name={team.name} />
                      <span className="group-team-name">
                        <strong>{team.name}</strong>
                        <small>{recordLabel(team)}</small>
                      </span>
                      <strong className="group-points">{team.points} pts</strong>
                    </button>
                  ))}
                </div>
                {selectedTeam ? <TeamMatches team={selectedTeam} matches={selectedMatches} /> : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-block tournament-knockout-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Phases finales</p>
            <h2>Arbre du tournoi</h2>
            <p className="section-subtitle">Les affiches se rempliront automatiquement quand les matchs seront disponibles dans les données live.</p>
          </div>
        </div>

        <div className="knockout-round-list">
          {knockoutRounds.map((round) => (
            <article className="knockout-round-card" key={round.id}>
              <h3>{round.label}</h3>
              <div className="knockout-match-list">
                {round.matches.map((item, index) => (
                  <KnockoutMatchCard item={item} key={item.id ?? `${round.id}-placeholder-${index}`} />
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default TournamentPage;
