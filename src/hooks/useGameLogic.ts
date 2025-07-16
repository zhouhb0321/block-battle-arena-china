
import { useState, useCallback, useRef, useEffect } from 'react';
import { BOARD_WIDTH, BOARD_HEIGHT, calculateDropPosition as tetrisCalculateDropPosition } from '@/utils/tetrisCore';
import { generatePiece, PIECE_COLORS } from '@/utils/pieceGeneration';
import { performSRSRotation } from '@/utils/srsRotation';
import { calculateScore, calculateLevel } from '@/utils/scoringSystem';
import { detectTSpin } from '@/utils/tspinDetection';
import { useUndoRedo } from './useUndoRedo';

export interface Position {
  x: number;
  y: number;
}

export interface Piece {
  shape: number[][];
  x: number;
  y: number;
  type: string;
  rotation: number;
}

export interface GameState {
  board: number[][];
  currentPiece: Piece | null;
  nextPieces: Piece[];
  heldPiece: Piece | null;
  canHold: boolean;
  score: number;
  lines: number;
  level: number;
  gameOver: boolean;
  isPaused: boolean;
  lastMoveTime: number;
  dropTime: number;
  lockDelay: number;
  lockDelayTimer: number;
  combo: number;
  b2b: number;
  allClear: boolean;
  statistics: { [key: string]: number };
  pieces: number;
  attack: number;
  startTime: number | null;
}

const createEmptyBoard = (): number[][] => {
  return Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
};

const initialState: GameState = {
  board: createEmptyBoard(),
  currentPiece: null,
  nextPieces: [],
  heldPiece: null,
  canHold: true,
  score: 0,
  lines: 0,
  level: 1,
  gameOver: false,
  isPaused: false,
  lastMoveTime: 0,
  dropTime: 1000,
  lockDelay: 500,
  lockDelayTimer: 0,
  combo: 0,
  b2b: 0,
  allClear: false,
  statistics: { I: 0, O: 0, T: 0, S: 0, Z: 0, J: 0, L: 0 },
  pieces: 0,
  attack: 0,
  startTime: null
};

export const useGameLogic = (gameMode: string = 'marathon') => {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const gameStateRef = useRef(gameState);
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  
  // Keep ref in sync with state
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Add countdown control methods
  const startCountdown = useCallback(() => {
    setIsCountdownActive(true);
  }, []);

  const endCountdown = useCallback(() => {
    setIsCountdownActive(false);
  }, []);

  const isValidPosition = useCallback((piece: Piece, newX: number, newY: number, newShape?: number[][]): boolean => {
    const shape = newShape || piece.shape;
    
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardX = newX + x;
          const boardY = newY + y;
          
          if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
            return false;
          }
          
          if (boardY >= 0 && gameStateRef.current.board[boardY][boardX] !== 0) {
            return false;
          }
        }
      }
    }
    return true;
  }, []);

  // Use the tetrisCore calculateDropPosition function
  const calculateDropPosition = useCallback((piece: Piece): number => {
    if (!piece || !gameStateRef.current?.board) return piece?.y || 0;
    
    return tetrisCalculateDropPosition(gameStateRef.current.board, piece as any);
  }, []);

  const lockPiece = useCallback((piece: Piece, board: number[][]) => {
    console.log('Locking piece at position:', { x: piece.x, y: piece.y, type: piece.type });
    
    const newBoard = board.map(row => [...row]);
    
    // Place the piece on the board with piece type IDs
    const pieceTypeIds: { [key: string]: number } = {
      'I': 1, 'O': 2, 'T': 3, 'S': 4, 'Z': 5, 'J': 6, 'L': 7
    };
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardY = piece.y + y;
          const boardX = piece.x + x;
          
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            // Use piece type ID
            newBoard[boardY][boardX] = pieceTypeIds[piece.type] || 1;
            console.log(`Placed ${piece.type} block at [${boardY}][${boardX}]`);
          }
        }
      }
    }
    
    return newBoard;
  }, []);

  const clearLines = useCallback((board: number[][]) => {
    const newBoard = [...board];
    const clearedLines: number[] = [];
    
    // Find lines to clear
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (newBoard[y].every(cell => cell !== 0)) {
        clearedLines.push(y);
      }
    }
    
    // Remove cleared lines and add new empty lines at top
    clearedLines.forEach(() => {
      newBoard.splice(clearedLines[0], 1);
      newBoard.unshift(Array(BOARD_WIDTH).fill(0));
    });
    
    return {
      board: newBoard,
      linesCleared: clearedLines.length
    };
  }, []);

  const spawnPiece = useCallback(() => {
    const piece = generatePiece();
    const startX = Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2);
    const startY = 0; // Start at the very top (hidden row area)
    
    console.log('Spawning new piece:', { type: piece.type, x: startX, y: startY });
    
    return {
      ...piece,
      x: startX,
      y: startY,
      rotation: 0
    };
  }, []);

  const hardDrop = useCallback(() => {
    console.log('Hard drop initiated');
    
    setGameState(prevState => {
      if (!prevState.currentPiece || prevState.gameOver || prevState.isPaused || isCountdownActive) {
        console.log('Hard drop cancelled - no piece or game over/paused/countdown');
        return prevState;
      }
      
      const dropY = calculateDropPosition(prevState.currentPiece);
      console.log('Hard drop to position:', dropY);
      
      const droppedPiece = {
        ...prevState.currentPiece,
        y: dropY
      };
      
      // Lock the piece immediately
      const newBoard = lockPiece(droppedPiece, prevState.board);
      const { board: clearedBoard, linesCleared } = clearLines(newBoard);
      
      // Calculate score for hard drop
      const dropDistance = dropY - prevState.currentPiece.y;
      const hardDropScore = dropDistance * 2;
      
      // Update statistics
      const newStatistics = {
        ...prevState.statistics,
        [droppedPiece.type]: (prevState.statistics[droppedPiece.type] || 0) + 1
      };
      
      // Get next piece from queue and refresh if needed
      let newNextPieces = [...prevState.nextPieces];
      let newCurrentPiece = null;
      
      if (newNextPieces.length > 0) {
        newCurrentPiece = newNextPieces.shift()!;
        // Ensure we have at least 6 pieces in queue
        while (newNextPieces.length < 6) {
          newNextPieces.push(generatePiece());
        }
      } else {
        newCurrentPiece = spawnPiece();
        newNextPieces = Array(6).fill(null).map(() => generatePiece());
      }
      
      // Reset position for new piece
      if (newCurrentPiece) {
        newCurrentPiece.x = Math.floor(BOARD_WIDTH / 2) - Math.floor(newCurrentPiece.shape[0].length / 2);
        newCurrentPiece.y = 0;
      }
      
      console.log('Hard drop completed, lines cleared:', linesCleared);
      
      return {
        ...prevState,
        board: clearedBoard,
        currentPiece: newCurrentPiece,
        nextPieces: newNextPieces,
        score: prevState.score + hardDropScore + (linesCleared * 100),
        lines: prevState.lines + linesCleared,
        canHold: true,
        statistics: newStatistics,
        pieces: prevState.pieces + 1
      };
    });
  }, [calculateDropPosition, lockPiece, clearLines, spawnPiece]);

  const movePiece = useCallback((dx: number, dy: number) => {
    setGameState(prevState => {
      if (!prevState.currentPiece || prevState.gameOver || prevState.isPaused || isCountdownActive) {
        return prevState;
      }
      
      const newX = prevState.currentPiece.x + dx;
      const newY = prevState.currentPiece.y + dy;
      
      if (isValidPosition(prevState.currentPiece, newX, newY)) {
        return {
          ...prevState,
          currentPiece: {
            ...prevState.currentPiece,
            x: newX,
            y: newY
          }
        };
      }
      
      return prevState;
    });
  }, [isValidPosition]);

  const rotatePiece = useCallback((direction: 'clockwise' | 'counterclockwise' | '180') => {
    setGameState(prevState => {
      if (!prevState.currentPiece || prevState.gameOver || prevState.isPaused || isCountdownActive) {
        return prevState;
      }
      
      // Create a GamePiece-like object for SRS rotation
      const gamePiece = {
        type: {
          name: prevState.currentPiece.type,
          type: prevState.currentPiece.type,
          shape: prevState.currentPiece.shape,
          color: PIECE_COLORS[prevState.currentPiece.type] || '#ffffff'
        },
        x: prevState.currentPiece.x,
        y: prevState.currentPiece.y,
        rotation: prevState.currentPiece.rotation
      };
      
      const rotationResult = performSRSRotation(
        prevState.board,
        gamePiece,
        direction === 'clockwise'
      );
      
      if (rotationResult.success && rotationResult.newPiece) {
        return {
          ...prevState,
          currentPiece: {
            ...prevState.currentPiece,
            shape: rotationResult.newPiece.type.shape,
            x: rotationResult.newPiece.x,
            y: rotationResult.newPiece.y,
            rotation: rotationResult.newPiece.rotation
          }
        };
      }
      
      return prevState;
    });
  }, []);

  const holdPiece = useCallback(() => {
    setGameState(prevState => {
      if (!prevState.currentPiece || !prevState.canHold || prevState.gameOver || prevState.isPaused || isCountdownActive) {
        return prevState;
      }
      
      const currentPiece = prevState.currentPiece;
      const heldPiece = prevState.heldPiece;
      
      if (heldPiece) {
        // Swap current and held piece
        return {
          ...prevState,
          currentPiece: {
            ...heldPiece,
            x: Math.floor(BOARD_WIDTH / 2) - Math.floor(heldPiece.shape[0].length / 2),
            y: 0
          },
          heldPiece: {
            ...currentPiece,
            x: 0,
            y: 0
          },
          canHold: false
        };
      } else {
        // Hold current piece and spawn new one
        return {
          ...prevState,
          currentPiece: spawnPiece(),
          heldPiece: {
            ...currentPiece,
            x: 0,
            y: 0
          },
          canHold: false
        };
      }
    });
  }, [spawnPiece]);

  const startGame = useCallback(() => {
    console.log('Starting new game');
    const newPieces = Array(6).fill(null).map(() => generatePiece());  // Generate 6 pieces for proper queue
    
    setGameState({
      ...initialState,
      currentPiece: spawnPiece(),
      nextPieces: newPieces,
      startTime: Date.now()
    });
  }, [spawnPiece]);

  const pauseGame = useCallback(() => {
    setGameState(prevState => ({
      ...prevState,
      isPaused: !prevState.isPaused
    }));
  }, []);

  const resetGame = useCallback(() => {
    console.log('Resetting game');
    setGameState(initialState);
  }, []);

  // Initialize game on first load
  useEffect(() => {
    if (!gameState.currentPiece && !gameState.gameOver) {
      startGame();
    }
  }, []);

  return {
    gameState,
    movePiece,
    rotatePiece,
    hardDrop,
    holdPiece,
    startGame,
    pauseGame,
    resetGame,
    calculateDropPosition,
    startCountdown,
    endCountdown,
    isCountdownActive
  };
};
