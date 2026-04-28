const AdminPage = () => (
  <div className="stack">
    <section className="card stack-sm">
      <h1>Zone admin</h1>
      <p>Cette zone sera sécurisée avec Supabase plus tard.</p>
    </section>

    {['Créer un joueur', 'Voir les joueurs', 'Importer les matchs', 'Mettre à jour les scores', 'Recalculer le classement'].map((action) => (
      <button key={action} type="button" className="card action-card" onClick={() => window.alert(`${action} (mock)`) }>
        {action}
      </button>
    ))}
  </div>
);

export default AdminPage;
