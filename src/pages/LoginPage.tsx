import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { playerService } from '../services/playerService';

const LoginPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <section>
      <p className="card">Entre ton pseudo et ton code secret pour accéder à la compétition.</p>
      {error ? <p className="card">⚠️ {error}</p> : null}
      <LoginForm
        isLoading={isLoading}
        onSubmit={async (nickname, secretCode) => {
          setError(null);
          setIsLoading(true);

          try {
            await playerService.login(nickname, secretCode);
            navigate('/espace-joueur');
          } catch (loginError) {
            setError(loginError instanceof Error ? loginError.message : 'Connexion impossible.');
          } finally {
            setIsLoading(false);
          }
        }}
      />
    </section>
  );
};

export default LoginPage;
