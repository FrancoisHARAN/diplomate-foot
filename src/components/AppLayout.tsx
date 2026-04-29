import type { ReactNode } from 'react';
import AppHeader from './AppHeader';
import BottomNavigation from './BottomNavigation';
import ScoreCelebrationStory from './ScoreCelebrationStory';
import { LiveMatchesProvider } from '../hooks/useLiveMatches';

const AppLayout = ({ children }: { children: ReactNode }) => (
  <div className="app-viewport">
    <div className="mobile-app-shell">
      <LiveMatchesProvider>
        <ScoreCelebrationStory />
        <AppHeader />
        <main className="app-main">{children}</main>
        <BottomNavigation />
      </LiveMatchesProvider>
    </div>
  </div>
);

export default AppLayout;
