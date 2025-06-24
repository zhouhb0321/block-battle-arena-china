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
  startTime: number;
  endTime?: number;
}

export interface GameSettings {
  das: number; // Delayed Auto Shift (ms)
  arr: number; // Auto Repeat Rate (ms)
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
  enableGhost: boolean;
  enableSound: boolean;
  masterVolume: number;
}

export interface GameReplay {
  id: string;
  userId: string;
  gameType: string;
  score: number;
  lines: number;
  duration: number;
  date: string;
  moves: any[];
}

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
  paused: false,
  startTime: Date.now()
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
