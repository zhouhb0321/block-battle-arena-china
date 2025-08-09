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
  const [sprintProgress, setSprintProgress] = useState(0); // For 40L weighted lines

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
  
  const { user } = useAuth();
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
      if (isRecording && gameMode.id !== 'endless') {
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
      let weightedLines = linesCleared;
      
      if (isTSpin) {
        clearType = `tspin_${linesCleared === 3 ? 'triple' : linesCleared === 2 ? 'double' : 'single'}`;
        lineScore = [800, 1200, 1600][linesCleared - 1] * level;
        isSpecialClear = true;
        
        // Weighted lines for T-Spins
        if (gameMode.id === 'sprint40') {
          weightedLines = [2, 4, 6][linesCleared - 1];
        }

        const tspinResult = lastTSpinCheck.current ? checkTSpin(lastTSpinCheck.current.board, lastTSpinCheck.current.piece, 'rotate', lastTSpinCheck.current.wasKicked) : null;
        const isMini = tspinResult?.isMini || false;
        
        const b2bNext = b2bCount > 0 ? b2bCount + 1 : 1;
        if (linesCleared === 2) {
          showTSpin(2, isMini, b2bCount > 0, b2bNext);
        } else if (linesCleared === 3) {
          showTSpin(3, isMini, b2bCount > 0, b2bNext);
        } else {
          showTSpin(1, isMini, b2bCount > 0, b2bNext);
        }
        setB2bCount(prev => prev + 1);
      } else if (linesCleared === 4) {
        clearType = 'tetris';
        lineScore = 800 * level;
        isSpecialClear = true;
        
        const b2bNext = b2bCount > 0 ? b2bCount + 1 : 1;
        
        showTetris(false, b2bCount > 0, b2bNext);
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

      // 40L Sprint 模式结束条件
      if (gameMode.id === 'sprint40' && newLines >= 40 && !gameOver) {
        setGameOver(true);
        const finalStats = { score, lines: newLines, level, time, pps, apm, gameMode: gameMode.id };
        onGameEnd(finalStats);
        if (isRecording) {
          stopRecording(finalStats as any);
        }
      }
      setScore(prev => prev + lineScore);
      
      if (onSpecialClear && (clearType || linesCleared >= 4)) {
        onSpecialClear(clearType || 'tetris', linesCleared);
      }

      // 40L Sprint 模式结束条件
      if (gameMode.id === 'sprint40' && !gameOver) {
        const newSprintProgress = sprintProgress + weightedLines;
        setSprintProgress(newSprintProgress);
        if (newSprintProgress >= 40) {
          setGameOver(true);
          const finalStats = { score, lines: newLines, level, time, pps, apm, gameMode: gameMode.id };
          onGameEnd(finalStats);
          if (isRecording && gameMode.id !== 'endless') {
            stopRecording(finalStats as any);
          }
        }
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
    
    setScore(prev => prev + dropDistance * 2);
    totalActions.current++;
    
    // Record replay action
    if (isRecording) {
      recordAction('drop', { type: 'hard' });
    }
    
    // 在锁定前保存状态以支持撤销
    if (isSinglePlayer) {
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

    // T-Spin 检测（若当前为T并且上次旋转记录存在）
    const isTSpin = droppedPiece.type.type === 'T' && lastTSpinCheck.current && 
      checkTSpin(lastTSpinCheck.current.board, lastTSpinCheck.current.piece, 'rotate', lastTSpinCheck.current.wasKicked);

    setBoard(clearedBoard);

    if (linesCleared > 0) {
      const newLines = lines + linesCleared;
      const newLevel = Math.floor(newLines / 10) + 1;
      let lineScore = 0;

      const newComboCount = comboCount + 1;
      setComboCount(newComboCount);

      let clearType = '';
      let weightedLines = linesCleared;

      if (isTSpin) {
        clearType = `tspin_${linesCleared === 3 ? 'triple' : linesCleared === 2 ? 'double' : 'single'}`;
        lineScore = [800, 1200, 1600][Math.max(0, linesCleared - 1)] * level;

        if (gameMode.id === 'sprint40') {
          weightedLines = [2, 4, 6][linesCleared - 1];
        }

        const tspinResult = lastTSpinCheck.current ? checkTSpin(lastTSpinCheck.current.board, lastTSpinCheck.current.piece, 'rotate', lastTSpinCheck.current.wasKicked) : null;
        const isMini = tspinResult?.isMini || false;
        const b2bNext = b2bCount > 0 ? b2bCount + 1 : 1;
        if (linesCleared === 2) {
          showTSpin(2, isMini, b2bCount > 0, b2bNext);
        } else if (linesCleared === 3) {
          showTSpin(3, isMini, b2bCount > 0, b2bNext);
        } else {
          showTSpin(1, isMini, b2bCount > 0, b2bNext);
        }
        setB2bCount(prev => prev + 1);
      } else if (linesCleared === 4) {
        clearType = 'tetris';
        lineScore = 800 * level;
        const b2bNext = b2bCount > 0 ? b2bCount + 1 : 1;
        showTetris(false, b2bCount > 0, b2bNext);
        setB2bCount(prev => prev + 1);
      } else {
        lineScore = [100, 300, 500][Math.max(0, linesCleared - 1)] * level;
        setB2bCount(0);
      }

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

      // 40L Sprint 模式结束条件
      if (gameMode.id === 'sprint40' && newLines >= 40 && !gameOver) {
        setGameOver(true);
        const finalStats = { score, lines: newLines, level, time, pps, apm, gameMode: gameMode.id };
        onGameEnd(finalStats);
        if (isRecording) {
          stopRecording(finalStats as any);
        }
      }
      setScore(prev => prev + lineScore);

      if (onSpecialClear && (clearType || linesCleared >= 4)) {
        onSpecialClear(clearType || 'tetris', linesCleared);
      }

      // 40L Sprint 模式结束条件
      if (gameMode.id === 'sprint40' && !gameOver) {
        const newSprintProgress = sprintProgress + weightedLines;
        setSprintProgress(newSprintProgress);
        if (newSprintProgress >= 40) {
          setGameOver(true);
          const finalStats = { score, lines: newLines, level, time, pps, apm, gameMode: gameMode.id };
          onGameEnd(finalStats);
          if (isRecording && gameMode.id !== 'endless') {
            stopRecording(finalStats as any);
          }
        }
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

  const timerWorker = useRef<Worker | null>(null);

  const handleBestReplaySaving = useCallback(async (finalStats: GameStats) => {
    if (!user || user.isGuest) {
      if (isRecording) await stopRecording(finalStats);
      return;
    }

    debugLog.game(`检查 ${gameMode.id} 模式的最佳分数`);
    const { data: bestRecord, error: fetchError } = await supabase
      .from('user_best_records')
      .select('best_score')
      .eq('user_id', user.id)
      .eq('game_mode', gameMode.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('获取最佳记录失败:', fetchError);
      if (isRecording) await stopRecording(finalStats);
      return;
    }

    const currentBest = bestRecord?.best_score || 0;
    if (finalStats.score > currentBest) {
      debugLog.game(`新高分! ${finalStats.score} > ${currentBest}. 保存录像...`);
      const replay = await stopRecording(finalStats);
      if (replay) {
        const { error: upsertError } = await supabase
          .from('user_best_records')
          .upsert({
            user_id: user.id,
            game_mode: gameMode.id,
            best_score: finalStats.score,
            best_time: finalStats.time * 1000,
            replay_id: replay.id,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id, game_mode' });

        if (upsertError) console.error('更新最佳记录失败:', upsertError);
        else console.log('最佳记录更新成功!');
      }
    } else {
      debugLog.game(`分数未超过最高分 (${finalStats.score} <= ${currentBest}). 不保存录像.`);
      await stopRecording(null);
    }
  }, [user, gameMode.id, isRecording, stopRecording]);

  // 游戏结束和计时器逻辑
  useEffect(() => {
    if (!gameStarted || gameOver) {
      if (timerWorker.current) {
        timerWorker.current.postMessage({ command: 'stop' });
        timerWorker.current.terminate();
        timerWorker.current = null;
      }
      return;
    }

    if (gameMode.id === 'ultra2min') {
      if (!timerWorker.current) {
        timerWorker.current = new Worker(new URL('../utils/timer.worker.ts', import.meta.url), { type: 'module' });

        timerWorker.current.onmessage = (e: MessageEvent) => {
          if (e.data.type === 'tick') {
            setTime(e.data.time);
            if (e.data.time >= 120) {
              setGameOver(true);
            }
          }
        };

        timerWorker.current.postMessage({ command: 'start', startTime: time });
      }
    }

    return () => {
      if (timerWorker.current) {
        timerWorker.current.postMessage({ command: 'stop' });
        timerWorker.current.terminate();
        timerWorker.current = null;
      }
    };
  }, [gameStarted, gameOver, gameMode.id]);

  const handleBestReplaySaving = useCallback(async (finalStats: GameStats) => {
    if (!user || user.isGuest || gameMode.id !== 'ultra2min') {
      if (isRecording) {
        await stopRecording(finalStats);
      }
      return;
    }

    // 1. 获取当前最佳分数
    const { data: bestRecord, error: fetchError } = await supabase
      .from('user_best_records')
      .select('best_score')
      .eq('user_id', user.id)
      .eq('game_mode', gameMode.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('获取最佳记录失败:', fetchError);
      return;
    }

    const currentBest = bestRecord?.best_score || 0;

    // 2. 如果是新高分，则保存录像并更新记录
    if (finalStats.score > currentBest) {
      console.log(`新高分! ${finalStats.score} > ${currentBest}. 保存录像...`);
      const replay = await stopRecording(finalStats);
      if (replay) {
        const { error: upsertError } = await supabase
          .from('user_best_records')
          .upsert({
            user_id: user.id,
            game_mode: gameMode.id,
            best_score: finalStats.score,
            replay_id: replay.id,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id, game_mode' });

        if (upsertError) console.error('更新最佳记录失败:', upsertError);
        else console.log('最佳记录更新成功!');
      }
    } else {
      console.log(`分数未超过最高分 (${finalStats.score} <= ${currentBest}). 不保存录像.`);
      // 不保存录像，但需要停止录制状态
      stopRecording(null);
    }
  }, [user, gameMode.id, isRecording, stopRecording]);

  // 游戏结束处理
  useEffect(() => {
    if (gameOver) {
      if (timerWorker.current) {
        timerWorker.current.postMessage({ command: 'stop' });
      }

      const finalStats = { score, lines, level, time, pps, apm, gameMode: gameMode.id };

      if (gameMode.id === 'ultra2min') {
        finalStats.time = 120;
        handleBestReplaySaving(finalStats);
      } else if (isRecording && gameMode.id !== 'endless') {
        stopRecording(finalStats);
      }

      onGameEnd(finalStats);
    }
  }, [gameOver]);

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
    // Start replay recording at game start, except for endless mode
    if (gameMode.id !== 'endless' && !isRecording) {
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
    try {
      if (isRecording && gameMode.id !== 'endless') {
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
      }
    } catch (e) {
      console.warn('重置前保存录像失败', e);
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
    if (!isSinglePlayer) return null;
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
  }, [isSinglePlayer, gameStateManager, clearLockDelayTimer]);

  const redoAction = useCallback(() => {
    if (!isSinglePlayer) return null;
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
  }, [isSinglePlayer, gameStateManager, clearLockDelayTimer]);

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
    undo: isSinglePlayer ? undoAction : () => {},
    redo: isSinglePlayer ? redoAction : () => {},
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
