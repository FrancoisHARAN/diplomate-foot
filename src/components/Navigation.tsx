import { NavLink } from 'react-router-dom';
import { usePlayerSession } from '../context/PlayerSessionContext';

const Navigation = () => {
  const { player } = usePlayerSession();

  const links = [
    { to: '/', label: 'Accueil' },
    { to: '/matchs', label: 'Matchs' },
    { to: '/classement', label: 'Classement' },
    ...(player
      ? [
          { to: '/mes-pronos', label: 'Mes pronos' },
          { to: '/espace-joueur', label: 'Espace joueur' },
        ]
      : [{ to: '/connexion', label: 'Connexion' }]),
    { to: '/admin', label: 'Admin' },
  ];

  return (
    <nav className="main-nav card" aria-label="Navigation principale">
      {links.map((link) => (
        <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
};

export default Navigation;
