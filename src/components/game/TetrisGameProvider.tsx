import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useUserSettings } from '@/hooks/useUserSettings';
import type { GameMode, GameSettings, GameStats } from '@/utils/gameTypes';
import GameOverDialog from '@/components/GameOverDialog';

interface TetrisGameContextType {
  gameLogic: ReturnType<typeof useGameLogic>;
  gameSettings: GameSettings;
  gameMode: GameMode;
  keyboardLoopRef: React.MutableRefObject<number | null>;
}

const TetrisGameContext = createContext<TetrisGameContextType | null>(null);

export const useTetrisGame = () => {
  const context = useContext(TetrisGameContext);
  if (!context) {
    throw new Error('useTetrisGame must be used within TetrisGameProvider');
  }
  return context;
};

interface TetrisGameProviderProps {
  children: React.ReactNode;
  gameMode: GameMode;
  onBackToMenu: () => void;
  onRestart: () => void;
}

export const TetrisGameProvider: React.FC<TetrisGameProviderProps> = ({
  children,
  gameMode,
  onBackToMenu,
  onRestart,
}) => {
  const { settings } = useUserSettings();
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalStats, setFinalStats] = useState<GameStats | null>(null);
  const keyboardLoopRef = useRef<number | null>(null);
  const gameSettings: GameSettings = React.useMemo(() => ({
      enableGhost: settings.enableGhost,
      enableSound: settings.enableSound,
      masterVolume: settings.masterVolume,
      arr: settings.arr,
      das: settings.das,
      sdf: settings.sdf,
      controls: settings.controls,
      backgroundMusic: settings.backgroundMusic || '',
      musicVolume: settings.musicVolume || 30,
      ghostOpacity: settings.ghostOpacity || 50,
      enableWallpaper: settings.enableWallpaper,
      undoSteps: settings.undoSteps,
      wallpaperChangeInterval: settings.wallpaperChangeInterval || 120
  }), [settings]);

  const handleGameEnd = useCallback((stats: GameStats) => {
    setFinalStats(stats);
    setIsGameOver(true);
  }, []);

  const gameLogic = useGameLogic({
    gameMode,
    onGameEnd: handleGameEnd,
    undoSteps: gameSettings.undoSteps,
  });

  const contextValue = {
    gameLogic,
    gameSettings,
    gameMode,
    keyboardLoopRef,
  };

  return (
    <TetrisGameContext.Provider value={contextValue}>
      {children}
      <GameOverDialog
        isOpen={isGameOver}
        score={finalStats?.score ?? 0}
        lines={finalStats?.lines ?? 0}
        level={finalStats?.level ?? 0}
        time={finalStats?.time ?? 0}
        gameMode={gameMode.displayName}
        onRestart={onRestart}
        onBackToMenu={onBackToMenu}
        isEndlessMode={gameMode.id === 'endless'}
      />
    </TetrisGameContext.Provider>
  );
};
