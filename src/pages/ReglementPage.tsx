const playSteps = [
  'Connecte-toi avec ton pseudo et ton code.',
  'Choisis un match ouvert.',
  'Entre ton score avant le coup d’envoi.',
];

const pointRules = [
  {
    points: '3 pts',
    title: 'Score exact',
    text: 'Tu trouves exactement le score final.',
    examples: ['Prono 2 - 1, résultat 2 - 1.'],
  },
  {
    points: '2 pts',
    title: 'Bon écart',
    text: 'Tu as le bon gagnant et le bon écart de buts.',
    detail: 'Un bon écart signifie que la différence de buts est la même.',
    examples: ['Prono 1 - 0, résultat 3 - 2.', 'Prono 2 - 2, résultat 1 - 1.'],
  },
  {
    points: '1 pt',
    title: 'Bon gagnant',
    text: 'Tu as le bon gagnant, mais pas le bon écart.',
    examples: ['Prono 2 - 0, résultat 3 - 2.'],
  },
  {
    points: '0 pt',
    title: 'Prono perdu',
    text: 'Le résultat ne correspond pas à ton prono.',
    examples: ['Prono victoire domicile, résultat victoire extérieur.'],
  },
];

const prizes = [
  '1er : 20 € de conso au bar',
  '2e : une pizza',
  '3e : un saucisson',
];

const ReglementPage = () => (
  <div className="screen-stack rules-page">
    <section className="page-hero rules-hero">
      <p className="eyebrow">Jeu du bar</p>
      <h1>Règlement</h1>
      <p>Fais tes pronos avant le coup d’envoi et marque des points selon la précision de ton score.</p>
    </section>

    <section className="rules-section">
      <div className="rules-section-title">
        <span>01</span>
        <h2>Comment jouer</h2>
      </div>
      <div className="rules-step-list">
        {playSteps.map((step, index) => (
          <article className="rules-step-card" key={step}>
            <strong>{index + 1}</strong>
            <p>{step}</p>
          </article>
        ))}
      </div>
      <p className="rules-helper">Les pronostics se ferment automatiquement au coup d’envoi.</p>
    </section>

    <section className="rules-section">
      <div className="rules-section-title">
        <span>02</span>
        <h2>Comment gagner des points</h2>
      </div>
      <div className="points-rule-list">
        {pointRules.map((rule) => (
          <article className="points-rule-card" key={rule.title}>
            <div className="points-badge">{rule.points}</div>
            <div className="points-rule-content">
              <h3>{rule.title}</h3>
              <p>{rule.text}</p>
              {rule.detail ? <small className="points-rule-detail">{rule.detail}</small> : null}
              <div className="points-examples">
                {rule.examples.map((example) => (
                  <small key={example}>{example}</small>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>

    <section className="rules-section rules-info-grid">
      <article className="rules-info-card boost-card">
        <span>03</span>
        <h2>Boosts</h2>
        <p>Certains matchs peuvent compter x2 ou plus.</p>
        <strong>Sur un match boosté x2, un score exact vaut 6 points au lieu de 3.</strong>
      </article>

      <article className="rules-info-card prizes-card">
        <span>04</span>
        <h2>Classement et lots</h2>
        <p>Le classement est mis à jour avec les points gagnés sur les matchs terminés.</p>
        <ul>
          {prizes.map((prize) => (
            <li key={prize}>{prize}</li>
          ))}
        </ul>
      </article>
    </section>

    <section className="technical-warning-card" aria-labelledby="technical-warning-title">
      <h2 id="technical-warning-title">⚠️ Important — problème technique</h2>
      <p>
        Le jeu de pronostics est une animation gratuite proposée par le bar Le Diplomate. En cas de problème technique important, de bug, de perte de données, d’erreur de classement, d’indisponibilité du site ou de défaillance liée aux scores/matchs, l’organisation se réserve le droit de corriger, suspendre ou arrêter le jeu à tout moment.
      </p>
      <p>
        Le lot final est attribué uniquement si le jeu peut aller normalement jusqu’à la fin de la compétition et si le classement final est considéré comme fiable.
      </p>
    </section>
  </div>
);

export default ReglementPage;
