import { useEffect, useState } from 'react';
import AdminPanel from '../components/AdminPanel';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { matchService } from '../services/matchService';
import { playerService } from '../services/playerService';
import type { Player } from '../types';

const AdminPage = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const loadPlayers = async () => {
    const nextPlayers = await playerService.getPlayers();
    setPlayers(nextPlayers);
  };

  useEffect(() => {
    void loadPlayers();
  }, []);

  return (
    <section>
      {message ? <p className="card">{message}</p> : null}
      <AdminPanel
        players={players}
        isSupabaseConfigured={isSupabaseConfigured}
        modeLabel={isSupabaseConfigured ? 'Supabase' : 'Données fictives locales'}
        onCreateTestPlayer={async () => {
          try {
            const created = await playerService.createPlayer(`test-${Date.now()}`, '1234');
            setMessage(`✅ Joueur créé: ${created.nickname}`);
            await loadPlayers();
          } catch (error) {
            setMessage(error instanceof Error ? `⚠️ ${error.message}` : '⚠️ Création impossible.');
          }
        }}
        onCreateTestMatches={async () => {
          try {
            const count = await matchService.createTestMatches();
            setMessage(
              count > 0
                ? `✅ ${count} matchs de test créés / mis à jour dans Supabase.`
                : 'ℹ️ Supabase non configuré, action ignorée.',
            );
          } catch (error) {
            setMessage(error instanceof Error ? `⚠️ ${error.message}` : '⚠️ Création impossible.');
          }
        }}
      />
    </section>
  );
};

export default AdminPage;
