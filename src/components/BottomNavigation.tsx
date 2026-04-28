import { NavLink } from 'react-router-dom';
import { usePlayerSession } from '../context/PlayerSessionContext';

const BottomNavigation = () => {
  const { player } = usePlayerSession();

  const navItems = [
    { to: '/', label: 'Accueil', icon: '🏠' },
    { to: '/matchs', label: 'Matchs', icon: '⚽' },
    { to: '/classement', label: 'Classement', icon: '🏆' },
    { to: '/mes-pronos', label: 'Pronos', icon: '📝' },
    { to: player ? '/mon-compte' : '/connexion', label: 'Compte', icon: '👤' },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {navItems.map((item) => (
        <NavLink key={item.label} to={item.to} end={item.to === '/'} className={({ isActive }) => `bottom-link ${isActive ? 'active' : ''}`}>
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNavigation;
