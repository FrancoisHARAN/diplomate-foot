const AdminPage = () => (
  <div className="stack">
    <section className="card">
      <h1>Zone admin</h1>
      <p>Sera sécurisée avec Supabase plus tard.</p>
    </section>
    {['Créer un joueur', 'Voir les joueurs', 'Importer les matchs', 'Mettre à jour les scores', 'Recalculer le classement'].map((action) => (
      <article className="card" key={action}>{action}</article>
    ))}
  </div>
);

export default AdminPage;
