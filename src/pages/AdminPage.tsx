const actions = [
  'Créer un joueur',
  'Voir les joueurs',
  'Importer les matchs',
  'Mettre à jour les scores',
  'Recalculer le classement',
];

const AdminPage = () => (
  <div className="screen-stack">
    <section className="page-hero">
      <p className="eyebrow">Zone cachée</p>
      <h1>Admin</h1>
      <p>Cette zone reste fictive pour l'instant. Supabase et l'API foot restent pilotés par les scripts.</p>
      <p>Pour forcer une mise à jour des scores : GitHub, puis Actions, puis Update football data, puis Run workflow.</p>
    </section>

    <section className="action-list">
      {actions.map((action) => (
        <button key={action} type="button" className="action-row" onClick={() => window.alert(`${action} (mock)`)}>
          <span>{action}</span>
          <strong>Mock</strong>
        </button>
      ))}
    </section>
  </div>
);

export default AdminPage;
