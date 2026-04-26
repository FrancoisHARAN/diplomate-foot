import RuleCard from '../components/RuleCard';

const ReglementPage = () => (
  <div className="stack">
    <RuleCard title="Comment participer" text="Récupère ton pseudo et ton code secret au bar Le Diplomate." />
    <RuleCard title="Quand pronostiquer" text="Tu peux pronostiquer jusqu'à 1h avant le coup d'envoi." />
    <RuleCard title="Règles des points" text="Score exact = 3 points, bon écart = 2, bon vainqueur = 1, sinon 0." />
    <RuleCard title="Exemple" text="Tu joues 2-1 et le score final est 2-1 : tu marques 3 points." />
    <RuleCard title="Lot final" text="Le gagnant remporte 50 € de consommation." />
  </div>
);

export default ReglementPage;
