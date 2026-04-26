import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Accueil' },
  { to: '/matchs', label: 'Matchs' },
  { to: '/classement', label: 'Classement' },
  { to: '/mes-pronos', label: 'Mes pronos' },
  { to: '/mon-compte', label: 'Compte' },
];

const BottomNavigation = () => (
  <nav className="bottom-nav">
    {navItems.map((item) => (
      <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `bottom-link ${isActive ? 'active' : ''}`}>
        {item.label}
      </NavLink>
    ))}
  </nav>
);

export default BottomNavigation;
