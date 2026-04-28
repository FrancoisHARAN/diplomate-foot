const ReglementPage = () => (
  <div className="stack">
    <section className="card stack-sm">
      <h2>Comment participer</h2>
      <p>Demande ton pseudo/code au comptoir.</p>
      <p>Connecte-toi puis fais tes pronos.</p>
    </section>

    <section className="card stack-sm">
      <h2>Fermeture des pronos</h2>
      <p>Les pronostics ferment 1h avant le début du match.</p>
    </section>

    <section className="card stack-sm">
      <h2>Points</h2>
      <p>Score exact = 3 points</p>
      <p>Bon écart avec bon vainqueur = 2 points</p>
      <p>Bon vainqueur = 1 point</p>
      <p>Mauvais résultat = 0 point</p>
    </section>

    <section className="card stack-sm">
      <h2>Exemple</h2>
      <p>Résultat : France 2 - 1 Canada</p>
      <p>Prono 2 - 1 = 3 pts</p>
      <p>Prono 3 - 2 = 2 pts</p>
      <p>Prono 3 - 1 = 1 pt</p>
      <p>Prono Canada gagnant = 0 pt</p>
    </section>

    <section className="card stack-sm">
      <h2>Lot final</h2>
      <p>Le gagnant remporte 50 € de consommation.</p>
    </section>
  </div>
);

export default ReglementPage;
