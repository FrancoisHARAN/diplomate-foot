import type { Match, Prediction } from '../types';
import MatchCard from './MatchCard';

const MatchList = ({ matches, predictionsByMatch }: { matches: Match[]; predictionsByMatch: Record<string, Prediction> }) => {
  if (matches.length === 0) {
    return (
      <section className="card stack-sm">
        <h2>Aucun match à venir pour ces filtres</h2>
        <p>Réinitialisez les filtres pour afficher toutes les rencontres.</p>
      </section>
    );
  }

  return (
    <section className="stack">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} prediction={predictionsByMatch[match.id]} />
      ))}
    </section>
  );
};

export default MatchList;
