import type { Match, Prediction } from '../types';
import MatchCard from './MatchCard';

const MatchList = ({ matches, predictionsByMatch }: { matches: Match[]; predictionsByMatch: Record<string, Prediction> }) => (
  <section className="stack">
    {matches.map((match) => (
      <MatchCard key={match.id} match={match} prediction={predictionsByMatch[match.id]} />
    ))}
  </section>
);

export default MatchList;
