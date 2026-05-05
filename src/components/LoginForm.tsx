import { useState } from 'react';

interface LoginFormProps {
  onSubmit: (nickname: string, secretCode: string) => void | Promise<void>;
  isLoading?: boolean;
}

const LoginForm = ({ onSubmit, isLoading = false }: LoginFormProps) => {
  const [nickname, setNickname] = useState('');
  const [secretCode, setSecretCode] = useState('');

  return (
    <form
      className="card login-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(nickname.trim(), secretCode.trim());
      }}
    >
      <h2>Connexion</h2>
      <label>
        Pseudo
        <input
          required
          disabled={isLoading}
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="Nico"
        />
      </label>
      <label>
        Code secret
        <input
          required
          disabled={isLoading}
          value={secretCode}
          onChange={(event) => setSecretCode(event.target.value)}
          placeholder="Code à 6 chiffres"
        />
      </label>
      <button className="btn" type="submit" disabled={isLoading}>
        {isLoading ? 'Connexion...' : 'Entrer dans la compétition'}
      </button>
    </form>
  );
};

export default LoginForm;
