import { Link, useNavigate } from 'react-router-dom';
import PlayerAvatar from '../components/PlayerAvatar';
import { usePlayerSession } from '../context/PlayerSessionContext';
import { mockPlayers } from '../data/mockPlayers';
import { useLiveMatches } from '../hooks/useLiveMatches';
import { countUserPredictions, getStoredPredictions, getUserPointsMock, getUserRankMock, setPlayerProfileImage } from '../utils/appState';

const resizeImageFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture impossible'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image impossible à charger'));
      img.onload = () => {
        const size = 250;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Canvas indisponible'));
          return;
        }
        const scale = Math.max(size / img.width, size / img.height);
        const width = img.width * scale;
        const height = img.height * scale;
        context.drawImage(img, (size - width) / 2, (size - height) / 2, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

const PlayerSpacePage = () => {
  const navigate = useNavigate();
  const { player, logout, refreshPlayer } = usePlayerSession();
  const { matches } = useLiveMatches();

  if (!player) {
    return (
      <section className="empty-state">
        <strong>Mon compte</strong>
        <p>Connecte-toi pour voir ton score, ton rang et tes pronostics.</p>
        <Link className="btn primary" to="/connexion">Connexion</Link>
      </section>
    );
  }

  const playerData = mockPlayers.find((item) => item.id === player.id);
  const predictionByMatch = new Set(getStoredPredictions().filter((prediction) => prediction.playerId === player.id).map((prediction) => prediction.matchId));
  const toPredict = matches.filter((match) => match.status !== 'finished' && !predictionByMatch.has(match.id)).length;

  return (
    <div className="screen-stack">
      <section className="profile-panel">
        <PlayerAvatar nickname={player.nickname} avatarUrl={player.avatarUrl} size="xlarge" />
        <div>
          <p className="eyebrow">Compte joueur</p>
          <h1>{player.nickname}</h1>
          <p>{getUserPointsMock(matches)} pts · rang #{getUserRankMock(matches)}</p>
        </div>
        <label className="photo-upload">
          <input
            type="file"
            accept="image/*"
            onChange={async (event) => {
              const file = event.currentTarget.files?.[0];
              if (!file) return;
              const imageDataUrl = await resizeImageFile(file);
              setPlayerProfileImage(player.id, imageDataUrl);
              refreshPlayer();
            }}
          />
          <span>Changer la photo</span>
        </label>
      </section>

      <section className="quick-stats">
        <article>
          <small>Pronos</small>
          <strong>{countUserPredictions()}</strong>
        </article>
        <article>
          <small>À faire</small>
          <strong>{toPredict}</strong>
        </article>
        <article>
          <small>Exacts</small>
          <strong>{playerData?.exactScores ?? 0}</strong>
        </article>
        <article>
          <small>Bons</small>
          <strong>{playerData?.correctResults ?? 0}</strong>
        </article>
      </section>

      <section className="action-list">
        <Link className="action-row" to="/mes-pronos">
          <span>Mes pronos</span>
          <strong>Ouvrir</strong>
        </Link>
        <Link className="action-row" to="/matchs">
          <span>Faire un prono</span>
          <strong>Matchs</strong>
        </Link>
        <Link className="action-row" to="/classement">
          <span>Classement du bar</span>
          <strong>Voir</strong>
        </Link>
        <Link className="action-row" to="/reglement">
          <span>Règlement</span>
          <strong>Lire</strong>
        </Link>
      </section>

      <button
        className="btn ghost danger"
        onClick={() => {
          logout();
          navigate('/');
        }}
        type="button"
      >
        Déconnexion
      </button>
    </div>
  );
};

export default PlayerSpacePage;
