import { useState } from 'react';

interface LoginFormProps {
  onSubmit: (nickname: string, secretCode: string) => void;
}

const LoginForm = ({ onSubmit }: LoginFormProps) => {
  const [nickname, setNickname] = useState('');
  const [secretCode, setSecretCode] = useState('');

  return (
    <form
      className="card login-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(nickname.trim(), secretCode.trim());
      }}
    >
      <h2>Connexion</h2>
      <label>
        Pseudo
        <input required value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="Nico" />
      </label>
      <label>
        Code secret
        <input required value={secretCode} onChange={(event) => setSecretCode(event.target.value)} placeholder="1234" />
      </label>
      <button className="btn" type="submit">Entrer dans la compétition</button>
    </form>
  );
};

export default LoginForm;
