import type { Player } from '../types';

interface AdminPanelProps {
  players: Player[];
  isSupabaseConfigured: boolean;
  modeLabel: string;
  onCreateTestPlayer: () => void | Promise<void>;
  onCreateTestMatches: () => void | Promise<void>;
}

const AdminPanel = ({
  players,
  isSupabaseConfigured,
  modeLabel,
  onCreateTestPlayer,
  onCreateTestMatches,
}: AdminPanelProps) => (
  <section className="card">
    <h2>Admin</h2>
    <p>Zone admin — sécurité renforcée prévue dans l’étape suivante.</p>

    <h3>Statut Supabase</h3>
    <p>Supabase configuré : <strong>{isSupabaseConfigured ? 'oui' : 'non'}</strong></p>
    <p>Mode actuel : <strong>{modeLabel}</strong></p>

    <div className="actions">
      <button type="button" className="btn" onClick={() => void onCreateTestPlayer()}>
        Créer un joueur de test
      </button>
      <button type="button" className="btn" onClick={() => void onCreateTestMatches()}>
        Créer des matchs de test
      </button>
      <button type="button" className="btn" disabled>
        Vider données test (à venir)
      </button>
    </div>

    <h3>Joueurs</h3>
    <ul>
      {players.map((player) => (
        <li key={player.id}>{player.nickname}</li>
      ))}
    </ul>
  </section>
);

export default AdminPanel;
