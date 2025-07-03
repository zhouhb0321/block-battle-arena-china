
import React, { createContext, useContext, useRef } from 'react';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useUserSettings } from '@/hooks/useUserSettings';
import { calculateDropSpeed } from '@/utils/gravitySystem';
import type { GameMode, GameSettings } from '@/utils/gameTypes';

interface TetrisGameContextType {
  gameLogic: ReturnType<typeof useGameLogic>;
  gameSettings: GameSettings;
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
}

export const TetrisGameProvider: React.FC<TetrisGameProviderProps> = ({
  children,
  gameMode
}) => {
  const { settings } = useUserSettings();
  const keyboardLoopRef = useRef<number | null>(null);

  const gameSettings: GameSettings = {
    enableGhost: settings.enableGhost,
    enableSound: settings.enableSound,
    masterVolume: settings.masterVolume,
    arr: settings.arr,
    das: settings.das,
    sdf: settings.sdf,
    controls: settings.controls,
    backgroundMusic: settings.backgroundMusic || '',
    musicVolume: settings.musicVolume || 30,
    ghostOpacity: settings.ghostOpacity || 50
  };

  const gameLogic = useGameLogic(gameMode, gameSettings, calculateDropSpeed);

  const contextValue: TetrisGameContextType = {
    gameLogic,
    gameSettings,
    keyboardLoopRef
  };

  return (
    <TetrisGameContext.Provider value={contextValue}>
      {children}
    </TetrisGameContext.Provider>
  );
};
