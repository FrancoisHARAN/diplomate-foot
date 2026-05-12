import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import AdminPage from './pages/AdminPage';
import HomePage from './pages/HomePage';
import LeaderboardPage from './pages/LeaderboardPage';
import LoginPage from './pages/LoginPage';
import MatchDetailPage from './pages/MatchDetailPage';
import MatchesPage from './pages/MatchesPage';
import MyPredictionsPage from './pages/MyPredictionsPage';
import NotFoundPage from './pages/NotFoundPage';
import PlayerProfilePage from './pages/PlayerProfilePage';
import PlayerSpacePage from './pages/PlayerSpacePage';
import ReglementPage from './pages/ReglementPage';
import TournamentPage from './pages/TournamentPage';

const App = () => (
  <AppLayout>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/matchs" element={<MatchesPage />} />
      <Route path="/matchs/:matchId" element={<MatchDetailPage />} />
      <Route path="/tournoi" element={<TournamentPage />} />
      <Route path="/classement" element={<LeaderboardPage />} />
      <Route path="/joueurs/:playerId" element={<PlayerProfilePage />} />
      <Route path="/mes-pronos" element={<MyPredictionsPage />} />
      <Route path="/mon-compte" element={<PlayerSpacePage />} />
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/reglement" element={<ReglementPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </AppLayout>
);

export default App;
