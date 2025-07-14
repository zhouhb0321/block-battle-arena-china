import { useState, useEffect, useCallback, useRef } from 'react';
import { useKeyboardControls } from './useKeyboardControls';
import { useUserSettings } from './useUserSettings';
import { useWindowFocus } from './useWindowFocus';
import { debugLog } from '@/utils/debugLogger';
import { 
  createEmptyBoard, 
  isValidPosition,
  clearLines,
  calculateDropPosition,
  generateRandomPiece,
  checkTSpin,
  placePiece,
  resetSevenBag,
  createNewPiece,
  performSRSRotation,
  performSRS180Rotation
} from '@/utils/tetrisLogic';
import type { 
  Board, 
  TetrominoType, 
  GameMode, 
  Position,
  GameStats,
  GamePiece,
  GameState
} from '@/utils/gameTypes';

interface UseGameLogicProps {
  gameMode: GameMode;
  onGameEnd: (stats: GameStats) => void;
  onSpecialClear?: (clearType: string, lines: number) => void;
  onAchievement?: (achievement: { linesCleared: number; tSpinResult: any; combo: number; b2b: number; tetris: boolean }) => void;
}

export const useGameLogic = ({ gameMode, onGameEnd, onSpecialClear, onAchievement }: UseGameLogicProps) => {
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
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [pps, setPps] = useState(0);
  const [apm, setApm] = useState(0);
  const [isHardDropping, setIsHardDropping] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameInitialized, setGameInitialized] = useState(false);
  const [combo, setCombo] = useState(-1);
  const [b2b, setB2b] = useState(0);

  // 锁定延迟相关状态
  const [isLockDelayActive, setIsLockDelayActive] = useState(false);
  const [lockDelayResetCount, setLockDelayResetCount] = useState(0);
  
  const { settings } = useUserSettings();
  const { isWindowFocused, wasManuallyPaused, setWasManuallyPaused } = useWindowFocus();
  
  const gameStartTime = useRef<number>(Date.now());
  const totalPieces = useRef<number>(0);
  const totalActions = useRef<number>(0);
  const dropTimer = useRef<NodeJS.Timeout | null>(null);
  const lockDelayTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTSpinCheck = useRef<{ piece: GamePiece; board: Board; wasKicked: boolean } | null>(null);
  const lastMoveWasRotation = useRef<boolean>(false);

  const LOCK_DELAY_TIME = 500;
  const MAX_LOCK_RESETS = 15;

  // Helper function to create a GamePiece from TetrominoType
  const createGamePiece = useCallback((pieceType: TetrominoType): GamePiece => {
    return createNewPiece(pieceType);
  }, []);

  // 应用游戏状态 - 用于撤销/重做
  const applyGameState = useCallback((gameState: GameState) => {
    setBoard(gameState.board);
    setCurrentPiece(gameState.currentPiece);
    setNextPieces(gameState.nextPieces);
    setHoldPiece(gameState.holdPiece);
    setCanHold(gameState.canHold);
    setScore(gameState.score);
    setLines(gameState.lines);
    setLevel(gameState.level);
    setGameOver(gameState.gameOver);
    setIsPaused(gameState.paused);
    setPps(gameState.pps);
    setApm(gameState.apm);
    setCombo(gameState.combo);
    setB2b(gameState.b2b);
    debugLog.game('游戏状态已应用', gameState);
  }, []);

  // 智能失焦处理 - 区分手动暂停和自动失焦暂停
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    if (!isWindowFocused && !isPaused) {
      if (!isManuallyPaused) {
        setIsPaused(true);
        debugLog.game('窗口失焦，自动暂停游戏');
      }
    } else if (isWindowFocused && isPaused && !isManuallyPaused) {
      setIsPaused(false);
      debugLog.game('窗口重获焦点，自动恢复游戏');
    }
  }, [isWindowFocused, isPaused, isManuallyPaused, gameStarted, gameOver]);

  // 立即初始化方块队列 - 在倒计时开始时调用
  const initializePieces = useCallback(() => {
    debugLog.game('Initializing pieces for countdown start');
    resetSevenBag();
    
    const allPieces = Array.from({ length: 7 }, () => createGamePiece(generateRandomPiece()));
    
    setCurrentPiece(allPieces[0]);
    setNextPieces(allPieces.slice(1));
    setGameInitialized(true);
    
    debugLog.game('Pieces initialized', {
      currentPiece: allPieces[0].type.type,
      nextPieces: allPieces.slice(1).map(p => p.type.type)
    });
  }, [createGamePiece]);

  const clearLockDelayTimer = useCallback(() => {
    if (lockDelayTimer.current) {
      clearTimeout(lockDelayTimer.current);
      lockDelayTimer.current = null;
    }
    setIsLockDelayActive(false);
  }, []);

  const resetLockDelay = useCallback(() => {
    if (lockDelayResetCount >= MAX_LOCK_RESETS) {
      debugLog.game('锁定延迟重置次数已达上限，强制锁定');
      return false;
    }
    
    clearLockDelayTimer();
    setLockDelayResetCount(prev => prev + 1);
    debugLog.game('锁定延迟重置', { resetCount: lockDelayResetCount + 1 });
    return true;
  }, [clearLockDelayTimer, lockDelayResetCount]);

  const startLockDelay = useCallback(() => {
    if (!currentPiece || isLockDelayActive) return;
    
    const testPiece = { ...currentPiece, y: currentPiece.y + 1 };
    if (isValidPosition(board, testPiece)) {
      return;
    }
    
    setIsLockDelayActive(true);
    debugLog.game('开始锁定延迟', { resetCount: lockDelayResetCount, delayTime: LOCK_DELAY_TIME });
    
    lockDelayTimer.current = setTimeout(() => {
      debugLog.game('锁定延迟结束，锁定方块');
      lockPiece();
    }, LOCK_DELAY_TIME);
  }, [currentPiece, board, lockDelayResetCount]);

  const spawnNewPiece = useCallback(() => {
    if (nextPieces.length === 0) {
      debugLog.warn('No next pieces available for spawning');
      return;
    }

    const newPiece = nextPieces[0];
    const newNextPieces = nextPieces.slice(1);
    
    if (newNextPieces.length < 4) {
      const additionalPieces = Array.from({ length: 7 }, () => createGamePiece(generateRandomPiece()));
      newNextPieces.push(...additionalPieces);
    }

    setCurrentPiece(newPiece);
    setNextPieces(newNextPieces);
    setCanHold(true);
    setLockDelayResetCount(0);
    clearLockDelayTimer();
    totalPieces.current++;
    lastMoveWasRotation.current = false;

    debugLog.game('New piece spawned', {
      piece: newPiece.type.type,
      totalPieces: totalPieces.current
    });

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
  }, [nextPieces, board, score, lines, level, time, pps, apm, gameMode, onGameEnd, createGamePiece, clearLockDelayTimer]);

  const lockPiece = useCallback(() => {
    if (!currentPiece) return;

    debugLog.game('Locking piece', { piece: currentPiece.type.type });
    clearLockDelayTimer();

    const newBoard = placePiece(board, currentPiece);

    // T-Spin 检测
    const tSpinResult = currentPiece.type.type === 'T' && lastMoveWasRotation.current && lastTSpinCheck.current 
      ? checkTSpin(lastTSpinCheck.current.board, lastTSpinCheck.current.piece, 'rotate', lastTSpinCheck.current.wasKicked)
      : null;

    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
    
    setBoard(clearedBoard);
    
    if (linesCleared > 0) {
      const newLines = lines + linesCleared;
      const newLevel = Math.floor(newLines / 10) + 1;
      const newCombo = combo + 1;
      
      // 特殊消行检测
      const isSpecialClear = tSpinResult !== null || linesCleared === 4;
      const newB2B = isSpecialClear ? b2b + 1 : 0;
      const isTetris = linesCleared === 4;
      
      let lineScore = 0;
      let clearType = '';
      
      if (tSpinResult) {
        const miniText = tSpinResult.isMini ? 'Mini ' : '';
        clearType = `T-Spin ${miniText}${['Single', 'Double', 'Triple'][linesCleared - 1]}`;
        lineScore = [800, 1200, 1600][linesCleared - 1] * level;
      } else if (isTetris) {
        clearType = 'Tetris';
        lineScore = 800 * level;
      } else {
        lineScore = [100, 300, 500][linesCleared - 1] * level;
      }
      
      // B2B 奖励
      if (newB2B > 1) {
        lineScore = Math.floor(lineScore * 1.5);
      }
      
      setLines(newLines);
      setLevel(newLevel);
      setScore(prev => prev + lineScore);
      setCombo(newCombo);
      setB2b(newB2B);
      
      // 触发成就检测
      if (onAchievement) {
        onAchievement({
          linesCleared,
          tSpinResult,
          combo: newCombo,
          b2b: newB2B,
          tetris: isTetris
        });
      }
      
      debugLog.game('Lines cleared', {
        linesCleared,
        clearType,
        newLines,
        newLevel,
        lineScore,
        combo: newCombo,
        b2b: newB2B
      });
      
      if (onSpecialClear && (clearType || isTetris)) {
        onSpecialClear(clearType || 'tetris', linesCleared);
      }
    } else {
      setCombo(-1);
    }

    lastTSpinCheck.current = null;
    lastMoveWasRotation.current = false;
    spawnNewPiece();
  }, [currentPiece, board, lines, level, combo, b2b, spawnNewPiece, onSpecialClear, onAchievement, clearLockDelayTimer]);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (!currentPiece || gameOver || isPaused || isHardDropping || !gameStarted) return false;

    const newPosition: Position = { 
      x: currentPiece.x + dx, 
      y: currentPiece.y + dy 
    };
    
    const newPiece = { ...currentPiece, x: newPosition.x, y: newPosition.y };
    
    if (isValidPosition(board, newPiece)) {
      setCurrentPiece(newPiece);
      totalActions.current++;
      lastMoveWasRotation.current = false;
      
      // 横向移动时重置锁定延迟
      if (dx !== 0) {
        const testDownPiece = { ...newPiece, y: newPiece.y + 1 };
        if (!isValidPosition(board, testDownPiece)) {
          if (resetLockDelay()) {
            clearLockDelayTimer();
          }
        }
      }
      return true;
    } else if (dy > 0) {
      startLockDelay();
      return false;
    }
    return false;
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, gameStarted, resetLockDelay, clearLockDelayTimer, startLockDelay]);

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

  const hardDrop = useCallback(() => {
    if (!currentPiece || gameOver || isPaused || isHardDropping || !gameStarted) return;

    debugLog.game('Hard drop initiated', { currentPiece: currentPiece.type.type });
    
    setIsHardDropping(true);
    clearLockDelayTimer();
    
    const dropY = calculateDropPosition(board, currentPiece);
    const dropDistance = dropY - currentPiece.y;
    
    debugLog.game('Hard drop calculation', { 
      currentY: currentPiece.y, 
      dropY, 
      dropDistance 
    });
    
    setScore(prev => prev + dropDistance * 2);
    totalActions.current++;
    
    const droppedPiece = { ...currentPiece, y: dropY };
    setCurrentPiece(droppedPiece);
    
    // 立即锁定方块
    setTimeout(() => {
      lockPiece();
      setIsHardDropping(false);
    }, 50);
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, gameStarted, lockPiece, clearLockDelayTimer]);

  const rotatePieceClockwise = useCallback(() => {
    if (!currentPiece || gameOver || isPaused || isHardDropping || !gameStarted) return;

    debugLog.game('尝试顺时针旋转', { piece: currentPiece.type.type });

    lastTSpinCheck.current = {
      piece: { ...currentPiece },
      board: board.map(row => [...row]),
      wasKicked: false
    };

    const srsResult = performSRSRotation(board, currentPiece, true);
    
    if (srsResult.success && srsResult.newPiece) {
      setCurrentPiece(srsResult.newPiece);
      totalActions.current++;
      lastMoveWasRotation.current = true;
      
      if (lastTSpinCheck.current) {
        lastTSpinCheck.current.wasKicked = srsResult.wasKicked;
      }
      
      if (resetLockDelay()) {
        clearLockDelayTimer();
      }
      
      debugLog.game('旋转成功', { wasKicked: srsResult.wasKicked });
    } else {
      lastTSpinCheck.current = null;
      lastMoveWasRotation.current = false;
      debugLog.game('旋转失败');
    }
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, gameStarted, resetLockDelay, clearLockDelayTimer]);

  const rotatePieceCounterclockwise = useCallback(() => {
    if (!currentPiece || gameOver || isPaused || isHardDropping || !gameStarted) return;

    debugLog.game('尝试逆时针旋转', { piece: currentPiece.type.type });

    lastTSpinCheck.current = {
      piece: { ...currentPiece },
      board: board.map(row => [...row]),
      wasKicked: false
    };

    const srsResult = performSRSRotation(board, currentPiece, false);
    
    if (srsResult.success && srsResult.newPiece) {
      setCurrentPiece(srsResult.newPiece);
      totalActions.current++;
      lastMoveWasRotation.current = true;
      
      if (lastTSpinCheck.current) {
        lastTSpinCheck.current.wasKicked = srsResult.wasKicked;
      }
      
      if (resetLockDelay()) {
        clearLockDelayTimer();
      }
      
      debugLog.game('逆时针旋转成功', { wasKicked: srsResult.wasKicked });
    } else {
      lastTSpinCheck.current = null;
      lastMoveWasRotation.current = false;
      debugLog.game('逆时针旋转失败');
    }
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, gameStarted, resetLockDelay, clearLockDelayTimer]);

  const rotatePiece180 = useCallback(() => {
    if (!currentPiece || gameOver || isPaused || isHardDropping || !gameStarted) return;

    debugLog.game('尝试180度旋转', { piece: currentPiece.type.type });

    lastTSpinCheck.current = {
      piece: { ...currentPiece },
      board: board.map(row => [...row]),
      wasKicked: false
    };

    const srsResult = performSRS180Rotation(board, currentPiece);
    
    if (srsResult.success && srsResult.newPiece) {
      setCurrentPiece(srsResult.newPiece);
      totalActions.current++;
      lastMoveWasRotation.current = true;
      
      if (lastTSpinCheck.current) {
        lastTSpinCheck.current.wasKicked = srsResult.wasKicked;
      }
      
      if (resetLockDelay()) {
        clearLockDelayTimer();
      }
      
      debugLog.game('180度旋转成功', { wasKicked: srsResult.wasKicked });
    } else {
      lastTSpinCheck.current = null;
      lastMoveWasRotation.current = false;
      debugLog.game('180度旋转失败');
    }
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, gameStarted, resetLockDelay, clearLockDelayTimer]);

  const holdCurrentPiece = useCallback(() => {
    if (!currentPiece || !canHold || gameOver || isPaused || isHardDropping || !gameStarted) return;

    clearLockDelayTimer();

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
    lastMoveWasRotation.current = false;
  }, [currentPiece, holdPiece, canHold, gameOver, isPaused, isHardDropping, spawnNewPiece, gameStarted, clearLockDelayTimer]);

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
    apm,
    combo,
    b2b
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
    isManuallyPaused,
    time,
    pps,
    apm,
    ghostPiece,
    isHardDropping,
    gameState,
    gameInitialized,
    isLockDelayActive,
    lockDelayResetCount,
    combo,
    b2b,
    // Action methods
    startGame: useCallback(() => {
      debugLog.game('Starting game logic...');
      setGameStarted(true);
      gameStartTime.current = Date.now();
      
      if (!gameInitialized) {
        initializePieces();
      }
    }, [gameInitialized]),
    resetGame: useCallback(() => {
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
      setIsManuallyPaused(false);
      setTime(0);
      setPps(0);
      setApm(0);
      setIsHardDropping(false);
      setGameStarted(false);
      setGameInitialized(false);
      setLockDelayResetCount(0);
      setCombo(-1);
      setB2b(0);
      clearLockDelayTimer();
      totalPieces.current = 0;
      totalActions.current = 0;
      gameStartTime.current = Date.now();
    }, [clearLockDelayTimer]),
    pauseGame: useCallback(() => {
      setIsPaused(true);
      setIsManuallyPaused(true);
      setWasManuallyPaused(true);
    }, [setWasManuallyPaused]),
    resumeGame: useCallback(() => {
      setIsPaused(false);
      setIsManuallyPaused(false);
      setWasManuallyPaused(false);
    }, [setWasManuallyPaused]),
    movePiece,
    hardDrop,
    rotatePieceClockwise,
    rotatePieceCounterclockwise,
    rotatePiece180,
    holdCurrentPiece,
    spawnNewPiece,
    lockPiece,
    initializeForCountdown: useCallback(() => {
      debugLog.game('Initializing for countdown start');
      initializePieces();
    }, []),
    applyGameState,
    undoMove: () => {},
    redoMove: () => {},
    canUndo: false,
    canRedo: false
  };

  function initializePieces() {
    debugLog.game('Initializing pieces for countdown start');
    resetSevenBag();
    
    const allPieces = Array.from({ length: 7 }, () => createGamePiece(generateRandomPiece()));
    
    setCurrentPiece(allPieces[0]);
    setNextPieces(allPieces.slice(1));
    setGameInitialized(true);
    
    debugLog.game('Pieces initialized', {
      currentPiece: allPieces[0].type.type,
      nextPieces: allPieces.slice(1).map(p => p.type.type)
    });
  }
};
