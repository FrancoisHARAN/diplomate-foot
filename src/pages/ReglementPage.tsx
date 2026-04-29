const rules = [
  {
    title: 'Score exact',
    points: '3 pts',
    condition: 'Tu trouves exactement le score final.',
    example: 'Exemple : tu joues 2 - 1, le match finit 2 - 1.',
  },
  {
    title: 'Bon écart',
    points: '2 pts',
    condition: 'Tu trouves le bon écart de buts, même si le score exact est différent.',
    example: 'Exemples : tu joues 3 - 1 et ça finit 2 - 0, ou tu joues 3 - 3 et ça finit 2 - 2.',
  },
  {
    title: 'Bon gagnant',
    points: '1 pt',
    condition: 'Tu trouves seulement la bonne équipe gagnante.',
    example: 'Exemple : tu joues 1 - 0, ton équipe gagne 3 - 2.',
  },
  {
    title: 'Prono perdu',
    points: '0 pt',
    condition: 'Le résultat ne correspond pas à ton pari.',
    example: 'Exemple : tu joues victoire à domicile, mais l’extérieur gagne.',
  },
];

const ReglementPage = () => (
  <div className="screen-stack">
    <section className="page-hero rules-hero">
      <p className="eyebrow">Jeu du bar</p>
      <h1>Règlement</h1>
      <p>Tu poses un score avant le coup d’envoi. Dès que le match commence, le prono est verrouillé.</p>
    </section>

    <section className="rules-lead-card">
      <span>Objectif</span>
      <strong>Marquer le plus de points possible sur les vrais matchs.</strong>
      <p>Plus ton score est précis, plus tu prends de points au classement du Diplomate.</p>
    </section>

    <section className="rules-grid">
      {rules.map((rule) => (
        <article className="rule-card" key={rule.title}>
          <div className="rule-points">
            <span>{rule.points}</span>
          </div>
          <div className="rule-body">
            <strong>{rule.title}</strong>
            <p>{rule.condition}</p>
            <small>{rule.example}</small>
          </div>
        </article>
      ))}
    </section>

    <section className="rules-note-grid">
      <article className="rules-note-card boost-card">
        <span>Boost</span>
        <strong>Certains matchs comptent x2 ou plus.</strong>
        <p>Sur un match boosté x2, un score exact vaut 6 points au lieu de 3.</p>
      </article>
      <article className="rules-note-card prizes-card">
        <span>Podium</span>
        <strong>Les lots finaux</strong>
        <p>1er : 20 € de conso au bar. 2e : une pizza. 3e : un saucisson.</p>
      </article>
    </section>
  </div>
);

export default ReglementPage;
