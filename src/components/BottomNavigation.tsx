import { NavLink, useLocation } from 'react-router-dom';
import iconBall from '../assets/icons/icon-ball.svg';
import iconHome from '../assets/icons/icon-home.svg';
import iconProno from '../assets/icons/icon-prono.svg';
import iconRanking from '../assets/icons/icon-ranking.svg';
import iconRules from '../assets/icons/icon-rules.svg';
import { useLiveMatches } from '../hooks/useLiveMatches';
import { isLiveDisplayMatch } from '../utils/date';

const navItems = [
  { to: '/', label: 'Accueil', icon: iconHome },
  { to: '/classement', label: 'Classement', icon: iconRanking },
  { to: '/matchs', label: 'Matchs', icon: iconBall },
  { to: '/mes-pronos', label: 'Pronos', icon: iconProno },
  { to: '/reglement', label: 'Règles', icon: iconRules },
];

const BottomNavigation = () => {
  const location = useLocation();
  const { matches } = useLiveMatches();
  const liveCount = matches.filter((match) => isLiveDisplayMatch(match)).length;
  const liveCountLabel = liveCount > 9 ? '9+' : String(liveCount);

  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {navItems.map((item) => {
        const hasLiveBadge = item.to === '/matchs' && liveCount > 0;
        const liveAria = hasLiveBadge ? `, ${liveCount} match${liveCount > 1 ? 's' : ''} en live` : '';

        return (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `bottom-link ${isActive ? 'active' : ''} ${hasLiveBadge ? 'has-live' : ''}`}
            aria-label={`${item.label}${liveAria}`}
            onClick={(event) => {
              if (location.pathname === item.to) event.preventDefault();
            }}
          >
            <span className="bottom-icon" aria-hidden="true">
              <img src={item.icon} alt="" loading="lazy" />
              {hasLiveBadge ? <span className="bottom-live-badge">{liveCountLabel}</span> : null}
            </span>
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default BottomNavigation;
