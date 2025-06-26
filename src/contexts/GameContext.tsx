
import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { GameSettings } from '@/utils/gameTypes';

const DEFAULT_SETTINGS: GameSettings = {
  das: 167,
  arr: 33,
  sdf: 20,
  controls: {
    moveLeft: 'ArrowLeft',
    moveRight: 'ArrowRight',
    softDrop: 'ArrowDown',
    hardDrop: 'Space',
    rotateClockwise: 'ArrowUp',
    rotateCounterclockwise: 'KeyZ',
    rotate180: 'KeyA',
    hold: 'KeyC',
    pause: 'Escape',
    backToMenu: 'KeyB'
  },
  enableGhost: true,
  enableSound: true,
  masterVolume: 50,
  backgroundMusic: '',
  musicVolume: 30
};

interface GameContextType {
  gameSettings: GameSettings;
  updateSettings: (settings: Partial<GameSettings>) => void;
  updateGameSettings: (settings: Partial<GameSettings>) => void;
  resetGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameSettings, setGameSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  const updateSettings = (settings: Partial<GameSettings>) => {
    setGameSettings(prev => ({ ...prev, ...settings }));
  };

  const updateGameSettings = (settings: Partial<GameSettings>) => {
    setGameSettings(prev => ({ ...prev, ...settings }));
  };

  const resetGame = () => {
    console.log('Game reset');
  };

  const pauseGame = () => {
    console.log('Game paused');
  };

  const resumeGame = () => {
    console.log('Game resumed');
  };

  return (
    <GameContext.Provider value={{
      gameSettings,
      updateSettings,
      updateGameSettings,
      resetGame,
      pauseGame,
      resumeGame
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
