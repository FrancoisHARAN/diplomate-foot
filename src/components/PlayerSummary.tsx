import { Link } from 'react-router-dom';

interface PlayerSummaryProps {
  nickname: string;
  points: number;
  predictionCount: number;
  onLogout: () => void;
}

const PlayerSummary = ({ nickname, points, predictionCount, onLogout }: PlayerSummaryProps) => (
  <section className="card">
    <h2>Espace joueur</h2>
    <p>
      Pseudo : <strong>{nickname}</strong>
    </p>
    <p>
      <strong>Points :</strong> {points}
    </p>
    <p>
      <strong>Nombre de pronostics :</strong> {predictionCount}
    </p>

    <div className="actions">
      <Link to="/mes-pronos" className="btn">
        Aller à Mes pronos
      </Link>
      <button type="button" className="btn secondary" onClick={onLogout}>
        Déconnexion
      </button>
    </div>
  </section>
);

export default PlayerSummary;
