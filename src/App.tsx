import { Link, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Navigation from './components/Navigation';
import AdminPage from './pages/AdminPage';
import HomePage from './pages/HomePage';
import LeaderboardPage from './pages/LeaderboardPage';
import LoginPage from './pages/LoginPage';
import MatchesPage from './pages/MatchesPage';
import MyPredictionsPage from './pages/MyPredictionsPage';
import PlayerSpacePage from './pages/PlayerSpacePage';

const NotFoundPage = () => (
  <section className="card">
    <h2>Page introuvable</h2>
    <p>Page introuvable — retour à l’accueil.</p>
    <Link className="btn" to="/">
      Retour à l’accueil
    </Link>
  </section>
);

const App = () => (
  <div className="app-shell">
    <Header />
    <Navigation />
    <main>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/matchs" element={<MatchesPage />} />
        <Route path="/mes-pronos" element={<MyPredictionsPage />} />
        <Route path="/classement" element={<LeaderboardPage />} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/espace-joueur" element={<PlayerSpacePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </main>
  </div>
);

export default App;
