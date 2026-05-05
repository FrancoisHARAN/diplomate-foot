import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getCurrentPlayer, logoutPlayer, syncCloudState, type CurrentPlayer } from '../utils/appState';

interface PlayerSessionContextValue {
  player: CurrentPlayer | null;
  refreshPlayer: () => void;
  logout: () => void;
}

const PlayerSessionContext = createContext<PlayerSessionContextValue | undefined>(undefined);

export const PlayerSessionProvider = ({ children }: { children: ReactNode }) => {
  const [player, setPlayer] = useState<CurrentPlayer | null>(() => getCurrentPlayer());
  const [syncVersion, setSyncVersion] = useState(0);

  const refreshPlayer = useCallback(() => {
    setPlayer(getCurrentPlayer());
    setSyncVersion((value) => value + 1);
  }, []);

  const logout = useCallback(() => {
    logoutPlayer();
    setPlayer(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    void syncCloudState().then((synced) => {
      if (!mounted || !synced) return;
      setPlayer(getCurrentPlayer());
      setSyncVersion((value) => value + 1);
    });

    return () => {
      mounted = false;
    };
  }, [player?.id]);

  const value = useMemo(() => ({ player, refreshPlayer, logout }), [player, refreshPlayer, logout, syncVersion]);

  return <PlayerSessionContext.Provider value={value}>{children}</PlayerSessionContext.Provider>;
};

export const usePlayerSession = (): PlayerSessionContextValue => {
  const context = useContext(PlayerSessionContext);
  if (!context) throw new Error('usePlayerSession must be used inside PlayerSessionProvider');
  return context;
};
