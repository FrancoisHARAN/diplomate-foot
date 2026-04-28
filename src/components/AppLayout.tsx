import type { ReactNode } from 'react';
import AppHeader from './AppHeader';
import BottomNavigation from './BottomNavigation';

const AppLayout = ({ children }: { children: ReactNode }) => (
  <div className="app-viewport">
    <div className="mobile-app-shell">
      <AppHeader />
      <main className="app-main">{children}</main>
      <BottomNavigation />
    </div>
  </div>
);

export default AppLayout;
