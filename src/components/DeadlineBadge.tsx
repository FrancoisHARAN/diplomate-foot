import { useEffect, useMemo, useState } from 'react';
import { formatRemainingTime, getDeadlineTone } from '../utils/deadlineTimer';

interface DeadlineBadgeProps {
  deadline: string;
  closed?: boolean;
  label?: string;
  closedLabel?: string;
  className?: string;
}

const DeadlineBadge = ({ deadline, closed = false, label, closedLabel = 'Fermé', className = '' }: DeadlineBadgeProps) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (closed) return undefined;
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, [closed, deadline]);

  const tone = useMemo(() => getDeadlineTone(deadline, now, closed), [closed, deadline, now]);
  const value = tone === 'closed' ? closedLabel : formatRemainingTime(deadline, now);
  const prefix = tone === 'closed' ? null : label;

  return (
    <span className={`deadline-badge ${tone} ${className}`.trim()} aria-label={prefix ? `${prefix} ${value}` : value}>
      {prefix ? <span className="deadline-badge-label">{prefix}</span> : null}
      <strong>{value}</strong>
    </span>
  );
};

export default DeadlineBadge;
