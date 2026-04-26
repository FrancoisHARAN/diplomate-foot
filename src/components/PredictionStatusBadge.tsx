import type { PredictionUiStatus } from '../utils/appState';

const labels: Record<PredictionUiStatus, string> = {
  open: 'Ouvert',
  closing: 'Ferme bientôt',
  closed: 'Fermé',
  done: 'Terminé',
};

const PredictionStatusBadge = ({ status }: { status: PredictionUiStatus }) => (
  <span className={`badge pred-${status}`}>{labels[status]}</span>
);

export default PredictionStatusBadge;
