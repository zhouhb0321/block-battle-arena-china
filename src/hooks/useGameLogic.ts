import { useState, useEffect, useCallback, useRef } from 'react';
import { useWindowFocus } from './useWindowFocus';
import { useGameState } from './useGameState';
import { useAchievements } from './useAchievements';
import { useReplayRecorder } from './useReplayRecorder';
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
  undoSteps?: number; // Pass from TetrisGameProvider to avoid circular dependency
}

export const useGameLogic = ({ gameMode, onGameEnd, onSpecialClear, onAchievement, undoSteps = 50 }: UseGameLogicProps) => {
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
  
  // Replay recording
  const { 
    startRecording, 
    recordAction, 
    stopRecording, 
    isRecording 
  } = useReplayRecorder();
  const [apm, setApm] = useState(0);
  const [isHardDropping, setIsHardDropping] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameInitialized, setGameInitialized] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [b2bCount, setB2bCount] = useState(0);

  // 锁定延迟相关状态
  const [isLockDelayActive, setIsLockDelayActive] = useState(false);
  const [lockDelayResetCount, setLockDelayResetCount] = useState(0);
  
  // Remove direct useUserSettings dependency to prevent circular rendering
  const { achievements, showTetris, showTSpin, showCombo, showPerfectClear, showLevelUp, removeAchievement } = useAchievements();
  
  // 撤销重做功能 - 仅单人模式
  const isSinglePlayer = gameMode.id === 'marathon' || gameMode.id === 'endless' || gameMode.id === 'sprint40' || gameMode.id === 'ultra2min';
  const maxUndoSteps = undoSteps;
  const gameStateManager = useGameState({
    maxHistorySize: maxUndoSteps,
    enabled: isSinglePlayer
  });
  
  const { isWindowFocused, wasManuallyPaused, setWasManuallyPaused } = useWindowFocus();

  const gameStartTime = useRef<number>(Date.now());
  const totalPieces = useRef<number>(0);
  const totalActions = useRef<number>(0);
  const dropTimer = useRef<NodeJS.Timeout | null>(null);
  const lockDelayTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTSpinCheck = useRef<{ piece: GamePiece; board: Board; wasKicked: boolean } | null>(null);

  const LOCK_DELAY_TIME = 1000;
  const MAX_LOCK_RESETS = 15;

  // Helper function to create a GamePiece from TetrominoType
  const createGamePiece = useCallback((pieceType: TetrominoType): GamePiece => {
    return createNewPiece(pieceType);
  }, []);

  // 智能失焦处理
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

  // 立即初始化方块队列
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

  // 清除锁定延迟定时器
  const clearLockDelayTimer = useCallback(() => {
    if (lockDelayTimer.current) {
      clearTimeout(lockDelayTimer.current);
      lockDelayTimer.current = null;
    }
    setIsLockDelayActive(false);
  }, []);

  // 重置锁定延迟
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

  // 开始锁定延迟
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

  
  const spawnNewPiece = useCallback(async () => {
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

    if (!isValidPosition(board, newPiece)) {
      debugLog.game('Game over - no valid position for new piece');
      setGameOver(true);
      
      // Stop replay recording and save if recording
      if (isRecording) {
        const gameStats = {
          score,
          lines,
          level,
          duration: time,
          pps,
          apm,
          gameMode: gameMode.id,
          gameType: 'single' as 'single' | 'ranked' | '1v1'
        };
        console.log('游戏结束，保存录像:', gameStats);
        const savedReplay = await stopRecording(gameStats);
        if (savedReplay) {
          console.log('录像保存成功:', savedReplay.id);
          debugLog.game('Replay recording stopped and saved', { replayId: savedReplay.id });
        } else {
          console.log('录像保存失败');
          debugLog.game('Replay recording failed to save');
        }
      }
      
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

    if (isSinglePlayer) {
      gameStateManager.saveState(board, currentPiece, score, lines, level);
    }

    const isTSpin = currentPiece.type.type === 'T' && lastTSpinCheck.current && 
                   checkTSpin(lastTSpinCheck.current.board, lastTSpinCheck.current.piece, 'rotate', lastTSpinCheck.current.wasKicked);

    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
    
    const isPerfectClear = clearedBoard.every(row => row.every(cell => cell === 0));
    
    setBoard(clearedBoard);
    
    if (linesCleared > 0) {
      const newLines = lines + linesCleared;
      const newLevel = Math.floor(newLines / 10) + 1;
      let lineScore = 0;
      
      const newComboCount = comboCount + 1;
      setComboCount(newComboCount);
      
      let clearType = '';
      let isSpecialClear = false;
      
      if (isTSpin) {
        clearType = `tspin_${linesCleared === 3 ? 'triple' : linesCleared === 2 ? 'double' : 'single'}`;
        lineScore = [800, 1200, 1600][linesCleared - 1] * level;
        isSpecialClear = true;
        
        const tspinResult = lastTSpinCheck.current ? checkTSpin(lastTSpinCheck.current.board, lastTSpinCheck.current.piece, 'rotate', lastTSpinCheck.current.wasKicked) : null;
        const isMini = tspinResult?.isMini || false;
        
        // 修复：根据实际消除行数显示正确的T-Spin类型
        if (linesCleared === 2) {
          showTSpin(2, isMini, b2bCount > 0); // T-Spin Double
        } else if (linesCleared === 3) {
          showTSpin(3, isMini, b2bCount > 0); // T-Spin Triple
        } else {
          showTSpin(1, isMini, b2bCount > 0); // T-Spin Single
        }
        setB2bCount(prev => prev + 1);
      } else if (linesCleared === 4) {
        clearType = 'tetris';
        lineScore = 800 * level;
        isSpecialClear = true;
        
        showTetris(false, b2bCount > 0);
        setB2bCount(prev => prev + 1);
      } else {
        lineScore = [100, 300, 500][linesCleared - 1] * level;
        setB2bCount(0);
      }
      
      // 修复：只在combo大于1时显示，避免单行消除显示combo
      if (newComboCount > 1 && newComboCount <= 100) {
        showCombo(newComboCount);
      }
      
      if (isPerfectClear) {
        showPerfectClear();
      }
      
      if (newLevel > level) {
        showLevelUp(newLevel);
      }
      
      setLines(newLines);
      setLevel(newLevel);
      setScore(prev => prev + lineScore);
      
      if (onSpecialClear && (clearType || linesCleared >= 4)) {
        onSpecialClear(clearType || 'tetris', linesCleared);
      }
    } else {
      setComboCount(0);
    }

    lastTSpinCheck.current = null;
    spawnNewPiece();
  }, [currentPiece, board, lines, level, spawnNewPiece, onSpecialClear, clearLockDelayTimer, comboCount, b2bCount, showTSpin, showTetris, showCombo, showPerfectClear, showLevelUp]);

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
      
      // Record replay action
      if (isRecording) {
        recordAction('move', { dx, dy, piece: newPiece });
      }
      
      if (dx !== 0) {
        // 修复：只有在方块已经触底且移动后仍然触底时，才重置锁定延迟
        const belowNewPiece = { ...newPiece, y: newPiece.y + 1 };
        if (!isValidPosition(board, belowNewPiece)) {
          if (resetLockDelay()) {
            clearLockDelayTimer();
          }
        }
      }
      return true;
    } else if (dy > 0) {
      // 软降失败时启动锁定延迟
      startLockDelay();
      return false;
    }
    return false;
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, gameStarted, startLockDelay, resetLockDelay, clearLockDelayTimer, isRecording, recordAction]);

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
    
    // 直接锁定方块到最终位置，不设置currentPiece
    const droppedPiece = { ...currentPiece, y: dropY };
    const newBoard = placePiece(board, droppedPiece);
    setBoard(newBoard);
    
    // 立即锁定方块，不设置currentPiece
    setIsHardDropping(false);
    
    // 直接处理锁定逻辑，不通过lockPiece
    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
    setBoard(clearedBoard);
    
    if (linesCleared > 0) {
      const newLines = lines + linesCleared;
      const newLevel = Math.floor(newLines / 10) + 1;
      const lineScore = [100, 300, 500, 800][linesCleared - 1] * level;
      
      setLines(newLines);
      setLevel(newLevel);
      setScore(prev => prev + lineScore);
    }
    
    // 生成新方块
    spawnNewPiece();
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, gameStarted, clearLockDelayTimer, lines, level, spawnNewPiece]);

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
      
      // Record replay action
      if (isRecording) {
        recordAction('rotate', { clockwise: true, piece: srsResult.newPiece, wasKicked: srsResult.wasKicked });
      }
      
      if (lastTSpinCheck.current) {
        lastTSpinCheck.current.wasKicked = srsResult.wasKicked;
      }
      
      if (resetLockDelay()) {
        clearLockDelayTimer();
      }
      
      debugLog.game('旋转成功', { wasKicked: srsResult.wasKicked });
    } else {
      lastTSpinCheck.current = null;
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
  }, [currentPiece, holdPiece, canHold, gameOver, isPaused, isHardDropping, spawnNewPiece, gameStarted, clearLockDelayTimer]);

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
  }, [currentPiece, level, gameOver, isPaused, isWindowFocused, isHardDropping, gameStarted, movePiece]);

  const startGame = useCallback(() => {
    debugLog.game('Starting game logic...');
    setGameStarted(true);
    gameStartTime.current = Date.now();
    
    // Replay recording will be handled by the game provider
    
    if (!gameInitialized) {
      initializePieces();
    }
  }, [initializePieces, gameInitialized, gameMode.id, startRecording]);

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
    debugLog.game('暂停游戏', { isPaused, isManuallyPaused });
    if (!isPaused) {
      setIsPaused(true);
      setIsManuallyPaused(true);
      setWasManuallyPaused(true);
    }
  }, [isPaused, isManuallyPaused, setWasManuallyPaused]);

  const resumeGame = useCallback(() => {
    debugLog.game('恢复游戏', { isPaused, isManuallyPaused });
    if (isPaused && isManuallyPaused) {
      setIsPaused(false);
      setIsManuallyPaused(false);
      setWasManuallyPaused(false);
    }
  }, [isPaused, isManuallyPaused, setWasManuallyPaused]);

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
    // 游戏状态
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
    gameStarted,
    gameInitialized,
    comboCount,
    b2bCount,
    achievements,
    
    // 游戏控制
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    movePiece,
    rotatePieceClockwise,
    rotatePieceCounterclockwise,
    rotatePiece180,
    holdCurrentPiece,
    spawnNewPiece,
    lockPiece,
    initializeForCountdown,
    // 撤销重放功能（仅单人模式）
    canUndo: isSinglePlayer ? gameStateManager.canUndo : false,
    canRedo: isSinglePlayer ? gameStateManager.canRedo : false,
    undo: isSinglePlayer ? gameStateManager.undo : () => {},
    redo: isSinglePlayer ? gameStateManager.redo : () => {},
    clearHistory: isSinglePlayer ? gameStateManager.clearHistory : () => {},
    
    // 硬降功能
    hardDrop,
    
    // 幻影方块
    ghostPiece,
    
    // 手动暂停状态
    isManuallyPaused,
    
    // 成就移除功能
    removeAchievement,
    
    // 其他
    isValidPosition,
    
    // 游戏统计
    getGameStats: () => ({
      score,
      lines,
      level,
      time,
      pps,
      apm,
      gameMode: gameMode.id
    })
  };
};
