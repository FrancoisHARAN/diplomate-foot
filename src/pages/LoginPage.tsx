import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageTitle from '../components/PageTitle';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { playerService } from '../services/playerService';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshPlayer } = usePlayerSession();
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="stack">
      <PageTitle title="Connexion joueur" subtitle="Entre ton pseudo et ton code secret donné au bar." />
      <form
        className="card stack"
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            await playerService.login(nickname, code);
            refreshPlayer();
            const state = location.state as { from?: string } | undefined;
            navigate(state?.from ?? '/mon-compte');
          } catch (loginError) {
            setError(loginError instanceof Error ? loginError.message : 'Connexion impossible');
          }
        }}
      >
        <label>Pseudo<input value={nickname} onChange={(event) => setNickname(event.target.value)} required /></label>
        <label>Code secret<input value={code} onChange={(event) => setCode(event.target.value)} required /></label>
        <button className="btn" type="submit">Entrer dans la compétition</button>
        {error ? <p>⚠️ {error}</p> : null}
      </form>
      <section className="card">Pas encore inscrit ? Demande ton code au comptoir.</section>
    </div>
  );
};

export default LoginPage;
