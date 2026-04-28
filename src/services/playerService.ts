import { mockPlayers } from '../data/mockPlayers';
import type { Player } from '../types';

export interface AuthPlayer {
  id: string;
  nickname: string;
}

const STORAGE_KEY = 'diplomate.currentPlayer';

export const playerService = {
  getPlayers: async (): Promise<Player[]> => mockPlayers,

  login: async (nickname: string): Promise<AuthPlayer> => {
    const found = mockPlayers.find((p) => p.nickname.toLowerCase() === nickname.toLowerCase()) ?? {
      id: `guest-${Date.now()}`,
      nickname,
    };
    const auth = { id: found.id, nickname: found.nickname };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    return auth;
  },

  getCurrentPlayer: (): AuthPlayer | null => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthPlayer) : null;
  },

  logout: (): void => localStorage.removeItem(STORAGE_KEY),
  list: (): Player[] => mockPlayers,
};
