const prizes = [
  { rank: '1', title: '20 €', text: 'conso au bar' },
  { rank: '2', title: 'Pizza', text: 'au Diplomate' },
  { rank: '3', title: 'Saucisson', text: 'à partager' },
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
