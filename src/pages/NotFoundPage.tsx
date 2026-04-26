import EmptyState from '../components/EmptyState';

const NotFoundPage = () => (
  <EmptyState title="Page introuvable" text="Cette page n'existe pas ou a été déplacée." ctaLabel="Retour à l'accueil" to="/" />
);

export default NotFoundPage;
