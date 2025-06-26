
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { TetrominoType, GamePiece, GameState, GameSettings, GameReplay } from '@/utils/gameTypes';
import { generateSevenBag, createEmptyBoard } from '@/utils/tetrisLogic';

interface GameContextType {
  gameState: GameState;
  gameSettings: GameSettings;
  gameReplays: GameReplay[];
  updateGameSettings: (settings: Partial<GameSettings>) => void;
  resetGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  saveReplay: (replay: Omit<GameReplay, 'id' | 'date'>) => void;
}

const initialGameState: GameState = {
  board: createEmptyBoard(),
  currentPiece: null,
  nextPieces: generateSevenBag(),
  holdPiece: null,
  canHold: true,
  score: 0,
  lines: 0,
  level: 1,
  combo: -1,
  b2b: 0,
  pieces: 0,
  startTime: Date.now(),
  paused: false,
  gameOver: false,
  clearingLines: [],
  attack: 0,
  pps: 0,
  apm: 0
};

const defaultGameSettings: GameSettings = {
  das: 167, // 10 frames at 60fps = 167ms
  arr: 33,  // 2 frames at 60fps = 33ms
  sdf: 20, // Soft drop factor
  controls: {
    moveLeft: 'ArrowLeft',
    moveRight: 'ArrowRight',
    softDrop: 'ArrowDown',
    hardDrop: 'Space',
    rotateClockwise: 'ArrowUp',
    rotateCounterclockwise: 'KeyZ',
    rotate180: 'KeyA',
    hold: 'KeyC',
    pause: 'Escape'
  },
  enableGhost: true,
  enableSound: true,
  masterVolume: 50
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [gameSettings, setGameSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem('gameSettings');
    return saved ? { ...defaultGameSettings, ...JSON.parse(saved) } : defaultGameSettings;
  });
  const [gameReplays, setGameReplays] = useState<GameReplay[]>(() => {
    const saved = localStorage.getItem('gameReplays');
    return saved ? JSON.parse(saved) : [];
  });

  const updateGameSettings = useCallback((settings: Partial<GameSettings>) => {
    const newSettings = { ...gameSettings, ...settings };
    setGameSettings(newSettings);
    localStorage.setItem('gameSettings', JSON.stringify(newSettings));
  }, [gameSettings]);

  const resetGame = useCallback(() => {
    setGameState({
      ...initialGameState,
      nextPieces: generateSevenBag(),
      startTime: Date.now()
    });
  }, []);

  const pauseGame = useCallback(() => {
    setGameState(prev => ({ ...prev, paused: true }));
  }, []);

  const resumeGame = useCallback(() => {
    setGameState(prev => ({ ...prev, paused: false }));
  }, []);

  const saveReplay = useCallback((replay: Omit<GameReplay, 'id' | 'date'>) => {
    const newReplay: GameReplay = {
      ...replay,
      id: Date.now().toString(),
      date: new Date().toISOString()
    };
    
    const newReplays = [newReplay, ...gameReplays].slice(0, 50); // 保留最近50个回放
    setGameReplays(newReplays);
    localStorage.setItem('gameReplays', JSON.stringify(newReplays));
  }, [gameReplays]);

  return (
    <GameContext.Provider value={{
      gameState,
      gameSettings,
      gameReplays,
      updateGameSettings,
      resetGame,
      pauseGame,
      resumeGame,
      saveReplay
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
