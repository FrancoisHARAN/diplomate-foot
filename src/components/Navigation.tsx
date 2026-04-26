import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Accueil' },
  { to: '/matchs', label: 'Matchs' },
  { to: '/classement', label: 'Classement' },
  { to: '/connexion', label: 'Connexion' },
  { to: '/espace-joueur', label: 'Espace joueur' },
  { to: '/admin', label: 'Admin' },
];

const Navigation = () => (
  <nav className="main-nav card" aria-label="Navigation principale">
    {links.map((link) => (
      <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
        {link.label}
      </NavLink>
    ))}
  </nav>
);

export default Navigation;
