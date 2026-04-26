import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { playerService } from '../services/playerService';

const LoginPage = () => {
  const navigate = useNavigate();

  return (
    <LoginForm
      onSubmit={(nickname, _secretCode) => {
        playerService.login(nickname);
        navigate('/espace-joueur');
      }}
    />
  );
};

export default LoginPage;
