
import { useState, useEffect, useCallback, useRef } from 'react';
import { useKeyboardControls } from './useKeyboardControls';
import { useUserSettings } from './useUserSettings';
import { useWindowFocus } from './useWindowFocus';
import { 
  createEmptyBoard, 
  TETROMINO_TYPES, 
  rotatePiece, 
  isValidPosition,
  clearLines,
  calculateDropPosition,
  generateRandomPiece,
  checkTSpin,
  placePiece
} from '@/utils/tetrisLogic';
import type { 
  Board, 
  TetrominoType, 
  GameMode, 
  Position,
  GameStats,
  GamePiece
} from '@/utils/gameTypes';

interface UseGameLogicProps {
  gameMode: GameMode;
  onGameEnd: (stats: GameStats) => void;
  onSpecialClear?: (clearType: string, lines: number) => void;
}

export const useGameLogic = ({ gameMode, onGameEnd, onSpecialClear }: UseGameLogicProps) => {
  const [board, setBoard] = useState<Board>(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState<GamePiece | null>(null);
  const [nextPieces, setNextPieces] = useState<GamePiece[]>([]);
  const [holdPiece, setHoldPiece] = useState<GamePiece | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [pps, setPps] = useState(0);
  const [apm, setApm] = useState(0);
  const [isHardDropping, setIsHardDropping] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const { settings } = useUserSettings();
  const isWindowFocused = useWindowFocus();
  
  const gameStartTime = useRef<number>(Date.now());
  const totalPieces = useRef<number>(0);
  const totalActions = useRef<number>(0);
  const dropTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTSpinCheck = useRef<{ piece: GamePiece; board: Board } | null>(null);

  // Helper function to create a GamePiece from TetrominoType
  const createGamePiece = (pieceType: TetrominoType): GamePiece => ({
    type: pieceType,
    x: 4,
    y: 0,
    rotation: 0
  });

  // Initialize game
  useEffect(() => {
    const initialPieces = Array.from({ length: 7 }, () => createGamePiece(generateRandomPiece()));
    setNextPieces(initialPieces);
    setCurrentPiece(initialPieces[0]);
    setNextPieces(prev => prev.slice(1));
  }, []);

  // Game timer
  useEffect(() => {
    if (gameOver || isPaused || !isWindowFocused || !gameStarted) return;

    const timer = setInterval(() => {
      setTime(prev => prev + 1);
      
      // Calculate PPS and APM
      const elapsedTime = (Date.now() - gameStartTime.current) / 1000;
      if (elapsedTime > 0) {
        setPps(totalPieces.current / elapsedTime);
        setApm((totalActions.current / elapsedTime) * 60);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameOver, isPaused, isWindowFocused, gameStarted]);

  // Auto drop logic
  useEffect(() => {
    if (gameOver || isPaused || !currentPiece || !isWindowFocused || isHardDropping || !gameStarted) return;

    const dropInterval = Math.max(50, 1000 - (level - 1) * 50);
    
    dropTimer.current = setTimeout(() => {
      movePiece(0, 1);
    }, dropInterval);

    return () => {
      if (dropTimer.current) {
        clearTimeout(dropTimer.current);
      }
    };
  }, [currentPiece, level, gameOver, isPaused, isWindowFocused, isHardDropping, gameStarted]);

  const spawnNewPiece = useCallback(() => {
    if (nextPieces.length === 0) return;

    const newPiece = nextPieces[0];
    const newNextPieces = nextPieces.slice(1);
    
    if (newNextPieces.length < 3) {
      newNextPieces.push(...Array.from({ length: 7 }, () => createGamePiece(generateRandomPiece())));
    }

    setCurrentPiece(newPiece);
    setNextPieces(newNextPieces);
    setCanHold(true);
    totalPieces.current++;

    // Check for game over
    if (!isValidPosition(board, newPiece)) {
      setGameOver(true);
      onGameEnd({
        score,
        lines,
        level,
        time,
        pps,
        apm,
        gameMode: gameMode.id
      });
    }
  }, [nextPieces, board, score, lines, level, time, pps, apm, gameMode, onGameEnd]);

  const lockPiece = useCallback(() => {
    if (!currentPiece) return;

    const newBoard = placePiece(board, currentPiece);

    // Check for T-Spin before clearing lines
    const isTSpin = currentPiece.type.type === 'T' && lastTSpinCheck.current && 
                   checkTSpin(lastTSpinCheck.current.board, lastTSpinCheck.current.piece, 'rotate');

    // Clear lines
    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
    
    setBoard(clearedBoard);
    
    if (linesCleared > 0) {
      const newLines = lines + linesCleared;
      const newLevel = Math.floor(newLines / 10) + 1;
      let lineScore = 0;
      
      // Calculate score based on clear type
      let clearType = '';
      if (isTSpin) {
        clearType = `tspin_${linesCleared === 3 ? 'triple' : linesCleared === 2 ? 'double' : 'single'}`;
        lineScore = [800, 1200, 1600][linesCleared - 1] * level;
      } else if (linesCleared === 4) {
        clearType = 'tetris';
        lineScore = 800 * level;
      } else {
        lineScore = [100, 300, 500][linesCleared - 1] * level;
      }
      
      setLines(newLines);
      setLevel(newLevel);
      setScore(prev => prev + lineScore);
      
      // Trigger special clear animation
      if (onSpecialClear && (clearType || linesCleared >= 4)) {
        onSpecialClear(clearType || 'tetris', linesCleared);
      }
    }

    // Reset T-Spin check
    lastTSpinCheck.current = null;
    
    // Spawn new piece
    spawnNewPiece();
  }, [currentPiece, board, lines, level, spawnNewPiece, onSpecialClear]);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (!currentPiece || gameOver || isPaused || isHardDropping || !gameStarted) return false;

    const newPosition: Position = { 
      x: currentPiece.x + dx, 
      y: currentPiece.y + dy 
    };
    
    const newPiece = { ...currentPiece, x: newPosition.x, y: newPosition.y };
    
    if (isValidPosition(board, newPiece)) {
      setCurrentPiece(newPiece);
      if (dx !== 0) totalActions.current++;
      return true;
    } else if (dy > 0) {
      // Piece can't move down, lock it
      lockPiece();
      return false;
    }
    return false;
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, lockPiece, gameStarted]);

  const hardDrop = useCallback(() => {
    if (!currentPiece || gameOver || isPaused || isHardDropping || !gameStarted) return;

    setIsHardDropping(true);
    
    const dropY = calculateDropPosition(board, currentPiece);
    const dropDistance = dropY - currentPiece.y;
    
    // Add hard drop score
    setScore(prev => prev + dropDistance * 2);
    totalActions.current++;
    
    // Move piece to drop position
    setCurrentPiece(prev => prev ? { ...prev, y: dropY } : null);
    
    // Lock immediately after hard drop
    setTimeout(() => {
      lockPiece();
      setIsHardDropping(false);
    }, 50);
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, lockPiece, gameStarted]);

  const rotatePieceClockwise = useCallback(() => {
    if (!currentPiece || gameOver || isPaused || isHardDropping || !gameStarted) return;

    // Store current state for T-Spin detection
    lastTSpinCheck.current = {
      piece: { ...currentPiece },
      board: board.map(row => [...row])
    };

    const rotatedType = rotatePiece(currentPiece.type, true);
    const rotatedPiece = { ...currentPiece, type: rotatedType, rotation: (currentPiece.rotation + 1) % 4 };
    
    if (isValidPosition(board, rotatedPiece)) {
      setCurrentPiece(rotatedPiece);
      totalActions.current++;
    } else {
      lastTSpinCheck.current = null;
    }
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, gameStarted]);

  const rotatePieceCounterclockwise = useCallback(() => {
    if (!currentPiece || gameOver || isPaused || isHardDropping || !gameStarted) return;

    // Store current state for T-Spin detection
    lastTSpinCheck.current = {
      piece: { ...currentPiece },
      board: board.map(row => [...row])
    };

    const rotatedType = rotatePiece(currentPiece.type, false);
    const rotatedPiece = { ...currentPiece, type: rotatedType, rotation: (currentPiece.rotation + 3) % 4 };
    
    if (isValidPosition(board, rotatedPiece)) {
      setCurrentPiece(rotatedPiece);
      totalActions.current++;
    } else {
      lastTSpinCheck.current = null;
    }
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, gameStarted]);

  const holdCurrentPiece = useCallback(() => {
    if (!currentPiece || !canHold || gameOver || isPaused || isHardDropping || !gameStarted) return;

    if (holdPiece === null) {
      setHoldPiece(currentPiece);
      spawnNewPiece();
    } else {
      const tempPiece = holdPiece;
      setHoldPiece(currentPiece);
      setCurrentPiece({
        ...tempPiece,
        x: 4,
        y: 0
      });
    }
    
    setCanHold(false);
    totalActions.current++;
  }, [currentPiece, holdPiece, canHold, gameOver, isPaused, isHardDropping, spawnNewPiece, gameStarted]);

  const startGame = useCallback(() => {
    setGameStarted(true);
    gameStartTime.current = Date.now();
  }, []);

  const resetGame = useCallback(() => {
    setBoard(createEmptyBoard());
    setCurrentPiece(null);
    setNextPieces([]);
    setHoldPiece(null);
    setCanHold(true);
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setIsPaused(false);
    setTime(0);
    setPps(0);
    setApm(0);
    setIsHardDropping(false);
    setGameStarted(false);
    totalPieces.current = 0;
    totalActions.current = 0;
    gameStartTime.current = Date.now();
    
    // Reinitialize pieces
    const initialPieces = Array.from({ length: 7 }, () => createGamePiece(generateRandomPiece()));
    setNextPieces(initialPieces);
    setCurrentPiece(initialPieces[0]);
    setNextPieces(prev => prev.slice(1));
  }, []);

  const pauseGame = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeGame = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Calculate ghost piece
  const ghostPiece = currentPiece ? {
    ...currentPiece,
    y: calculateDropPosition(board, currentPiece)
  } : null;

  // Game state object for compatibility
  const gameState = {
    board,
    currentPiece,
    nextPieces,
    holdPiece,
    canHold,
    score,
    lines,
    level,
    gameOver,
    paused: isPaused,
    time,
    pps,
    apm
  };

  return {
    // State properties
    board,
    currentPiece,
    nextPieces,
    holdPiece,
    canHold,
    score,
    lines,
    level,
    gameOver,
    isPaused,
    time,
    pps,
    apm,
    ghostPiece,
    isHardDropping,
    gameState,
    // Action methods
    startGame,
    resetGame,
    pauseGame,
    resumeGame,
    movePiece,
    hardDrop,
    rotatePieceClockwise,
    rotatePieceCounterclockwise,
    rotatePiece180: rotatePieceClockwise, // Placeholder for 180 rotation
    holdCurrentPiece,
    spawnNewPiece,
    lockPiece,
    // Placeholder methods for compatibility
    undoMove: () => {},
    redoMove: () => {},
    canUndo: false,
    canRedo: false
  };
};
