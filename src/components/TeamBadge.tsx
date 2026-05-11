import { useEffect, useState } from 'react';
import type { CompetitionCode, Match, Team } from '../types';
import { getTeamCrestCandidates, getTeamInitials } from '../utils/flags';

interface TeamBadgeProps {
  team: Team;
  competitionCode?: CompetitionCode;
  match?: Match;
  className?: string;
}

const TeamBadge = ({ team, competitionCode, match, className = '' }: TeamBadgeProps) => {
  const [index, setIndex] = useState(0);
  const crests = getTeamCrestCandidates(team, match ?? competitionCode);
  const crest = crests[index] ?? null;

  useEffect(() => {
    setIndex(0);
  }, [team.id, competitionCode, match?.id]);

  if (crest) {
    return (
      <img
        className={`team-crest ${className}`.trim()}
        src={crest}
        alt=""
        onError={() => setIndex((value) => value + 1)}
      />
    );
  }

  return <span className={`club-badge ${className}`.trim()}>{getTeamInitials(team.name, team.shortName)}</span>;
};

export default TeamBadge;
