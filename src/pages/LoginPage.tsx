import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { loginPlayer } from '../utils/appState';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshPlayer } = usePlayerSession();
  const [nickname, setNickname] = useState('Nico');
  const [code, setCode] = useState('1234');
  const [error, setError] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    try {
      loginPlayer(nickname, code);
      refreshPlayer();
      const state = location.state as { redirectTo?: string } | undefined;
      navigate(state?.redirectTo ?? '/mon-compte');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible.');
    }
  };

  return (
    <div className="screen-stack">
      <section className="page-hero">
        <p className="eyebrow">Compte joueur</p>
        <h1>Connexion</h1>
        <p>Entre le pseudo et le code secret donnés au comptoir.</p>
      </section>

      <form className="auth-panel" onSubmit={submit}>
        <label>
          Pseudo
          <input value={nickname} onChange={(event) => setNickname(event.target.value)} required autoComplete="username" />
        </label>
        <label>
          Code secret
          <input value={code} onChange={(event) => setCode(event.target.value)} required inputMode="numeric" autoComplete="current-password" />
        </label>
        {error ? <p className="error-msg">{error}</p> : null}
        <button className="btn primary" type="submit">Entrer dans la compétition</button>
      </form>

      <section className="notice-panel compact">
        <strong>Compte de test</strong>
        <p>Nico / 1234 fonctionne tout de suite. Les autres joueurs fictifs ont aussi leur code dans les mocks.</p>
        <Link className="text-link" to="/reglement">Voir le règlement</Link>
      </section>
    </div>
  );
};

export default LoginPage;
