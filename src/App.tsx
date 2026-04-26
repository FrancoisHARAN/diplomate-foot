import { Navigate, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Navigation from './components/Navigation';
import AdminPage from './pages/AdminPage';
import HomePage from './pages/HomePage';
import LeaderboardPage from './pages/LeaderboardPage';
import LoginPage from './pages/LoginPage';
import MatchesPage from './pages/MatchesPage';
import PlayerSpacePage from './pages/PlayerSpacePage';

const App = () => (
  <div className="app-shell">
    <Header />
    <Navigation />
    <main>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/matchs" element={<MatchesPage />} />
        <Route path="/classement" element={<LeaderboardPage />} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/espace-joueur" element={<PlayerSpacePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  </div>
);

export default App;
