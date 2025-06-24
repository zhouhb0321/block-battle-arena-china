
import React, { createContext, useContext, useState, useCallback } from 'react';

export interface TetrominoType {
  shape: number[][];
  color: string;
  type: 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
}

export interface GamePiece {
  type: TetrominoType;
  x: number;
  y: number;
  rotation: number;
}

export interface GameState {
  board: number[][];
  currentPiece: GamePiece | null;
  nextPieces: TetrominoType[];
  holdPiece: TetrominoType | null;
  canHold: boolean;
  score: number;
  lines: number;
  level: number;
  gameOver: boolean;
  paused: boolean;
}

export interface GameSettings {
  das: number; // Delayed Auto Shift
  arr: number; // Auto Repeat Rate
  sdf: number; // Soft Drop Factor
  controls: {
    moveLeft: string;
    moveRight: string;
    softDrop: string;
    hardDrop: string;
    rotateClockwise: string;
    rotateCounterclockwise: string;
    rotate180: string;
    hold: string;
    pause: string;
  };
}

interface GameContextType {
  gameState: GameState;
  gameSettings: GameSettings;
  updateGameSettings: (settings: Partial<GameSettings>) => void;
  resetGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
}

const TETROMINOS: { [key: string]: TetrominoType } = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: '#00f0f0',
    type: 'I'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#f0f000',
    type: 'O'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#a000f0',
    type: 'T'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: '#00f000',
    type: 'S'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: '#f00000',
    type: 'Z'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#0000f0',
    type: 'J'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#f0a000',
    type: 'L'
  }
};

const createEmptyBoard = (): number[][] => {
  return Array(20).fill(null).map(() => Array(10).fill(0));
};

const generateSevenBag = (): TetrominoType[] => {
  const pieces = Object.values(TETROMINOS);
  const bag = [...pieces];
  
  // Fisher-Yates shuffle
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  
  return bag;
};

const initialGameState: GameState = {
  board: createEmptyBoard(),
  currentPiece: null,
  nextPieces: generateSevenBag(),
  holdPiece: null,
  canHold: true,
  score: 0,
  lines: 0,
  level: 1,
  gameOver: false,
  paused: false
};

const defaultGameSettings: GameSettings = {
  das: 10, // 10 frames (167ms at 60fps)
  arr: 2,  // 2 frames (33ms at 60fps)
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
  }
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [gameSettings, setGameSettings] = useState<GameSettings>(defaultGameSettings);

  const updateGameSettings = useCallback((settings: Partial<GameSettings>) => {
    setGameSettings(prev => ({ ...prev, ...settings }));
    localStorage.setItem('gameSettings', JSON.stringify({ ...gameSettings, ...settings }));
  }, [gameSettings]);

  const resetGame = useCallback(() => {
    setGameState({
      ...initialGameState,
      nextPieces: generateSevenBag()
    });
  }, []);

  const pauseGame = useCallback(() => {
    setGameState(prev => ({ ...prev, paused: true }));
  }, []);

  const resumeGame = useCallback(() => {
    setGameState(prev => ({ ...prev, paused: false }));
  }, []);

  return (
    <GameContext.Provider value={{
      gameState,
      gameSettings,
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
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
