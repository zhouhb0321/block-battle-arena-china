
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
  checkTSpin
} from '@/utils/tetrisLogic';
import type { 
  Board, 
  TetrominoType, 
  GameMode, 
  Position,
  GameStats 
} from '@/utils/gameTypes';

interface UseGameLogicProps {
  gameMode: GameMode;
  onGameEnd: (stats: GameStats) => void;
  onSpecialClear?: (clearType: string, lines: number) => void;
}

export const useGameLogic = ({ gameMode, onGameEnd, onSpecialClear }: UseGameLogicProps) => {
  const [board, setBoard] = useState<Board>(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState<TetrominoType | null>(null);
  const [nextPieces, setNextPieces] = useState<TetrominoType[]>([]);
  const [holdPiece, setHoldPiece] = useState<TetrominoType | null>(null);
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

  const { settings } = useUserSettings();
  const isWindowFocused = useWindowFocus();
  
  const gameStartTime = useRef<number>(Date.now());
  const totalPieces = useRef<number>(0);
  const totalActions = useRef<number>(0);
  const dropTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTSpinCheck = useRef<{ piece: TetrominoType; board: Board } | null>(null);

  // Initialize game
  useEffect(() => {
    const initialPieces = Array.from({ length: 7 }, () => generateRandomPiece());
    setNextPieces(initialPieces);
    setCurrentPiece(initialPieces[0]);
    setNextPieces(prev => prev.slice(1));
  }, []);

  // Game timer
  useEffect(() => {
    if (gameOver || isPaused || !isWindowFocused) return;

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
  }, [gameOver, isPaused, isWindowFocused]);

  // Auto drop logic
  useEffect(() => {
    if (gameOver || isPaused || !currentPiece || !isWindowFocused || isHardDropping) return;

    const dropInterval = Math.max(50, 1000 - (level - 1) * 50);
    
    dropTimer.current = setTimeout(() => {
      movePiece('down');
    }, dropInterval);

    return () => {
      if (dropTimer.current) {
        clearTimeout(dropTimer.current);
      }
    };
  }, [currentPiece, level, gameOver, isPaused, isWindowFocused, isHardDropping]);

  const spawnNewPiece = useCallback(() => {
    if (nextPieces.length === 0) return;

    const newPiece = nextPieces[0];
    const newNextPieces = nextPieces.slice(1);
    
    if (newNextPieces.length < 3) {
      newNextPieces.push(...Array.from({ length: 7 }, () => generateRandomPiece()));
    }

    setCurrentPiece(newPiece);
    setNextPieces(newNextPieces);
    setCanHold(true);
    totalPieces.current++;

    // Check for game over
    if (!isValidPosition(board, newPiece, newPiece.position)) {
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

    const newBoard = board.map(row => [...row]);
    
    // Place piece on board
    currentPiece.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          const boardY = currentPiece.position.y + y;
          const boardX = currentPiece.position.x + x;
          if (boardY >= 0 && boardY < 20 && boardX >= 0 && boardX < 10) {
            newBoard[boardY][boardX] = currentPiece.type;
          }
        }
      });
    });

    // Check for T-Spin before clearing lines
    const isTSpin = currentPiece.type === 'T' && lastTSpinCheck.current && 
                   checkTSpin(lastTSpinCheck.current.board, lastTSpinCheck.current.piece);

    // Clear lines
    const { clearedBoard, linesCleared, clearedRows } = clearLines(newBoard);
    
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

  const movePiece = useCallback((direction: 'left' | 'right' | 'down') => {
    if (!currentPiece || gameOver || isPaused || isHardDropping) return;

    const newPosition: Position = { ...currentPiece.position };
    
    switch (direction) {
      case 'left':
        newPosition.x -= 1;
        totalActions.current++;
        break;
      case 'right':
        newPosition.x += 1;
        totalActions.current++;
        break;
      case 'down':
        newPosition.y += 1;
        break;
    }

    if (isValidPosition(board, currentPiece, newPosition)) {
      setCurrentPiece(prev => prev ? { ...prev, position: newPosition } : null);
    } else if (direction === 'down') {
      // Piece can't move down, lock it
      lockPiece();
    }
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, lockPiece]);

  const hardDrop = useCallback(() => {
    if (!currentPiece || gameOver || isPaused || isHardDropping) return;

    setIsHardDropping(true);
    
    const dropPosition = calculateDropPosition(board, currentPiece);
    const dropDistance = dropPosition.y - currentPiece.position.y;
    
    // Add hard drop score
    setScore(prev => prev + dropDistance * 2);
    totalActions.current++;
    
    // Move piece to drop position
    setCurrentPiece(prev => prev ? { ...prev, position: dropPosition } : null);
    
    // Lock immediately after hard drop
    setTimeout(() => {
      lockPiece();
      setIsHardDropping(false);
    }, 50);
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, lockPiece]);

  const rotatePieceClockwise = useCallback(() => {
    if (!currentPiece || gameOver || isPaused || isHardDropping) return;

    // Store current state for T-Spin detection
    lastTSpinCheck.current = {
      piece: { ...currentPiece },
      board: board.map(row => [...row])
    };

    const rotatedPiece = rotatePiece(currentPiece, 'clockwise');
    
    if (isValidPosition(board, rotatedPiece, rotatedPiece.position)) {
      setCurrentPiece(rotatedPiece);
      totalActions.current++;
    } else {
      lastTSpinCheck.current = null;
    }
  }, [currentPiece, board, gameOver, isPaused, isHardDropping]);

  const rotatePieceCounterclockwise = useCallback(() => {
    if (!currentPiece || gameOver || isPaused || isHardDropping) return;

    // Store current state for T-Spin detection
    lastTSpinCheck.current = {
      piece: { ...currentPiece },
      board: board.map(row => [...row])
    };

    const rotatedPiece = rotatePiece(currentPiece, 'counterclockwise');
    
    if (isValidPosition(board, rotatedPiece, rotatedPiece.position)) {
      setCurrentPiece(rotatedPiece);
      totalActions.current++;
    } else {
      lastTSpinCheck.current = null;
    }
  }, [currentPiece, board, gameOver, isPaused, isHardDropping]);

  const holdCurrentPiece = useCallback(() => {
    if (!currentPiece || !canHold || gameOver || isPaused || isHardDropping) return;

    if (holdPiece === null) {
      setHoldPiece(currentPiece);
      spawnNewPiece();
    } else {
      const tempPiece = holdPiece;
      setHoldPiece(currentPiece);
      setCurrentPiece({
        ...tempPiece,
        position: { x: 4, y: 0 }
      });
    }
    
    setCanHold(false);
    totalActions.current++;
  }, [currentPiece, holdPiece, canHold, gameOver, isPaused, isHardDropping, spawnNewPiece]);

  // Calculate ghost piece
  const ghostPiece = currentPiece ? {
    ...currentPiece,
    position: calculateDropPosition(board, currentPiece)
  } : null;

  // Keyboard controls
  useKeyboardControls({
    onMoveLeft: () => movePiece('left'),
    onMoveRight: () => movePiece('right'),
    onSoftDrop: () => movePiece('down'),
    onHardDrop: hardDrop,
    onRotateClockwise: rotatePieceClockwise,
    onRotateCounterclockwise: rotatePieceCounterclockwise,
    onHold: holdCurrentPiece,
    onPause: () => setIsPaused(prev => !prev),
    isEnabled: !gameOver && !isPaused && !!currentPiece && !isHardDropping
  });

  return {
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
    isHardDropping
  };
};
