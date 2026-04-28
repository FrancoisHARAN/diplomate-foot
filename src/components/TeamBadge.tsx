import { useEffect, useState } from 'react';
import type { CompetitionCode, Team } from '../types';
import { getTeamCrestCandidates, getTeamInitials } from '../utils/flags';

interface TeamBadgeProps {
  team: Team;
  competitionCode?: CompetitionCode;
  className?: string;
}

const TeamBadge = ({ team, competitionCode, className = '' }: TeamBadgeProps) => {
  const [index, setIndex] = useState(0);
  const crests = getTeamCrestCandidates(team, competitionCode);
  const crest = crests[index] ?? null;

  useEffect(() => {
    setIndex(0);
  }, [team.id, competitionCode]);

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
