const rules = [
  { title: 'Score exact', points: '3 pts', text: 'Tu trouves le score final complet, par exemple 2 - 1.' },
  { title: 'Bon écart', points: '2 pts', text: 'Tu trouves le bon vainqueur et le bon écart, par exemple 3 - 2 au lieu de 2 - 1.' },
  { title: 'Bon résultat', points: '1 pt', text: "Tu trouves la bonne équipe gagnante, ou le bon match nul." },
  { title: 'Mauvais résultat', points: '0 pt', text: 'Le résultat du match ne correspond pas à ton prono.' },
];

const ReglementPage = () => (
  <div className="screen-stack">
    <section className="page-hero">
      <p className="eyebrow">Jeu du bar</p>
      <h1>Règlement</h1>
      <p>Les pronostics ferment automatiquement au coup d'envoi du match.</p>
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
      <strong>Boosters</strong>
      <p>Certains matchs peuvent compter double ou plus. Sur un match boosté x2, un score exact vaut 6 points.</p>
    </section>

    <section className="notice-panel compact">
      <strong>Lots finaux</strong>
      <p>1er : 20 € de consommation au bar · 2e : une pizza · 3e : un saucisson.</p>
    </section>
  </div>
);

export default ReglementPage;
