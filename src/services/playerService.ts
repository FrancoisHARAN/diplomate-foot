import { mockPlayers } from '../data/mockPlayers';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type { Player } from '../types';
import { hashSecretCode } from '../utils/security';
import { STORAGE_KEYS } from './storageKeys';

export interface AuthPlayer {
  id: string;
  nickname: string;
}

interface PlayerRow {
  id: string;
  nickname: string;
  code_hash: string;
  is_admin: boolean;
  is_active: boolean;
}

const readPlayersStorage = (): Player[] => {
  const raw = localStorage.getItem(STORAGE_KEYS.players);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Player[];
  } catch {
    return [];
  }
};

const writePlayersStorage = (players: Player[]): void => {
  localStorage.setItem(STORAGE_KEYS.players, JSON.stringify(players));
};

const getFallbackPlayers = (): Player[] => {
  const stored = readPlayersStorage();
  if (stored.length > 0) return stored;
  writePlayersStorage(mockPlayers);
  return mockPlayers;
};

const saveAuthPlayer = (player: AuthPlayer | null): void => {
  if (!player) {
    localStorage.removeItem(STORAGE_KEYS.authPlayer);
    return;
  }
  localStorage.setItem(STORAGE_KEYS.authPlayer, JSON.stringify(player));
};

const mapSupabasePlayerToPlayer = (player: PlayerRow): Player => ({
  id: player.id,
  nickname: player.nickname,
  points: 0,
  exactScores: 0,
  correctResults: 0,
});

export const playerService = {
  getPlayers: async (): Promise<Player[]> => {
    if (!isSupabaseConfigured || !supabase) return getFallbackPlayers();

    try {
      const { data, error } = await supabase
        .from('players')
        .select('id,nickname,code_hash,is_admin,is_active')
        .eq('is_active', true)
        .order('nickname', { ascending: true });

      if (error) throw error;
      return (data ?? []).map(mapSupabasePlayerToPlayer);
    } catch (error) {
      console.warn('Unable to read players from Supabase, fallback to local data.', error);
      return getFallbackPlayers();
    }
  },

  createPlayer: async (nickname: string, secretCode: string): Promise<AuthPlayer> => {
    const cleanNickname = nickname.trim();
    const cleanSecret = secretCode.trim();

    if (!isSupabaseConfigured || !supabase) {
      const players = getFallbackPlayers();
      const existing = players.find((player) => player.nickname.toLowerCase() === cleanNickname.toLowerCase());
      const player: Player = existing ?? {
        id: `p-${Date.now()}`,
        nickname: cleanNickname,
        secretCode: cleanSecret,
        points: 0,
        exactScores: 0,
        correctResults: 0,
      };

      if (!existing) writePlayersStorage([...players, player]);
      return { id: player.id, nickname: player.nickname };
    }

    const codeHash = await hashSecretCode(cleanSecret);
    const { data, error } = await supabase
      .from('players')
      .insert({ nickname: cleanNickname, code_hash: codeHash })
      .select('id,nickname')
      .single();

    if (error) throw error;

    const created = data;
    if (!created) throw new Error('Impossible de créer le joueur.');
    return { id: created.id, nickname: created.nickname };
  },

  login: async (nickname: string, secretCode: string): Promise<AuthPlayer> => {
    const cleanNickname = nickname.trim();
    const cleanSecret = secretCode.trim();

    if (!isSupabaseConfigured || !supabase) {
      const players = getFallbackPlayers();
      const known = players.find((player) => player.nickname.toLowerCase() === cleanNickname.toLowerCase());
      if (!known || known.secretCode !== cleanSecret) throw new Error('Pseudo ou code secret invalide.');
      const authPlayer: AuthPlayer = { id: known.id, nickname: known.nickname };
      saveAuthPlayer(authPlayer);
      return authPlayer;
    }

    const { data, error } = await supabase
      .from('players')
      .select('id,nickname,code_hash,is_admin,is_active')
      .eq('nickname', cleanNickname)
      .eq('is_active', true)
      .limit(1);

    if (error) throw error;

    const found = data?.[0];
    if (!found) throw new Error('Pseudo ou code secret invalide.');

    const incomingHash = await hashSecretCode(cleanSecret);
    if (found.code_hash !== incomingHash) throw new Error('Pseudo ou code secret invalide.');

    const authPlayer: AuthPlayer = { id: found.id, nickname: found.nickname };
    saveAuthPlayer(authPlayer);
    return authPlayer;
  },

  getCurrentPlayer: (): AuthPlayer | null => {
    const raw = localStorage.getItem(STORAGE_KEYS.authPlayer);
    return raw ? (JSON.parse(raw) as AuthPlayer) : null;
  },

  logout: (): void => saveAuthPlayer(null),

  list: (): Player[] => getFallbackPlayers(),
  getCurrent: (): AuthPlayer | null => playerService.getCurrentPlayer(),
};
