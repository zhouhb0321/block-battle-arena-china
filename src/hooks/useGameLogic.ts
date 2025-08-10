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
  const [totalPausedTime, setTotalPausedTime] = useState(0);
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
  
  // Undo/Redo is only enabled for endless mode.
  const isUndoRedoEnabled = gameMode.id === 'endless';
  const maxUndoSteps = undoSteps;
  const gameStateManager = useGameState({
    maxHistorySize: maxUndoSteps,
    enabled: isUndoRedoEnabled
  });
  
  const { isWindowFocused, wasManuallyPaused, setWasManuallyPaused } = useWindowFocus();

  const gameStartTime = useRef<number>(Date.now());
  const wasPausedRef = useRef(isPaused);

  // 游戏恢复时调整计时器
  useEffect(() => {
    // 当 isPaused 从 true 变为 false 时，意味着游戏刚刚恢复
    if (wasPausedRef.current && !isPaused) {
      debugLog.game('游戏恢复，调整开始时间以修正计时器');
      // 通过从当前时间减去已经过的时间，来校准开始时间
      gameStartTime.current = Date.now() - time * 1000;
    }
    wasPausedRef.current = isPaused;
  }, [isPaused, time]);

  const sprintProgressRef = useRef<number>(0);
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
        try {
          const gameStats = {
            score,
            lines,
            level,
            duration: time * 1000,
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
        } catch (error) {
          console.error('保存录像时出错:', error);
          debugLog.error('Error saving replay', error);
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
    
    // Record replay action
    if (isRecording && currentPiece) {
      recordAction('place', { x: currentPiece.x, y: currentPiece.y });
    }

    if (isUndoRedoEnabled) {
      gameStateManager.saveState(board, currentPiece, score, lines, level);
    }

    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
    const isPerfectClear = clearedBoard.every(row => row.every(cell => cell === 0));
    setBoard(clearedBoard);

    if (linesCleared > 0) {
      const newLines = lines + linesCleared;
      const newLevel = Math.floor(newLines / 10) + 1;

      // Original Nintendo scoring system
      const scoreBase = { 1: 40, 2: 100, 3: 300, 4: 1200 };
      const lineScore = (scoreBase[linesCleared] || 0) * newLevel;

      setLines(newLines);
      setLevel(newLevel);
      setScore(prev => prev + lineScore);

      // Reset combo and B2B as they are not part of this scoring system
      setComboCount(0);
      setB2bCount(0);

      if (isPerfectClear) {
        showPerfectClear();
      }
      if (newLevel > level) {
        showLevelUp(newLevel);
      }

      // 40L Sprint Mode: End game when target lines are reached
      if (gameMode.id === 'sprint40' && newLines >= (gameMode.targetLines || 40)) {
        const finalTimeMs = Date.now() - gameStartTime.current;
        const finalScore = score + lineScore;

        setTime(finalTimeMs / 1000);
        setGameOver(true);

        const finalStats = {
          score: finalScore,
          lines: newLines,
          level: newLevel,
          time: finalTimeMs / 1000,
          pps,
          apm,
          gameMode: gameMode.id
        };

        onGameEnd(finalStats);

        if (isRecording) {
          try {
            // Pass duration in milliseconds
            stopRecording({ ...finalStats, duration: finalTimeMs });
          } catch (error) {
            console.error('Error saving sprint replay on lockPiece:', error);
            debugLog.error('Error saving sprint replay on lockPiece', error);
          }
        }
        return; // End further processing
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

      
      // Record replay action (only horizontal moves)
      if (isRecording && dx !== 0) {
        recordAction('move', { direction: dx < 0 ? 'left' : 'right' });
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
    
    // Record replay action
    if (isRecording) {
      recordAction('drop', { type: 'hard' });
    }
    
    // 在锁定前保存状态以支持撤销
    if (isUndoRedoEnabled) {
      gameStateManager.saveState(board, currentPiece, score, lines, level);
    }
    // 直接锁定方块到最终位置
    const droppedPiece = { ...currentPiece, y: dropY };
    const newBoard = placePiece(board, droppedPiece);
    
    // Record place action
    if (isRecording) {
      recordAction('place', { x: droppedPiece.x, y: dropY });
    }
    
    // 处理行消除与成就（与普通锁定逻辑保持一致）
    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
    const isPerfectClear = clearedBoard.every(row => row.every(cell => cell === 0));

    setBoard(clearedBoard);

    if (linesCleared > 0) {
      const newLines = lines + linesCleared;
      const newLevel = Math.floor(newLines / 10) + 1;

      // Original Nintendo scoring system
      const scoreBase = { 1: 40, 2: 100, 3: 300, 4: 1200 };
      const lineScore = (scoreBase[linesCleared] || 0) * newLevel;

      setLines(newLines);
      setLevel(newLevel);
      setScore(prev => prev + lineScore);

      // Reset combo and B2B as they are not part of this scoring system
      setComboCount(0);
      setB2bCount(0);

      if (isPerfectClear) {
        showPerfectClear();
      }
      if (newLevel > level) {
        showLevelUp(newLevel);
      }
      setLines(newLines);
      setLevel(newLevel);
      setScore(prev => prev + lineScore);

      {
        const wasTSpin2 = lastTSpinCheck.current ? !!checkTSpin(
          lastTSpinCheck.current.board,
          lastTSpinCheck.current.piece,
          'rotate',
          lastTSpinCheck.current.wasKicked
        ) : false;
        const clearType = wasTSpin2
          ? (linesCleared === 1 ? 'tspin_single' : linesCleared === 2 ? 'tspin_double' : 'tspin_triple')
          : (linesCleared === 4 ? 'tetris' : 'line_clear');
        if (onSpecialClear && (wasTSpin2 || linesCleared >= 4)) {
          onSpecialClear(clearType, linesCleared);
        }
      }

      // 40L Sprint Mode: End game when target lines are reached (on hard drop)
      if (gameMode.id === 'sprint40' && newLines >= (gameMode.targetLines || 40)) {
        const finalTimeMs = Date.now() - gameStartTime.current;
        const finalScore = score + lineScore;

        setTime(finalTimeMs / 1000);
        setGameOver(true);

        const finalStats = {
          score: finalScore,
          lines: newLines,
          level: newLevel,
          time: finalTimeMs / 1000,
          pps,
          apm,
          gameMode: gameMode.id
        };

        onGameEnd(finalStats);

        if (isRecording) {
          try {
            // Pass duration in milliseconds
            stopRecording({ ...finalStats, duration: finalTimeMs });
          } catch (error) {
            console.error('Error saving sprint replay on hard drop:', error);
            debugLog.error('Error saving sprint replay on hard drop', error);
          }
        }
        setIsHardDropping(false);
        return; // End further processing
      }
    } else {
      setComboCount(0);
    }

    // 清理并生成新方块
    setIsHardDropping(false);
    lastTSpinCheck.current = null;
    spawnNewPiece();
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, gameStarted, clearLockDelayTimer, lines, level, comboCount, b2bCount, showTSpin, showTetris, showCombo, showPerfectClear, showLevelUp, onSpecialClear, spawnNewPiece, isRecording, recordAction]);

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
        recordAction('rotate', { direction: 'clockwise' });
      }
      
      if (lastTSpinCheck.current) {
        lastTSpinCheck.current.wasKicked = srsResult.wasKicked;
        // 关键修复：使用旋转后的方块用于T-Spin检测
        lastTSpinCheck.current.piece = { ...srsResult.newPiece };
        lastTSpinCheck.current.board = board.map(row => [...row]);
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
      
      // Record replay action
      if (isRecording) {
        recordAction('rotate', { direction: 'counterclockwise' });
      }
      
      if (lastTSpinCheck.current) {
        lastTSpinCheck.current.wasKicked = srsResult.wasKicked;
        // 关键修复：使用旋转后的方块用于T-Spin检测
        lastTSpinCheck.current.piece = { ...srsResult.newPiece };
        lastTSpinCheck.current.board = board.map(row => [...row]);
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
      
      // Record replay action
      if (isRecording) {
        recordAction('rotate', { direction: '180' });
      }
      
      if (lastTSpinCheck.current) {
        lastTSpinCheck.current.wasKicked = srsResult.wasKicked;
        // 关键修复：使用旋转后的方块用于T-Spin检测
        lastTSpinCheck.current.piece = { ...srsResult.newPiece };
        lastTSpinCheck.current.board = board.map(row => [...row]);
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
    
    // Record replay action
    if (isRecording) {
      recordAction('hold', {});
    }
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
    if (!gameStarted || gameOver || isPaused) {
      return;
    }

    // Time attack (including legacy ids): use real elapsed time and hard limit
    const legacyLimit = gameMode.id === 'ultra2min' || gameMode.id === 'timeAttack2' ? 120 : undefined;
    const limit = gameMode.timeLimit ?? legacyLimit;

    // 使用一个统一的计时器来更新时间和统计数据
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - gameStartTime.current) / 1000;

      // 更新PPS和APM
      if (elapsed > 0) {
        setPps(totalPieces.current / elapsed);
        setApm((totalActions.current / elapsed) * 60);
      }

      if (limit) {
        // Time-limited mode
        debugLog.game(`Time attack check: elapsed=${elapsed.toFixed(2)}s, limit=${limit}s`);
        const clampedTime = Math.min(elapsed, limit);
        setTime(Math.floor(clampedTime));

        if (elapsed >= limit) {
          debugLog.game(`Time limit reached for mode ${gameMode.id}. Ending game.`);
          setGameOver(true);
          const finalStats = { score, lines, level, time: limit, pps, apm, gameMode: gameMode.id };
          onGameEnd(finalStats);
          if (isRecording) {
            try {
              stopRecording({ ...finalStats, duration: limit * 1000 } as any).then(replay => {
                if (replay) console.log(`Time attack replay saved: ${replay.id}`);
              });
            } catch (error) {
              console.error('Error saving time attack replay:', error);
              debugLog.error('Error saving time attack replay', error);
            }
          }
        }
      } else {
        // 非限时模式
        setTime(Math.floor(elapsed));
      }
    }, 500); // 统一使用500ms的间隔，对于显示足够精确

    return () => clearInterval(timer);
  }, [gameStarted, gameOver, gameMode.id, gameMode.timeLimit, isPaused, onGameEnd, score, lines, level, pps, apm, isRecording, stopRecording]);


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
    sprintProgressRef.current = 0;
    // Start replay recording only for specific modes
    const recordableModes = ['sprint40', 'sprint100', 'timeAttack2', 'timeAttack5', 'versus'];
    if (!isRecording && recordableModes.includes(gameMode.id)) {
      try {
        startRecording(board.map(row => [...row]), { gameMode: gameMode.id });
      } catch (e) {
        console.warn('Failed to start replay recording', e);
      }
    }
    
    if (!gameInitialized) {
      initializePieces();
    }
  }, [initializePieces, gameInitialized, gameMode.id, startRecording, board]);

  const initializeForCountdown = useCallback(() => {
    debugLog.game('Initializing for countdown start');
    initializePieces();
  }, [initializePieces]);

  const resetGame = useCallback(() => {
    debugLog.game('Resetting game...');
    // 若正在录制，先保存当前录像
    if (isRecording && gameMode.id !== 'endless') {
      try {
        const stats = {
          score,
          lines,
          level,
          duration: time * 1000,
          pps,
          apm,
          gameMode: gameMode.id
        };
        // 不等待，异步保存
        stopRecording(stats as any);
      } catch (e) {
        console.warn('重置前保存录像失败', e);
        debugLog.error('Error saving replay on reset', e);
      }
    }
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
    setTotalPausedTime(0);
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
  }, [clearLockDelayTimer, gameStateManager, isRecording, score, lines, level, time, pps, apm, gameMode.id, stopRecording]);

  const undoAction = useCallback(() => {
    if (!isUndoRedoEnabled) return null;
    const snapshot = gameStateManager.undo();
    if (snapshot) {
      setBoard(snapshot.board.map(row => [...row]));
      setCurrentPiece(snapshot.currentPiece ? { ...snapshot.currentPiece } : null);
      setScore(snapshot.score);
      setLines(snapshot.lines);
      setLevel(snapshot.level);
      clearLockDelayTimer();
      setIsPaused(false);
      return snapshot;
    }
    return null;
  }, [isUndoRedoEnabled, gameStateManager, clearLockDelayTimer]);

  const redoAction = useCallback(() => {
    if (!isUndoRedoEnabled) return null;
    const snapshot = gameStateManager.redo();
    if (snapshot) {
      setBoard(snapshot.board.map(row => [...row]));
      setCurrentPiece(snapshot.currentPiece ? { ...snapshot.currentPiece } : null);
      setScore(snapshot.score);
      setLines(snapshot.lines);
      setLevel(snapshot.level);
      clearLockDelayTimer();
      setIsPaused(false);
      return snapshot;
    }
    return null;
  }, [isUndoRedoEnabled, gameStateManager, clearLockDelayTimer]);

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
    canUndo: isUndoRedoEnabled ? gameStateManager.canUndo : false,
    canRedo: isUndoRedoEnabled ? gameStateManager.canRedo : false,
    undo: isUndoRedoEnabled ? undoAction : () => {},
    redo: isUndoRedoEnabled ? redoAction : () => {},
    clearHistory: isUndoRedoEnabled ? gameStateManager.clearHistory : () => {},
    
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
