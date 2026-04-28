import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { loginPlayer } from '../utils/appState';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshPlayer } = usePlayerSession();
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');

  return (
    <div className="centered-page">
      <form
        className="card stack-sm"
        onSubmit={(event) => {
          event.preventDefault();
          loginPlayer(nickname, code);
          refreshPlayer();
          const state = location.state as { redirectTo?: string } | undefined;
          navigate(state?.redirectTo ?? '/mon-compte');
        }}
      >
        <h1>Connexion joueur</h1>
        <p>Entre ton pseudo et ton code secret donné au bar.</p>

        <label>Pseudo<input value={nickname} onChange={(event) => setNickname(event.target.value)} required /></label>
        <label>Code secret<input value={code} onChange={(event) => setCode(event.target.value)} required /></label>

        <button className="btn full" type="submit">Entrer dans la compétition</button>
        <p>Pas encore inscrit ? Demande ton code au comptoir.</p>
      </form>
    </div>
  );
};

export default LoginPage;
