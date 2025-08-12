import { useState, useEffect, useCallback, useRef } from 'react';
import { useWindowFocus } from './useWindowFocus';
import { useGameState } from './useGameState';
import { useAchievements } from './useAchievements';
import { useReplayRecorder } from './useReplayRecorder';
import { debugLog } from '@/utils/debugLogger';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { calculateScore } from '@/utils/scoringSystem';
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
  undoSteps?: number;
  isReplay?: boolean; // 新增：是否为回放模式
  replaySeed?: string; // 新增：回放所用的种子
}

export const useGameLogic = ({
  gameMode,
  onGameEnd,
  onSpecialClear,
  onAchievement,
  undoSteps = 50,
  isReplay = false,
  replaySeed
}: UseGameLogicProps) => {
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
  const [isB2B, setIsB2B] = useState(false); // New state for Back-to-Back
  const [sprintProgress, setSprintProgress] = useState(0); // For 40L weighted lines

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
  
  const { user } = useAuth();
  const { isWindowFocused, wasManuallyPaused, setWasManuallyPaused } = useWindowFocus();

  const gameStartTime = useRef<number>(Date.now());
  const wasPausedRef = useRef(isPaused);
  const seedRef = useRef<string>('');

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
    debugLog.game('Initializing pieces for countdown start', { isReplay, replaySeed });
    // 使用固定种子重置7-bag，以保证回放一致
    if (isReplay && replaySeed) {
      resetSevenBag(replaySeed);
    } else {
      if (!seedRef.current) {
        seedRef.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      }
      resetSevenBag(seedRef.current);
    }
    
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
          const gameTypeParam = (gameMode.id === 'versus' || gameMode.id === '1v1') ? '1v1' as const : 'single' as const;
          const gameStats = {
            score,
            lines,
            level,
            duration: time * 1000,
            pps,
            apm,
            gameMode: gameMode.id,
            gameType: gameTypeParam
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

    const tSpinCheckResult = lastTSpinCheck.current ? checkTSpin(
      lastTSpinCheck.current.board,
      lastTSpinCheck.current.piece,
      'rotate', // Assuming last action was rotate for t-spin
      lastTSpinCheck.current.wasKicked
    ) : null;

    if (linesCleared > 0) {
      const scoreResult = calculateScore({
        linesCleared,
        tSpin: tSpinCheckResult ? (tSpinCheckResult.isMini ? 'mini' : 'normal') : 'none',
        isB2B: isB2B,
        combo: comboCount,
        isPerfectClear
      });

      setScore(prev => prev + scoreResult.score);

      if (scoreResult.isDifficult) {
        setIsB2B(true);
      } else {
        setIsB2B(false);
      }
      setComboCount(prev => prev + 1);

      const newLines = lines + linesCleared;
      const newLevel = Math.floor(newLines / 10) + 1;
      setLines(newLines);
      if (newLevel > level) {
        setLevel(newLevel);
        showLevelUp(newLevel);
      }

      if (isPerfectClear) showPerfectClear();

      // 40L Sprint Mode End Condition
      if (gameMode.id === 'sprint40' && newLines >= (gameMode.targetLines || 40)) {
        const finalTimeMs = Date.now() - gameStartTime.current;
        setTime(finalTimeMs / 1000);
        setGameOver(true);
        const finalStats = { score: score + scoreResult.score, lines: newLines, level: newLevel, time: finalTimeMs / 1000, pps, apm, gameMode: gameMode.id };
        onGameEnd(finalStats);
        if (isRecording) {
          stopRecording({ ...finalStats, duration: finalTimeMs, gameType: 'single' });
        }
        return;
      }
    } else {
      // Piece placed without clearing lines, reset combo
      setComboCount(0);
    }

    lastTSpinCheck.current = null;
    spawnNewPiece();
  }, [currentPiece, board, lines, level, score, comboCount, isB2B, pps, apm, gameMode, isRecording, spawnNewPiece, onGameEnd, stopRecording, showLevelUp, showPerfectClear]);

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

      
      if (isRecording && dx !== 0) {
        recordAction('move', { direction: dx < 0 ? 'left' : 'right' });
      }
      
      const isAtBottom = !isValidPosition(board, { ...newPiece, y: newPiece.y + 1 });

      if (isAtBottom) {
        // 如果方块在底部，则重置并重启锁定延迟
        if (resetLockDelay()) {
          startLockDelay();
        } else {
          // 如果无法重置（达到上限），则立即锁定
          lockPiece();
        }
      } else {
        // 如果方块不在底部，则清除任何正在进行的锁定延迟
        clearLockDelayTimer();
      }

      return true;
    } else if (dy > 0) {
      // 软降失败时启动锁定延迟
      startLockDelay();
      return false;
    }
    return false;
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, gameStarted, startLockDelay, resetLockDelay, lockPiece, clearLockDelayTimer, isRecording, recordAction]);

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

    const tSpinCheckResult = lastTSpinCheck.current ? checkTSpin(
      lastTSpinCheck.current.board,
      lastTSpinCheck.current.piece,
      'rotate',
      lastTSpinCheck.current.wasKicked
    ) : null;

    if (linesCleared > 0) {
      const scoreResult = calculateScore({
        linesCleared,
        tSpin: tSpinCheckResult ? (tSpinCheckResult.isMini ? 'mini' : 'normal') : 'none',
        isB2B: isB2B,
        combo: comboCount,
        isPerfectClear
      });

      const hardDropBonus = dropDistance * 2;
      setScore(prev => prev + scoreResult.score + hardDropBonus);

      if (scoreResult.isDifficult) {
        setIsB2B(true);
      } else {
        setIsB2B(false);
      }
      setComboCount(prev => prev + 1);

      const newLines = lines + linesCleared;
      const newLevel = Math.floor(newLines / 10) + 1;
      setLines(newLines);
      if (newLevel > level) {
        setLevel(newLevel);
        showLevelUp(newLevel);
      }

      if (isPerfectClear) showPerfectClear();

      // 40L Sprint Mode End Condition
      if (gameMode.id === 'sprint40' && newLines >= (gameMode.targetLines || 40)) {
        const finalTimeMs = Date.now() - gameStartTime.current;
        setTime(finalTimeMs / 1000);
        setGameOver(true);
        const finalStats = { score: score + scoreResult.score + hardDropBonus, lines: newLines, level: newLevel, time: finalTimeMs / 1000, pps, apm, gameMode: gameMode.id };
        onGameEnd(finalStats);
        if (isRecording) {
          stopRecording({ ...finalStats, duration: finalTimeMs, gameType: 'single' });
        }
        setIsHardDropping(false);
        return;
      }
    } else {
      // Piece placed without clearing lines, reset combo
      setComboCount(0);
    }

    // 清理并生成新方块
    setIsHardDropping(false);
    lastTSpinCheck.current = null;
    spawnNewPiece();
  }, [currentPiece, board, gameOver, isPaused, isHardDropping, gameStarted, clearLockDelayTimer, lines, level, comboCount, isB2B, showTSpin, showTetris, showCombo, showPerfectClear, showLevelUp, onSpecialClear, spawnNewPiece, isRecording, recordAction]);

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

  const timerWorker = useRef<Worker | null>(null);

  // 游戏结束和计时器逻辑（使用 RAF 提高精度）
  useEffect(() => {
    // 在回放模式下，计时器由外部控制，不自动运行
    if (isReplay || !gameStarted || gameOver || isPaused) {
      return;
    }

    const legacyLimit = gameMode.id === 'ultra2min' || gameMode.id === 'timeAttack2' ? 120000 : undefined; // ms
    const limitMs = (gameMode.timeLimit ? gameMode.timeLimit * 1000 : undefined) ?? legacyLimit;

    let rafId: number;

    const loop = () => {
      const now = Date.now();
      const elapsedMs = now - gameStartTime.current;
      const elapsed = elapsedMs / 1000;

      // 更新PPS和APM
      if (elapsed > 0) {
        setPps(totalPieces.current / elapsed);
        setApm((totalActions.current / elapsed) * 60);
      }

      if (limitMs != null) {
        const clampedMs = Math.min(elapsedMs, limitMs);
        setTime(Math.floor(clampedMs / 1000));

        if (elapsedMs >= limitMs) {
          debugLog.game(`Time limit reached for mode ${gameMode.id}. Ending game.`);
          setGameOver(true);
          const finalStats = { score, lines, level, time: limitMs / 1000, pps, apm, gameMode: gameMode.id };
          onGameEnd(finalStats);
          if (isRecording) {
            try {
              stopRecording({ ...finalStats, duration: limitMs, gameType: 'single' } as any).then(replay => {
                if (replay) console.log(`Time attack replay saved: ${replay.id}`);
              });
            } catch (error) {
              console.error('Error saving time attack replay:', error);
              debugLog.error('Error saving time attack replay', error);
            }
          }
          return; // 终止循环
        }
      } else {
        // 非限时模式
        setTime(Math.floor(elapsed));
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [gameStarted, gameOver, gameMode.id, gameMode.timeLimit, isPaused, onGameEnd, score, lines, level, pps, apm, isRecording, stopRecording]);

  useEffect(() => {
    // 在回放模式下，下落由录像动作驱动，不自动下落
    if (isReplay || gameOver || isPaused || !currentPiece || !isWindowFocused || isHardDropping || !gameStarted) return;

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
    // 确保存在固定种子
    if (!seedRef.current) {
      seedRef.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    // 仅在特定模式下开始录像
    const recordableModes = ['sprint40', 'sprint100', 'timeAttack2', 'timeAttack5', 'versus', '1v1'];
    if (!isRecording && recordableModes.includes(gameMode.id)) {
      try {
        startRecording(board.map(row => [...row]), { gameMode: gameMode.id }, seedRef.current);
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
    gameStartTime, // Expose for high-precision timers
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
