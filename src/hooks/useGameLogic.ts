import { useState, useEffect, useCallback, useRef } from 'react';
import { useKeyboardControls } from './useKeyboardControls';
import { useUserSettings } from './useUserSettings';
import { useWindowFocus } from './useWindowFocus';
import { debugLog } from '@/utils/debugLogger';
import { 
  createEmptyBoard, 
  rotatePiece, 
  isValidPosition,
  clearLines,
  calculateDropPosition,
  generateRandomPiece,
  checkTSpin,
  placePiece,
  resetSevenBag,
  createNewPiece
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
  const [gameInitialized, setGameInitialized] = useState(false);

  const { settings } = useUserSettings();
  const isWindowFocused = useWindowFocus();
  
  const gameStartTime = useRef<number>(Date.now());
  const totalPieces = useRef<number>(0);
  const totalActions = useRef<number>(0);
  const dropTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTSpinCheck = useRef<{ piece: GamePiece; board: Board } | null>(null);

  // Helper function to create a GamePiece from TetrominoType
  const createGamePiece = useCallback((pieceType: TetrominoType): GamePiece => {
    return createNewPiece(pieceType);
  }, []);

  // 立即初始化方块队列 - 在倒计时开始时调用
  const initializePieces = useCallback(() => {
    debugLog.game('Initializing pieces for countdown start');
    resetSevenBag();
    
    // 生成7个方块：1个当前方块 + 6个NEXT方块
    const allPieces = Array.from({ length: 7 }, () => createGamePiece(generateRandomPiece()));
    
    setCurrentPiece(allPieces[0]);
    setNextPieces(allPieces.slice(1));
    setGameInitialized(true);
    
    debugLog.game('Pieces initialized', {
      currentPiece: allPieces[0].type.type,
      nextPieces: allPieces.slice(1).map(p => p.type.type)
    });
  }, [createGamePiece]);

  const spawnNewPiece = useCallback(() => {
    if (nextPieces.length === 0) {
      debugLog.warn('No next pieces available for spawning');
      return;
    }

    const newPiece = nextPieces[0];
    const newNextPieces = nextPieces.slice(1);
    
    // 如果下一个方块队列少于4个，添加更多方块
    if (newNextPieces.length < 4) {
      const additionalPieces = Array.from({ length: 7 }, () => createGamePiece(generateRandomPiece()));
      newNextPieces.push(...additionalPieces);
    }

    setCurrentPiece(newPiece);
    setNextPieces(newNextPieces);
    setCanHold(true);
    totalPieces.current++;

    debugLog.game('New piece spawned', {
      piece: newPiece.type.type,
      totalPieces: totalPieces.current
    });

    // Check for game over
    if (!isValidPosition(board, newPiece)) {
      debugLog.game('Game over - no valid position for new piece');
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
  }, [nextPieces, board, score, lines, level, time, pps, apm, gameMode, onGameEnd, createGamePiece]);

  const lockPiece = useCallback(() => {
    if (!currentPiece) return;

    debugLog.game('Locking piece', { piece: currentPiece.type.type });

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
      
      debugLog.game('Lines cleared', {
        linesCleared,
        clearType,
        newLines,
        newLevel,
        lineScore
      });
      
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

  // Define movePiece before using it in useEffect
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

  // Game timer
  useEffect(() => {
    if (gameOver || isPaused || !isWindowFocused || !gameStarted) return;

    const timer = setInterval(() => {
      setTime(prev => prev + 1);
      
      const elapsedTime = (Date.now() - gameStartTime.current) / 1000;
      if (elapsedTime > 0) {
        setPps(totalPieces.current / elapsedTime);
        setApm((totalActions.current / elapsedTime) * 60);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameOver, isPaused, isWindowFocused, gameStarted]);

  // Auto drop logic - 修复自动下落
  useEffect(() => {
    if (gameOver || isPaused || !currentPiece || !isWindowFocused || isHardDropping || !gameStarted) return;

    const dropInterval = Math.max(50, 1000 - (level - 1) * 50);
    
    debugLog.debug('Setting drop timer', { dropInterval, level });
    
    dropTimer.current = setTimeout(() => {
      debugLog.debug('Auto drop triggered');
      movePiece(0, 1);
    }, dropInterval);

    return () => {
      if (dropTimer.current) {
        clearTimeout(dropTimer.current);
      }
    };
  }, [currentPiece, level, gameOver, isPaused, isWindowFocused, isHardDropping, gameStarted, movePiece]);

  // 修复硬降逻辑 - 确保方块立即落到正确位置
  const hardDrop = useCallback(() => {
    if (!currentPiece || gameOver || isPaused || isHardDropping || !gameStarted) return;

    debugLog.game('Hard drop initiated', { currentPiece: currentPiece.type.type });
    
    const dropY = calculateDropPosition(board, currentPiece);
    const dropDistance = dropY - currentPiece.y;
    
    debugLog.game('Hard drop calculation', { 
      currentY: currentPiece.y, 
      dropY, 
      dropDistance 
    });
    
    // Add hard drop score
    setScore(prev => prev + dropDistance * 2);
    totalActions.current++;
    
    // 立即将方块移动到目标位置并锁定
    const droppedPiece = { ...currentPiece, y: dropY };
    setCurrentPiece(droppedPiece);
    
    // 立即锁定方块，不需要延迟
    setTimeout(() => {
      // 使用更新后的位置来锁定方块
      const newBoard = placePiece(board, droppedPiece);
      const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
      
      setBoard(clearedBoard);
      
      if (linesCleared > 0) {
        const newLines = lines + linesCleared;
        const newLevel = Math.floor(newLines / 10) + 1;
        const lineScore = linesCleared === 4 ? 800 * level : [100, 300, 500][linesCleared - 1] * level;
        
        setLines(newLines);
        setLevel(newLevel);
        setScore(prev => prev + lineScore);
        
        if (onSpecialClear && linesCleared >= 4) {
          onSpecialClear('tetris', linesCleared);
        }
      }
      
      // 生成新方块
      spawnNewPiece();
    }, 50);
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, gameStarted, lines, level, onSpecialClear, spawnNewPiece]);

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
    debugLog.game('Starting game logic...');
    setGameStarted(true);
    gameStartTime.current = Date.now();
    
    // 如果还没有初始化方块，现在初始化
    if (!gameInitialized) {
      initializePieces();
    }
  }, [initializePieces, gameInitialized]);

  // 倒计时开始时就初始化方块 - 新增的函数
  const initializeForCountdown = useCallback(() => {
    debugLog.game('Initializing for countdown start');
    initializePieces();
  }, [initializePieces]);

  const resetGame = useCallback(() => {
    debugLog.game('Resetting game...');
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
    setGameInitialized(false);
    totalPieces.current = 0;
    totalActions.current = 0;
    gameStartTime.current = Date.now();
  }, []);

  const pauseGame = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeGame = useCallback(() => {
    setIsPaused(false);
  }, []);

  const ghostPiece = currentPiece ? {
    ...currentPiece,
    y: calculateDropPosition(board, currentPiece)
  } : null;

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
    gameInitialized,
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
    initializeForCountdown, // 新增：倒计时开始时初始化
    // Placeholder methods for compatibility
    undoMove: () => {},
    redoMove: () => {},
    canUndo: false,
    canRedo: false
  };
};
