import { Link } from 'react-router-dom';

const EmptyState = ({ title, text, ctaLabel, to }: { title: string; text: string; ctaLabel?: string; to?: string }) => (
  <article className="card">
    <h3>{title}</h3>
    <p>{text}</p>
    {ctaLabel && to ? (
      <Link className="btn" to={to}>
        {ctaLabel}
      </Link>
    ) : null}
  </article>
);

export default EmptyState;
