import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { playerService } from '../services/playerService';

const LoginPage = () => {
  const navigate = useNavigate();

  return (
    <section>
      <p className="card">Entre ton pseudo et ton code secret pour accéder à la compétition.</p>
      <LoginForm
        onSubmit={(nickname, _secretCode) => {
          playerService.login(nickname);
          navigate('/espace-joueur');
        }}
      />
    </section>
  );
};

export default LoginPage;
