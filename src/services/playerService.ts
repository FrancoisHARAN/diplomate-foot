import { mockPlayers } from '../data/mockPlayers';
import type { Player } from '../types';
import { STORAGE_KEYS } from './storageKeys';

export interface AuthPlayer {
  id: string;
  nickname: string;
}

export const playerService = {
  list: (): Player[] => mockPlayers,
  login: (nickname: string): AuthPlayer => {
    const known = mockPlayers.find((player) => player.nickname.toLowerCase() === nickname.toLowerCase());
    const authPlayer: AuthPlayer = known
      ? { id: known.id, nickname: known.nickname }
      : { id: `guest-${nickname.toLowerCase()}`, nickname };

    localStorage.setItem(STORAGE_KEYS.authPlayer, JSON.stringify(authPlayer));
    return authPlayer;
  },
  getCurrent: (): AuthPlayer | null => {
    const raw = localStorage.getItem(STORAGE_KEYS.authPlayer);
    return raw ? (JSON.parse(raw) as AuthPlayer) : null;
  },
  logout: (): void => {
    localStorage.removeItem(STORAGE_KEYS.authPlayer);
  },
};
