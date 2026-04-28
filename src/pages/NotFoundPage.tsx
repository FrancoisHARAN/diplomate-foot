import { Link } from 'react-router-dom';

const NotFoundPage = () => (
  <section className="empty-state">
    <strong>Page introuvable</strong>
    <p>Cette page n’existe pas ou n’est plus disponible.</p>
    <Link className="btn primary" to="/">Retour à l’accueil</Link>
  </section>
);

export default NotFoundPage;
