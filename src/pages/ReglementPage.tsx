const playSteps = [
  'Connecte-toi avec ton pseudo et ton code.',
  'Choisis un match ouvert.',
  'Entre ton score avant le coup d’envoi.',
];

const pointRules = [
  {
    points: '4 pts',
    title: 'Score exact',
    text: 'Tu trouves exactement le score final.',
    examples: ['Prono 2 - 1, résultat 2 - 1.', 'Nul exact : prono 1 - 1, résultat 1 - 1.'],
  },
  {
    points: '2 pts',
    title: 'Bon écart',
    text: 'Tu as le bon gagnant et le bon écart de buts.',
    detail: 'Uniquement si une équipe gagne. Un nul non exact vaut 1 pt, pas 2.',
    examples: ['Prono 1 - 0, résultat 3 - 2.', 'Prono 2 - 1, résultat 1 - 0.'],
  },
  {
    points: '1 pt',
    title: 'Bon gagnant / bon nul',
    text: 'Tu as le bon gagnant sans le bon écart, ou tu as prévu un nul sans le score exact.',
    examples: ['Prono 2 - 0, résultat 3 - 2.', 'Prono 0 - 0, résultat 2 - 2.'],
  },
  {
    points: '0 pt',
    title: 'Prono perdu',
    text: 'Le résultat ne correspond pas à ton prono.',
    examples: ['Prono victoire domicile, résultat victoire extérieur.'],
  },
];

const prizes = [
  '1er : 50 € de consommation au bar',
  '2e : 25 € de consommation au bar',
  '3e : 10 € de consommation au bar',
];

const boosts = [
  'France : x2',
  'Huitièmes : x2',
  'Quarts : x3',
  'Demies : x4',
  'Finale : x5',
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
        <p>Certains matchs multiplient les points.</p>
        <ul>
          {boosts.map((boost) => (
            <li key={boost}>{boost}</li>
          ))}
        </ul>
        <strong>Les boosts ne se cumulent pas : le plus fort s’applique.</strong>
      </article>

      <article className="rules-info-card">
        <span>04</span>
        <h2>Paris flash</h2>
        <p>Des défis flash peuvent apparaître sur certains gros matchs.</p>
        <strong>Ils ferment au coup d’envoi. Points accordés uniquement si ta réponse est correcte.</strong>
      </article>
    </section>

    <section className="rules-section rules-info-grid">
      <article className="rules-info-card">
        <span>05</span>
        <h2>Prédiction champion du monde</h2>
        <p>Classe tes 3 favoris.</p>
        <strong>Si le champion est dans ton top 3 : 20, 15 ou 10 pts.</strong>
      </article>

      <article className="rules-info-card prizes-card">
        <span>06</span>
        <h2>Classement et lots</h2>
        <p>Le classement suit les points validés.</p>
        <p>Les lots sont des consommations au bar.</p>
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
