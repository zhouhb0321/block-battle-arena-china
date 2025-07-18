import { useState, useEffect, useCallback, useRef } from 'react';
import { useKeyboardControls } from './useKeyboardControls';
import { useUserSettings } from './useUserSettings';
import { useWindowFocus } from './useWindowFocus';
import { useGameState } from './useGameState';
import { useAchievements } from './useAchievements';
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
  GamePiece
} from '@/utils/gameTypes';

interface UseGameLogicProps {
  gameMode: GameMode;
  onGameEnd: (stats: GameStats) => void;
  onSpecialClear?: (clearType: string, lines: number) => void;
  onAchievement?: (text: string, type: 'tetris' | 'tspin' | 'combo' | 'perfect' | 'level') => void;
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
  const [comboCount, setComboCount] = useState(0);
  const [b2bCount, setB2bCount] = useState(0);

  // 锁定延迟相关状态 - 增加延迟时间和改进机制
  const [isLockDelayActive, setIsLockDelayActive] = useState(false);
  const [lockDelayResetCount, setLockDelayResetCount] = useState(0);
  
  const { settings } = useUserSettings();
  const { achievements, showTetris, showTSpin, showCombo, showPerfectClear, showLevelUp, removeAchievement } = useAchievements();
  
  // 撤销重做功能 - 仅单人模式
  const isSinglePlayer = gameMode.id === 'marathon' || gameMode.id === 'endless' || gameMode.id === 'sprint40' || gameMode.id === 'ultra2min';
  const maxUndoSteps = settings.undoSteps || 50;
  const gameStateManager = useGameState({
    maxHistorySize: maxUndoSteps,
    enabled: isSinglePlayer
  });
  
  // 添加调试日志
  useEffect(() => {
    debugLog.game('游戏模式变更', { 
      gameMode: gameMode.id, 
      isSinglePlayer, 
      maxUndoSteps 
    });
  }, [gameMode.id, isSinglePlayer, maxUndoSteps]);
  const { isWindowFocused, wasManuallyPaused, setWasManuallyPaused } = useWindowFocus();
  
  const gameStartTime = useRef<number>(Date.now());
  const totalPieces = useRef<number>(0);
  const totalActions = useRef<number>(0);
  const dropTimer = useRef<NodeJS.Timeout | null>(null);
  const lockDelayTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTSpinCheck = useRef<{ piece: GamePiece; board: Board; wasKicked: boolean } | null>(null);

  // 增强的锁定延迟设置
  const LOCK_DELAY_TIME = 1000; // 增加到1000ms的标准锁定延迟
  const MAX_LOCK_RESETS = 15; // 最大重置次数

  // Helper function to create a GamePiece from TetrominoType
  const createGamePiece = useCallback((pieceType: TetrominoType): GamePiece => {
    return createNewPiece(pieceType);
  }, []);

  // 智能失焦处理 - 区分手动暂停和自动失焦暂停
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    if (!isWindowFocused && !isPaused) {
      // 只有在非手动暂停状态下才自动暂停
      if (!isManuallyPaused) {
        setIsPaused(true);
        debugLog.game('窗口失焦，自动暂停游戏');
      }
    } else if (isWindowFocused && isPaused && !isManuallyPaused) {
      // 窗口重获焦点且非手动暂停时自动恢复
      setIsPaused(false);
      debugLog.game('窗口重获焦点，自动恢复游戏');
    }
  }, [isWindowFocused, isPaused, isManuallyPaused, gameStarted, gameOver]);

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

  // 清除锁定延迟定时器
  const clearLockDelayTimer = useCallback(() => {
    if (lockDelayTimer.current) {
      clearTimeout(lockDelayTimer.current);
      lockDelayTimer.current = null;
    }
    setIsLockDelayActive(false);
  }, []);

  // 重置锁定延迟 - 改进的重置机制
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

  // 开始锁定延迟 - 改进的锁定延迟逻辑
  const startLockDelay = useCallback(() => {
    if (!currentPiece || isLockDelayActive) return;
    
    // 检查方块是否真的无法下移
    const testPiece = { ...currentPiece, y: currentPiece.y + 1 };
    if (isValidPosition(board, testPiece)) {
      return; // 方块还能下移，不需要锁定延迟
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
    setLockDelayResetCount(0); // 重置锁定延迟计数
    clearLockDelayTimer();
    totalPieces.current++;

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

    // 保存状态用于撤销功能
    if (isSinglePlayer) {
      gameStateManager.saveState(board, currentPiece, score, lines, level);
    }

    // Check for T-Spin before clearing lines
    const isTSpin = currentPiece.type.type === 'T' && lastTSpinCheck.current && 
                   checkTSpin(lastTSpinCheck.current.board, lastTSpinCheck.current.piece, 'rotate', lastTSpinCheck.current.wasKicked);

    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
    
    // 检查是否为完美消除
    const isPerfectClear = clearedBoard.every(row => row.every(cell => cell === 0));
    
    setBoard(clearedBoard);
    
    if (linesCleared > 0) {
      const newLines = lines + linesCleared;
      const newLevel = Math.floor(newLines / 10) + 1;
      let lineScore = 0;
      
      // Combo计数
      setComboCount(prev => prev + 1);
      
      let clearType = '';
      let isSpecialClear = false;
      
      if (isTSpin) {
        clearType = `tspin_${linesCleared === 3 ? 'triple' : linesCleared === 2 ? 'double' : 'single'}`;
        lineScore = [800, 1200, 1600][linesCleared - 1] * level;
        isSpecialClear = true;
        
        // 显示T-Spin成就
        const isMini = lastTSpinCheck.current?.wasKicked === false;
        showTSpin(linesCleared, isMini, b2bCount > 0);
        setB2bCount(prev => prev + 1);
      } else if (linesCleared === 4) {
        clearType = 'tetris';
        lineScore = 800 * level;
        isSpecialClear = true;
        
        // 显示Tetris成就
        showTetris(false, b2bCount > 0);
        setB2bCount(prev => prev + 1);
      } else {
        lineScore = [100, 300, 500][linesCleared - 1] * level;
        setB2bCount(0); // 非特殊消除重置B2B
      }
      
      // Combo 成就
      if (comboCount > 0 && comboCount % 2 === 0) {
        showCombo(comboCount);
      }
      
      // Perfect Clear 成就
      if (isPerfectClear) {
        showPerfectClear();
      }
      
      // Level up 成就
      if (newLevel > level) {
        showLevelUp(newLevel);
      }
      
      setLines(newLines);
      setLevel(newLevel);
      setScore(prev => prev + lineScore);
      
      debugLog.game('Lines cleared', {
        linesCleared,
        clearType,
        newLines,
        newLevel,
        lineScore,
        combo: comboCount,
        b2b: b2bCount,
        isPerfectClear
      });
      
      if (onSpecialClear && (clearType || linesCleared >= 4)) {
        onSpecialClear(clearType || 'tetris', linesCleared);
      }
    } else {
      // 没有消除行时重置combo
      setComboCount(0);
    }

    lastTSpinCheck.current = null;
    spawnNewPiece();
  }, [currentPiece, board, lines, level, spawnNewPiece, onSpecialClear, clearLockDelayTimer]);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (!currentPiece || gameOver || isPaused || isHardDropping || !gameStarted) return false;

    const newPosition: Position = { 
      x: currentPiece.x + dx, 
      y: currentPiece.y + dy 
    };
    
    const newPiece = { ...currentPiece, x: newPosition.x, y: newPosition.y };
    
    if (isValidPosition(board, newPiece)) {
      setCurrentPiece(newPiece);
      if (dx !== 0) {
        totalActions.current++;
        // 简化锁定延迟重置逻辑 - 避免位置跳回问题
        if (isLockDelayActive) {
          resetLockDelay();
        }
      }
      return true;
    } else if (dy > 0) {
      // 方块无法下移时开始锁定延迟
      startLockDelay();
      return false;
    }
    return false;
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, gameStarted, resetLockDelay, isLockDelayActive, startLockDelay]);

  

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
    clearLockDelayTimer(); // 硬降时清除锁定延迟
    
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
    
    setCurrentPiece(null);
    setIsHardDropping(false);
    
    setTimeout(spawnNewPiece, 16);
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, gameStarted, lines, level, onSpecialClear, spawnNewPiece, clearLockDelayTimer]);

  // 使用SRS旋转系统的顺时针旋转
  const rotatePieceClockwise = useCallback(() => {
    if (!currentPiece || gameOver || isPaused || isHardDropping || !gameStarted) return;

    debugLog.game('尝试顺时针旋转', { piece: currentPiece.type.type });

    // 存储当前状态用于T-Spin检测
    lastTSpinCheck.current = {
      piece: { ...currentPiece },
      board: board.map(row => [...row]),
      wasKicked: false
    };

    const srsResult = performSRSRotation(board, currentPiece, true);
    
    if (srsResult.success && srsResult.newPiece) {
      setCurrentPiece(srsResult.newPiece);
      totalActions.current++;
      
      // 更新T-Spin检测状态
      if (lastTSpinCheck.current) {
        lastTSpinCheck.current.wasKicked = srsResult.wasKicked;
      }
      
      // 旋转时重置锁定延迟
      if (resetLockDelay()) {
        clearLockDelayTimer();
      }
      
      debugLog.game('旋转成功', { wasKicked: srsResult.wasKicked });
    } else {
      lastTSpinCheck.current = null;
      debugLog.game('旋转失败');
    }
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, gameStarted, resetLockDelay, clearLockDelayTimer]);

  // 使用SRS旋转系统的逆时针旋转
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
      
      if (lastTSpinCheck.current) {
        lastTSpinCheck.current.wasKicked = srsResult.wasKicked;
      }
      
      if (resetLockDelay()) {
        clearLockDelayTimer();
      }
      
      debugLog.game('逆时针旋转成功', { wasKicked: srsResult.wasKicked });
    } else {
      lastTSpinCheck.current = null;
      debugLog.game('逆时针旋转失败');
    }
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, gameStarted, resetLockDelay, clearLockDelayTimer]);

  // 180度旋转
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
      
      if (lastTSpinCheck.current) {
        lastTSpinCheck.current.wasKicked = srsResult.wasKicked;
      }
      
      if (resetLockDelay()) {
        clearLockDelayTimer();
      }
      
      debugLog.game('180度旋转成功', { wasKicked: srsResult.wasKicked });
    } else {
      lastTSpinCheck.current = null;
      debugLog.game('180度旋转失败');
    }
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, gameStarted, resetLockDelay, clearLockDelayTimer]);

  const holdCurrentPiece = useCallback(() => {
    if (!currentPiece || !canHold || gameOver || isPaused || isHardDropping || !gameStarted) return;

    clearLockDelayTimer(); // 暂存时清除锁定延迟

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
  }, [currentPiece, holdPiece, canHold, gameOver, isPaused, isHardDropping, spawnNewPiece, gameStarted, clearLockDelayTimer]);

  
  
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
    setIsManuallyPaused(false);
    setTime(0);
    setPps(0);
    setApm(0);
    setIsHardDropping(false);
    setGameStarted(false);
    setGameInitialized(false);
    setLockDelayResetCount(0);
    setComboCount(0);
    setB2bCount(0);
    clearLockDelayTimer();
    gameStateManager.clearHistory();
    totalPieces.current = 0;
    totalActions.current = 0;
    gameStartTime.current = Date.now();
  }, [clearLockDelayTimer, gameStateManager]);

  const pauseGame = useCallback(() => {
    setIsPaused(true);
    setIsManuallyPaused(true);
    setWasManuallyPaused(true);
  }, [setWasManuallyPaused]);

  const resumeGame = useCallback(() => {
    setIsPaused(false);
    setIsManuallyPaused(false);
    setWasManuallyPaused(false);
  }, [setWasManuallyPaused]);

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
    // Action methods
    startGame,
    resetGame,
    pauseGame,
    resumeGame,
    movePiece,
    hardDrop,
    rotatePieceClockwise,
    rotatePieceCounterclockwise,
    rotatePiece180,
    holdCurrentPiece,
    spawnNewPiece,
    lockPiece,
    initializeForCountdown,
    // 撤销重做功能
    undoMove: useCallback(() => {
      debugLog.game('撤销操作', { isSinglePlayer, canUndo: gameStateManager.canUndo });
      if (!isSinglePlayer) {
        debugLog.warn('非单人模式，无法撤销');
        return;
      }
      const snapshot = gameStateManager.undo();
      if (snapshot) {
        debugLog.game('撤销成功', snapshot);
        setBoard(snapshot.board);
        setCurrentPiece(snapshot.currentPiece);
        setScore(snapshot.score);
        setLines(snapshot.lines);
        setLevel(snapshot.level);
      } else {
        debugLog.warn('撤销失败：无可撤销状态');
      }
    }, [isSinglePlayer, gameStateManager]),
    redoMove: useCallback(() => {
      debugLog.game('重做操作', { isSinglePlayer, canRedo: gameStateManager.canRedo });
      if (!isSinglePlayer) {
        debugLog.warn('非单人模式，无法重做');
        return;
      }
      const snapshot = gameStateManager.redo();
      if (snapshot) {
        debugLog.game('重做成功', snapshot);
        setBoard(snapshot.board);
        setCurrentPiece(snapshot.currentPiece);
        setScore(snapshot.score);
        setLines(snapshot.lines);
        setLevel(snapshot.level);
      } else {
        debugLog.warn('重做失败：无可重做状态');
      }
    }, [isSinglePlayer, gameStateManager]),
    canUndo: isSinglePlayer && gameStateManager.canUndo,
    canRedo: isSinglePlayer && gameStateManager.canRedo,
    // 成就系统
    achievements,
    removeAchievement
  };
};
