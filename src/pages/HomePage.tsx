import { Link } from 'react-router-dom';

const matches = [
  'France vs Canada — 12 juin 2026 — 21:00',
  'Brésil vs Maroc — 13 juin 2026 — 18:00',
  'Argentine vs Japon — 14 juin 2026 — 20:00',
  'Espagne vs Sénégal — 15 juin 2026 — 19:00',
];

const standings = ['1. Nico — 12 pts', '2. Sarah — 10 pts', '3. Marco — 8 pts', '4. Julie — 6 pts', '5. Alex — 4 pts'];

const HomePage = () => (
  <section className="home-landing card">
    <p className="landing-brand">LE DIPLOMATE</p>
    <h2>Pronos Coupe du Monde 2026</h2>

    <div className="hero-words">
      <span>PRONOSTIQUE</span>
      <span>GAGNE</span>
      <span>FÊTE LE FOOT</span>
    </div>

    <div className="landing-grid">
      <article className="promo-card promo-yellow">
        <h3>1er prix : 50 € de consommation</h3>
        <p>Ambiance bar, compétition et bonne humeur à chaque match.</p>
      </article>

      <article className="promo-card promo-purple">
        <h3>Faire mes pronos</h3>
        <Link className="round-btn" to="/matchs" aria-label="Faire mes pronostics">→</Link>
      </article>

      <article className="promo-card promo-blue">
        <h3>Prochains matchs</h3>
        <ul>
          {matches.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>

      <article className="promo-card promo-green">
        <h3>Classement du bar</h3>
        <ol>
          {standings.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </article>

      <article className="promo-card promo-red">
        <h3>Règles des points</h3>
        <p>Score exact = 3 pts · Bon écart = 2 pts · Bon résultat = 1 pt.</p>
      </article>
    </div>

    <div className="cta-row">
      <Link className="btn" to="/matchs">Faire mes pronos</Link>
      <Link className="btn secondary" to="/classement">Voir le classement</Link>
    </div>
  </section>
);

export default HomePage;
