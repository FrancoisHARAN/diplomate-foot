const prizes = [
  { rank: '1', title: '50 €', text: 'consommation au bar' },
  { rank: '2', title: '25 €', text: 'consommation au bar' },
  { rank: '3', title: '10 €', text: 'consommation au bar' },
];

const PrizePanel = () => (
  <div className="prize-panel">
    {prizes.map((prize) => (
      <article key={prize.rank}>
        <span>{prize.rank}</span>
        <strong>{prize.title}</strong>
        <small>{prize.text}</small>
      </article>
    ))}
  </div>
);

export default PrizePanel;
