import type { MatchStatus } from '../types';

const labels: Record<MatchStatus, string> = {
  upcoming: 'À venir',
  live: 'En cours',
  finished: 'Terminé',
};

const MatchStatusBadge = ({ status }: { status: MatchStatus }) => (
  <span className={`badge match-${status}`}>{labels[status]}</span>
);

export default MatchStatusBadge;
