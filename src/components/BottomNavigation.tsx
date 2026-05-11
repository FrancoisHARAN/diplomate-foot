import { NavLink, useLocation } from 'react-router-dom';
import iconBall from '../assets/icons/icon-ball.svg';
import iconHome from '../assets/icons/icon-home.svg';
import iconProno from '../assets/icons/icon-prono.svg';
import iconRanking from '../assets/icons/icon-ranking.svg';
import iconRules from '../assets/icons/icon-rules.svg';

const navItems = [
  { to: '/', label: 'Accueil', icon: iconHome },
  { to: '/classement', label: 'Classement', icon: iconRanking },
  { to: '/matchs', label: 'Matchs', icon: iconBall },
  { to: '/mes-pronos', label: 'Pronos', icon: iconProno },
  { to: '/reglement', label: 'Règles', icon: iconRules },
];

const BottomNavigation = () => {
  const location = useLocation();

  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {navItems.map((item) => (
        <NavLink
          key={item.label}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => `bottom-link ${isActive ? 'active' : ''}`}
          aria-label={item.label}
          onClick={(event) => {
            if (location.pathname === item.to) event.preventDefault();
          }}
        >
          <span className="bottom-icon" aria-hidden="true">
            <img src={item.icon} alt="" loading="lazy" />
          </span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNavigation;
