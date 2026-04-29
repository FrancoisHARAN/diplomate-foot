import type { RankingMovement } from '../hooks/useRankingMovements';

interface RankingMovementBadgeProps {
  movement?: RankingMovement;
}

const RankingMovementBadge = ({ movement }: RankingMovementBadgeProps) => {
  if (!movement) {
    return <span className="ranking-movement empty" aria-hidden="true" />;
  }

  const label = movement.direction === 'up' ? `Montée de ${movement.places} place${movement.places > 1 ? 's' : ''}` : `Descente de ${movement.places} place${movement.places > 1 ? 's' : ''}`;

  return (
    <span className={`ranking-movement ${movement.direction}`} aria-label={label}>
      <span className="movement-arrow">{movement.direction === 'up' ? '↑' : '↓'}</span>
      <span>{movement.places}</span>
    </span>
  );
};

export default RankingMovementBadge;
