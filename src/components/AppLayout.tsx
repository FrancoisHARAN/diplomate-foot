import type { ReactNode } from 'react';
import AppHeader from './AppHeader';
import BottomNavigation from './BottomNavigation';

const AppLayout = ({ children }: { children: ReactNode }) => (
  <div className="mobile-app-shell">
    <AppHeader />
    <main className="app-main">{children}</main>
    <BottomNavigation />
  </div>
);

export default AppLayout;
