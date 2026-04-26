import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { playerService, type AuthPlayer } from '../services/playerService';

interface PlayerSessionContextValue {
  player: AuthPlayer | null;
  refreshPlayer: () => void;
  logout: () => void;
}

const PlayerSessionContext = createContext<PlayerSessionContextValue | undefined>(undefined);

export const PlayerSessionProvider = ({ children }: { children: ReactNode }) => {
  const [player, setPlayer] = useState<AuthPlayer | null>(() => playerService.getCurrentPlayer());

  const refreshPlayer = useCallback(() => {
    setPlayer(playerService.getCurrentPlayer());
  }, []);

  const logout = useCallback(() => {
    playerService.logout();
    setPlayer(null);
  }, []);

  const value = useMemo(
    () => ({
      player,
      refreshPlayer,
      logout,
    }),
    [player, refreshPlayer, logout],
  );

  return <PlayerSessionContext.Provider value={value}>{children}</PlayerSessionContext.Provider>;
};

export const usePlayerSession = (): PlayerSessionContextValue => {
  const context = useContext(PlayerSessionContext);
  if (!context) {
    throw new Error('usePlayerSession must be used inside PlayerSessionProvider');
  }
  return context;
};
