import { useNavigate } from 'react-router-dom';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { useLiveMatches } from '../hooks/useLiveMatches';
import { useScoreCelebration } from '../hooks/useScoreCelebration';

const ScoreCelebrationStory = () => {
  const navigate = useNavigate();
  const { player } = usePlayerSession();
  const { matches } = useLiveMatches();
  const { celebration, dismissCelebration } = useScoreCelebration(player, matches);

  if (!celebration) return null;

  const goTo = (path: string) => {
    dismissCelebration();
    navigate(path);
  };

  return (
    <section className="celebration-story" role="dialog" aria-modal="true" aria-label="Points gagnés">
      <div className="celebration-story-card">
        <img src={celebration.gifSrc} alt="" />
        <div className="celebration-points">
          <span>+{celebration.gainedPoints}</span>
          <strong>{celebration.gainedPoints > 1 ? 'points' : 'point'}</strong>
        </div>
        <div className="celebration-actions">
          <button className="btn primary" type="button" onClick={() => goTo('/mes-pronos')}>Voir le détail</button>
          <button className="btn secondary" type="button" onClick={() => goTo('/')}>Retour à l'accueil</button>
        </div>
      </div>
    </section>
  );
};

export default ScoreCelebrationStory;
