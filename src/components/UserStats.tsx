const UserStats = ({ items }: { items: Array<{ label: string; value: string | number }> }) => (
  <section className="stats-grid">
    {items.map((item) => (
      <article className="card" key={item.label}>
        <p>{item.label}</p>
        <strong>{item.value}</strong>
      </article>
    ))}
  </section>
);

export default UserStats;
