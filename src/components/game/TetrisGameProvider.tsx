import React, { createContext, useContext, useRef, useState } from 'react';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useUserSettings } from '@/hooks/useUserSettings';
import type { GameMode, GameSettings, GameStats } from '@/utils/gameTypes';
import GameOverDialog from '@/components/GameOverDialog';

interface TetrisGameContextType {
  gameLogic: ReturnType<typeof useGameLogic>;
  gameSettings: GameSettings;
  gameMode: GameMode;
  keyboardLoopRef: React.MutableRefObject<number | null>;
  onRestart: () => void;
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
  const keyboardLoopRef = useRef<number | null>(null);
  const gameSettings: GameSettings = React.useMemo(() => ({
      enableGhost: settings.enableGhost,
      enableSound: settings.enableSound,
      masterVolume: settings.masterVolume,
      arr: settings.arr,
      das: settings.das,
      sdf: settings.sdf,
      dcd: settings.dcd,
      controls: settings.controls,
      backgroundMusic: settings.backgroundMusic || '',
      musicVolume: settings.musicVolume || 30,
      ghostOpacity: settings.ghostOpacity || 50,
      enableWallpaper: settings.enableWallpaper,
      undoSteps: settings.undoSteps,
      wallpaperChangeInterval: settings.wallpaperChangeInterval || 120
  }), [settings]);

  // The onGameEnd callback is removed.
  const gameLogic = useGameLogic({
    gameMode,
    // @ts-ignore - Temporarily ignore while refactoring. Will be removed from hook next.
    onGameEnd: () => {},
    undoSteps: gameSettings.undoSteps,
  });

  const value = {
    gameLogic,
    gameSettings,
    gameMode,
    keyboardLoopRef,
    onRestart,
  };

  return (
    <TetrisGameContext.Provider value={value}>
      {children}
      <GameOverDialog
        isOpen={gameLogic.gameOver}
        score={gameLogic.score}
        lines={gameLogic.lines}
        level={gameLogic.level}
        time={gameLogic.time}
        gameMode={gameMode.displayName}
        onRestart={onRestart}
        onBackToMenu={onBackToMenu}
        isEndlessMode={gameMode.id === 'endless'}
        isNewRecord={gameLogic.isNewRecord}
      />
    </TetrisGameContext.Provider>
  );
};
