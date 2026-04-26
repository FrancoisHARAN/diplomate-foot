const RuleCard = ({ title, text }: { title: string; text: string }) => (
  <article className="card">
    <h3>{title}</h3>
    <p>{text}</p>
  </article>
);

export default RuleCard;
