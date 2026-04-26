import type { Player } from '../types';

interface AdminPanelProps {
  players: Player[];
}

const nextStepAlert = () => alert('Fonction prévue dans la prochaine étape');

const AdminPanel = ({ players }: AdminPanelProps) => (
  <section className="card">
    <h2>Administration (fictive)</h2>
    <p>Cette page devra être protégée (rôle admin) dans la prochaine étape.</p>
    <div className="actions">
      <button type="button" className="btn" onClick={nextStepAlert}>Créer un joueur</button>
      <button type="button" className="btn" onClick={nextStepAlert}>Importer les matchs</button>
      <button type="button" className="btn" onClick={nextStepAlert}>Mettre à jour les scores</button>
      <button type="button" className="btn" onClick={nextStepAlert}>Recalculer le classement</button>
    </div>
    <h3>Joueurs fictifs</h3>
    <ul>
      {players.map((player) => (
        <li key={player.id}>{player.nickname}</li>
      ))}
    </ul>
  </section>
);

export default AdminPanel;
