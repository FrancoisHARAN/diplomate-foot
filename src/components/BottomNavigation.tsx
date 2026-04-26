import { NavLink } from 'react-router-dom';
import { usePlayerSession } from '../context/PlayerSessionContext';

const BottomNavigation = () => {
  const { player } = usePlayerSession();

  const navItems = [
    { to: '/', label: 'Accueil' },
    { to: '/matchs', label: 'Matchs' },
    { to: '/mes-pronos', label: 'Pronostics' },
    { to: player ? '/mon-compte' : '/connexion', label: 'Compte' },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navigation mobile">
      {navItems.map((item) => (
        <NavLink key={item.label} to={item.to} end={item.to === '/'} className={({ isActive }) => `bottom-link ${isActive ? 'active' : ''}`}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNavigation;
