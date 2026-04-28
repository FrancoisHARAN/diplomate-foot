const rules = [
  { title: 'Score exact', points: '3 pts', text: 'Tu trouves le score final complet, par exemple 2 - 1.' },
  { title: 'Bon écart', points: '2 pts', text: 'Tu trouves le bon vainqueur et le bon écart, par exemple 3 - 2 au lieu de 2 - 1.' },
  { title: 'Bon résultat', points: '1 pt', text: 'Tu trouves simplement la bonne équipe gagnante, ou le bon match nul.' },
  { title: 'Mauvais résultat', points: '0 pt', text: 'Le résultat du match ne correspond pas à ton prono.' },
];

const ReglementPage = () => (
  <div className="screen-stack">
    <section className="page-hero">
      <p className="eyebrow">Jeu du bar</p>
      <h1>Règlement</h1>
      <p>Les pronostics ferment automatiquement 1 heure avant le coup d’envoi.</p>
    </section>

    <section className="rules-grid">
      {rules.map((rule) => (
        <article className="rule-tile" key={rule.title}>
          <span>{rule.points}</span>
          <strong>{rule.title}</strong>
          <p>{rule.text}</p>
        </article>
      ))}
    </section>

    <section className="notice-panel">
      <strong>Exemple</strong>
      <p>Résultat France 2 - 1 Canada : le prono 2 - 1 vaut 3 pts, le prono 3 - 2 vaut 2 pts, le prono 1 - 0 vaut 2 pts, le prono 2 - 0 vaut 1 pt.</p>
    </section>

    <section className="notice-panel compact">
      <strong>Lot final</strong>
      <p>Le gagnant remporte 50 € de consommation au Diplomate.</p>
    </section>
  </div>
);

export default ReglementPage;
