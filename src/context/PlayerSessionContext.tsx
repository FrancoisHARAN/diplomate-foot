import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { getCurrentPlayer, logoutPlayer, type CurrentPlayer } from '../utils/appState';

interface PlayerSessionContextValue {
  player: CurrentPlayer | null;
  refreshPlayer: () => void;
  logout: () => void;
}

const PlayerSessionContext = createContext<PlayerSessionContextValue | undefined>(undefined);

export const PlayerSessionProvider = ({ children }: { children: ReactNode }) => {
  const [player, setPlayer] = useState<CurrentPlayer | null>(() => getCurrentPlayer());

  const refreshPlayer = useCallback(() => {
    setPlayer(getCurrentPlayer());
  }, []);

  const logout = useCallback(() => {
    logoutPlayer();
    setPlayer(null);
  }, []);

  const value = useMemo(() => ({ player, refreshPlayer, logout }), [player, refreshPlayer, logout]);

  return <PlayerSessionContext.Provider value={value}>{children}</PlayerSessionContext.Provider>;
};

export const usePlayerSession = (): PlayerSessionContextValue => {
  const context = useContext(PlayerSessionContext);
  if (!context) throw new Error('usePlayerSession must be used inside PlayerSessionProvider');
  return context;
};
