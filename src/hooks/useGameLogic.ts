import { useState, useEffect, useCallback, useRef } from 'react';
import { useWindowFocus } from './useWindowFocus';
import { useGameState } from './useGameState';
import { useAchievements } from './useAchievements';
import { useReplayRecorderV4 } from './useReplayRecorderV4';
import { useAuth } from '@/contexts/AuthContext';
import { useGameRecording } from '@/contexts/GameRecordingContext';
import { useReplayDiagnosticsContext } from '@/contexts/ReplayDiagnosticsContext';
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
import { calculateScore } from '@/utils/scoringSystem';
import type { 
  Board, 
  TetrominoType, 
  GameMode, 
  Position,
  GamePiece
} from '@/utils/gameTypes';

interface UseGameLogicProps {
  gameMode: GameMode;
  onSpecialClear?: (clearType: string, lines: number) => void;
  onAchievement?: (text: string, type: 'tetris' | 'tspin' | 'combo' | 'perfect' | 'level') => void;
  undoSteps?: number;
  isReplay?: boolean;
  replaySeed?: string;
  enableReplayGravity?: boolean;
  replayClockControlled?: boolean;
  onAttack?: (attackData: any) => void;
  onIncomingGarbage?: (lines: number[]) => void;
}

export const useGameLogic = ({
  gameMode,
  onSpecialClear,
  onAchievement,
  undoSteps = 50,
  isReplay = false,
  replaySeed,
  enableReplayGravity = false,
  replayClockControlled = false,
  onAttack,
  onIncomingGarbage
}: UseGameLogicProps) => {
  const [board, setBoard] = useState<Board>(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState<GamePiece | null>(null);
  
  // Keep refs in sync with state
  useEffect(() => {
    boardRef.current = board;
  }, [board]);
  
  useEffect(() => {
    currentPieceRef.current = currentPiece;
  }, [currentPiece]);
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
  const [isB2B, setIsB2B] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [phase, setPhase] = useState<'ready' | 'countdown' | 'playing' | 'gameOver'>('ready');
  
  // Replay clock control states
  const [gravityAccumulatorMs, setGravityAccumulatorMs] = useState(0);
  const [lockDelayRemainingMs, setLockDelayRemainingMs] = useState(0);

  const recorder = useReplayRecorderV4();
  const { 
    isRecording, 
    startRecording, 
    recordSpawn, 
    recordInput, 
    recordLock, 
    stopRecording, 
    clearRecording 
  } = recorder;
  const { achievements, showTetris, showTSpin, showCombo, showPerfectClear, showLevelUp, showLineClear, removeAchievement } = useAchievements();
  const { user } = useAuth();
  const gameRecording = useGameRecording();
  const diagnostics = useReplayDiagnosticsContext();
  const isUndoRedoEnabled = gameMode.id === 'endless';
  const gameStateManager = useGameState({ maxHistorySize: undoSteps, enabled: isUndoRedoEnabled });
  const { isWindowFocused, setWasManuallyPaused } = useWindowFocus();

  const gameStartTime = useRef<number | null>(null);
  const seedRef = useRef<string>('');
  const totalPieces = useRef<number>(0);
  const totalActions = useRef<number>(0);
  const lockDelayTimer = useRef<NodeJS.Timeout | null>(null);
  const lockDelayTimerId = useRef<number | null>(null);
  const [lockDelayResetCount, setLockDelayResetCount] = useState(0);
  const lastTSpinCheck = useRef<{ piece: GamePiece; board: Board; wasKicked: boolean } | null>(null);
  
  // Track last move for proper T-spin detection
  const lastMoveRef = useRef<string>('spawn');
  const lastWasKickedRef = useRef<boolean>(false);
  
  // Use refs to ensure lock delay operations use current state
  const currentPieceRef = useRef<GamePiece | null>(null);
  const boardRef = useRef<Board>(createEmptyBoard());

  const LOCK_DELAY_TIME = 500;
  const MAX_LOCK_RESETS = 15;

  const createGamePiece = useCallback((pieceType: TetrominoType): GamePiece => createNewPiece(pieceType), []);

  // Register recorder and callbacks with GameRecordingContext
  useEffect(() => {
    if (!isReplay) {
      console.log('[useGameLogic] Registering recorder with GameRecordingContext');
      gameRecording.registerRecorder(recorder);
      
      gameRecording.registerStatsGetter(() => ({
        score,
        lines,
        level,
        duration: gameStartTime.current ? Date.now() - gameStartTime.current : 0,
        pps,
        apm
      }));
      
      gameRecording.registerGameModeGetter(() => gameMode.id);
    }
  }, [gameRecording, recorder, isReplay, score, lines, level, pps, apm, gameMode.id]);

  // Update game active state based on game status
  useEffect(() => {
    if (!isReplay) {
      const isActive = gameStarted && !gameOver && phase === 'playing';
      console.log('[useGameLogic] Game active state:', isActive, { gameStarted, gameOver, phase });
      gameRecording.setGameActive(isActive);
    }
  }, [gameStarted, gameOver, phase, gameRecording, isReplay]);

  // Handle game over - stop recording if game ends abnormally (e.g., stack overflow)
  useEffect(() => {
    if (!isReplay && gameOver && isRecording && gameStartTime.current) {
      const elapsed = (Date.now() - gameStartTime.current) / 1000;
      console.log('[useGameLogic] Game over detected, stopping recording');
      gameRecording.setGameActive(false);
      
      stopRecording({
        score,
        lines,
        level,
        duration: Date.now() - gameStartTime.current,
        pps: totalPieces.current / elapsed,
        apm: (totalActions.current / elapsed) * 60
      }, gameMode.id, 'gameover').then(result => {
        if (result.isNewRecord) {
          setIsNewRecord(true);
        }
      });
    }
  }, [gameOver, isRecording, isReplay, gameRecording, stopRecording, score, lines, level, gameMode.id]);

  const clearLockDelayTimer = useCallback(() => {
    if (lockDelayTimer.current) {
      clearTimeout(lockDelayTimer.current);
      lockDelayTimer.current = null;
    }
    lockDelayTimerId.current = null;
  }, []);
  
  const spawnNewPiece = useCallback(() => {
    // Defensive check: ensure nextPieces has at least one piece
    if (!nextPieces || nextPieces.length === 0) {
      console.error('[useGameLogic] spawnNewPiece: nextPieces is empty, generating initial pieces');
      // Generate initial pieces if array is empty
      const initialPieces = Array.from({ length: 7 }, () => createGamePiece(generateRandomPiece()));
      setCurrentPiece(initialPieces[0]);
      setNextPieces(initialPieces.slice(1));
      setCanHold(true);
      setLockDelayResetCount(0);
      totalPieces.current++;
      return;
    }
    
    const newPiece = nextPieces[0];
    
    // Additional safety check
    if (!newPiece) {
      console.error('[useGameLogic] spawnNewPiece: newPiece is undefined from nextPieces[0]');
      const emergencyPiece = createGamePiece(generateRandomPiece());
      setCurrentPiece(emergencyPiece);
      setCanHold(true);
      setLockDelayResetCount(0);
      totalPieces.current++;
      return;
    }
    
    const newNextPieces = [...nextPieces.slice(1)];
    if (newNextPieces.length < 6) {
      newNextPieces.push(...Array.from({ length: 7 }, () => createGamePiece(generateRandomPiece())));
    }

    setCurrentPiece(newPiece);
    setNextPieces(newNextPieces);
    setCanHold(true);
    setLockDelayResetCount(0);
    totalPieces.current++;
    
    // Record SPAWN event for V4
    if (isRecording) {
      recordSpawn(newPiece.type.type, newPiece.x, newPiece.y);
    }

    if (!isValidPosition(board, newPiece)) {
      // 无尽模式：堆满时重新开始游戏但保留状态
      if (gameMode.id === 'endless') {
        setBoard(createEmptyBoard());
        setCurrentPiece(newPiece);
        setComboCount(0);
        setIsB2B(0);
        // 保留分数、等级、时间等状态，只清空棋盘
        return;
      }
      setGameOver(true);
    }
  }, [nextPieces, board, createGamePiece, gameMode.id]);

  const handlePieceLock = useCallback((pieceToLock: GamePiece) => {
    if (!pieceToLock) return;

    // 1. T-Spin Check using tracked last move
    const tSpinResult = checkTSpin(board, pieceToLock, lastMoveRef.current, lastWasKickedRef.current);

    // 2. Place piece and clear lines
    const newBoard = placePiece(board, pieceToLock);
    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
    const isPerfectClear = clearedBoard.every(row => row.every(cell => cell === 0));

    // 3. Update core game state
    setBoard(clearedBoard);
    const newTotalLines = lines + linesCleared;

    // 4. Scoring and Achievements
    if (linesCleared > 0) {
      const newCombo = comboCount + 1;
      // T-Spin 必须消行才算 difficult clear，T-Spin 0 不算但也不打断 B2B
      const isDifficultClear = (tSpinResult !== null && linesCleared > 0) || linesCleared === 4;
      const newB2B = isDifficultClear 
        ? isB2B + 1 
        : (tSpinResult !== null && linesCleared === 0) 
          ? isB2B  // T-Spin 0 保持 B2B 不变
          : 0;     // 其他情况重置 B2B

      const scoreResult = calculateScore({
        linesCleared,
        tSpin: tSpinResult ? (tSpinResult.isMini ? 'mini' : 'normal') : 'none',
        isB2B: newB2B > 1,
        combo: newCombo,
        isPerfectClear,
      });
      setScore(prev => prev + scoreResult.score);

      // Show achievements
      if (isPerfectClear) showPerfectClear();

      // 显示主要成就
      if (tSpinResult) {
        // T-Spin (包括 T-Spin 0)
        showTSpin(linesCleared, tSpinResult.isMini, newB2B > 1, newB2B);
      } else if (linesCleared === 4) {
        // Tetris
        showTetris(false, newB2B > 1, newB2B);
      } else if (linesCleared >= 1 && linesCleared <= 3) {
        // 普通消行 (Single/Double/Triple)
        showLineClear(linesCleared, newB2B > 1, newB2B);
      }

      // Combo 从 1 开始显示
      if (newCombo >= 1) {
        showCombo(newCombo);
      }

      setComboCount(newCombo);
      setIsB2B(newB2B);
    } else {
      setComboCount(0);
    }

    setLines(newTotalLines);
    const newLevel = Math.floor(newTotalLines / 10) + 1;
    setLevel(newLevel);
    
    // Record LOCK event for V4 (after state updates for accurate data)
    if (isRecording) {
      const isDifficultClear = tSpinResult !== null || linesCleared === 4;
      const currentScore = score + (linesCleared > 0 ? calculateScore({
        linesCleared,
        tSpin: tSpinResult ? (tSpinResult.isMini ? 'mini' : 'normal') : 'none',
        isB2B: (isDifficultClear ? isB2B + 1 : 0) > 1,
        combo: linesCleared > 0 ? comboCount + 1 : comboCount,
        isPerfectClear,
      }).score : 0);
      
      recordLock(
        pieceToLock.type.type,
        pieceToLock.x,
        pieceToLock.y,
        pieceToLock.rotation,
        linesCleared,
        tSpinResult !== null,
        tSpinResult?.isMini || false,
        clearedBoard,
        nextPieces.map(p => p.type.type),
        holdPiece?.type?.type ?? null,
        currentScore,
        newTotalLines,
        newLevel
      );
    }
    
    // Record diagnostic snapshot if diagnostics enabled
    if (diagnostics.enabled) {
      const timestamp = gameStartTime.current ? Date.now() - gameStartTime.current : 0;
      const isDifficultClear = tSpinResult !== null || linesCleared === 4;
      const currentScore = score + (linesCleared > 0 ? calculateScore({
        linesCleared,
        tSpin: tSpinResult ? (tSpinResult.isMini ? 'mini' : 'normal') : 'none',
        isB2B: (isDifficultClear ? isB2B + 1 : 0) > 1,
        combo: linesCleared > 0 ? comboCount + 1 : comboCount,
        isPerfectClear,
      }).score : 0);
      
      diagnostics.recordSnapshot(
        timestamp,
        {
          type: pieceToLock.type.type,
          x: pieceToLock.x,
          y: pieceToLock.y,
          rotation: pieceToLock.rotation
        },
        clearedBoard,
        nextPieces.map(p => p.type.type),
        holdPiece?.type?.type ?? null,
        currentScore,
        newTotalLines,
        newLevel
      );
    }

    // 5. Reset move tracking for next piece
    lastMoveRef.current = 'spawn';
    lastWasKickedRef.current = false;
    
    // 6. Spawn next piece
    spawnNewPiece();

  }, [board, isB2B, comboCount, lines, score, nextPieces, holdPiece, spawnNewPiece, showTSpin, showTetris, showCombo, showPerfectClear, isRecording, recordLock]);

  const lockPiece = useCallback(() => {
    if (!currentPiece) return;
    clearLockDelayTimer();
    handlePieceLock(currentPiece);
  }, [currentPiece, handlePieceLock, clearLockDelayTimer]);

  const startLockDelay = useCallback(() => {
    const piece = currentPieceRef.current;
    if (!piece) return;
    const testPiece = { ...piece, y: piece.y + 1 };
    if (isValidPosition(boardRef.current, testPiece)) return;
    
    if (replayClockControlled) {
      // In replay mode, use virtual timer
      setLockDelayRemainingMs(LOCK_DELAY_TIME);
      return;
    }
    
    const timerId = Date.now();
    lockDelayTimerId.current = timerId;
    
    lockDelayTimer.current = setTimeout(() => {
      // Only proceed if this is still the active timer and game is running
      if (lockDelayTimerId.current === timerId && !gameOver && !isPaused && gameStarted) {
        const finalPiece = currentPieceRef.current;
        if (finalPiece) {
          // Double check piece is still on ground
          const testPiece = { ...finalPiece, y: finalPiece.y + 1 };
          if (!isValidPosition(boardRef.current, testPiece)) {
            handlePieceLock(finalPiece);
          }
        }
      }
      lockDelayTimer.current = null;
      lockDelayTimerId.current = null;
    }, LOCK_DELAY_TIME);
  }, [handlePieceLock, gameOver, isPaused, gameStarted, replayClockControlled]);

  const resetLockDelay = useCallback(() => {
    if (lockDelayResetCount >= MAX_LOCK_RESETS) {
      lockPiece();
      return false;
    }
    
    const piece = currentPieceRef.current;
    if (piece) {
      const testPiece = { ...piece, y: piece.y + 1 };
      const isOnGround = !isValidPosition(boardRef.current, testPiece);
      
      if (isOnGround) {
        if (replayClockControlled) {
          setLockDelayRemainingMs(LOCK_DELAY_TIME);
        } else {
          clearLockDelayTimer();
          startLockDelay();
        }
        setLockDelayResetCount(prev => prev + 1);
        return true;
      }
    }
    return false;
  }, [lockDelayResetCount, lockPiece, clearLockDelayTimer, startLockDelay, replayClockControlled]);

  const movePiece = useCallback((dx: number, dy: number): boolean => {
    if (!currentPiece || gameOver || isPaused) return false;

    const newPiece = { ...currentPiece, x: currentPiece.x + dx, y: currentPiece.y + dy };

    if (isValidPosition(board, newPiece)) {
      setCurrentPiece(newPiece);
      
      // Track move for T-spin detection
      lastMoveRef.current = dx !== 0 ? 'move' : 'drop';
      lastWasKickedRef.current = false;
      
      // Reset lock delay for horizontal moves when piece is on ground
      if (dx !== 0) {
        const testDownPiece = { ...newPiece, y: newPiece.y + 1 };
        if (!isValidPosition(board, testDownPiece)) {
          // Piece is on ground, reset lock delay
          resetLockDelay();
        }
      }
      
      // Record input for V4 with position (only for user actions, not gravity)
      if (isRecording && (dx !== 0 || (dy > 0 && dx === 0))) {
        const action = dx < 0 ? 'moveLeft' : dx > 0 ? 'moveRight' : 'softDrop';
        recordInput(action, true, { x: newPiece.x, y: newPiece.y }, newPiece.rotation);
      }
      
      return true; // ✅ 移动成功
    } else if (dy > 0) {
      // Only start lock delay if piece fails to move down
      startLockDelay();
    }
    
    return false; // ✅ 移动失败
  }, [currentPiece, board, gameOver, isPaused, startLockDelay, resetLockDelay, isRecording, recordInput]);


  const hardDrop = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return;
    
    // Record hard drop input for V4 with final position
    if (isRecording) {
      const dropY = calculateDropPosition(board, currentPiece);
      recordInput('hardDrop', true, { x: currentPiece.x, y: dropY }, currentPiece.rotation);
    }
    
    const dropY = calculateDropPosition(board, currentPiece);
    const pieceToLock = { ...currentPiece, y: dropY };
    
    // Track hard drop for T-spin detection
    lastMoveRef.current = 'drop';
    lastWasKickedRef.current = false;
    
    // Also add score for the drop distance
    const dropDistance = dropY - currentPiece.y;
    setScore(prev => prev + dropDistance);

    handlePieceLock(pieceToLock);
  }, [currentPiece, board, gameOver, isPaused, handlePieceLock, isRecording, recordInput]);

  const rotatePiece = (clockwise: boolean) => {
    if (!currentPiece || gameOver || isPaused) return;
    const srsResult = performSRSRotation(board, currentPiece, clockwise);
    if (srsResult.success && srsResult.newPiece) {
      setCurrentPiece(srsResult.newPiece);
      
      // Track rotation for T-spin detection
      lastMoveRef.current = 'rotate';
      lastWasKickedRef.current = srsResult.wasKicked;
      
      // Reset lock delay when rotating on ground
      const testDownPiece = { ...srsResult.newPiece, y: srsResult.newPiece.y + 1 };
      if (!isValidPosition(board, testDownPiece)) {
        // Piece is on ground, reset lock delay
        resetLockDelay();
      }
      
      // Record rotation input for V4 with position
      if (isRecording) {
        recordInput(
          clockwise ? 'rotateClockwise' : 'rotateCounterclockwise', 
          true,
          { x: srsResult.newPiece.x, y: srsResult.newPiece.y },
          srsResult.newPiece.rotation
        );
      }
    }
  };
  const rotatePieceClockwise = useCallback(() => rotatePiece(true), [currentPiece, board, gameOver, isPaused]);
  const rotatePieceCounterclockwise = useCallback(() => rotatePiece(false), [currentPiece, board, gameOver, isPaused]);

  const rotatePiece180 = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return;
    const srsResult = performSRS180Rotation(board, currentPiece);
    if (srsResult.success && srsResult.newPiece) {
      setCurrentPiece(srsResult.newPiece);
      
      // Track 180 rotation for T-spin detection
      lastMoveRef.current = 'rotate';
      lastWasKickedRef.current = srsResult.wasKicked;
      
      // Reset lock delay when rotating on ground
      const testDownPiece = { ...srsResult.newPiece, y: srsResult.newPiece.y + 1 };
      if (!isValidPosition(board, testDownPiece)) {
        // Piece is on ground, reset lock delay
        resetLockDelay();
      }
      
      // Record rotation input for V4 with position
      if (isRecording) {
        recordInput('rotate180', true, { x: srsResult.newPiece.x, y: srsResult.newPiece.y }, srsResult.newPiece.rotation);
      }
    }
  }, [currentPiece, board, gameOver, isPaused, resetLockDelay, isRecording, recordInput]);

  const holdCurrentPiece = useCallback(() => {
    if (!canHold || gameOver || isPaused) return;
    const newHoldPiece = currentPiece;
    setCurrentPiece(holdPiece || createGamePiece(generateRandomPiece()));
    setHoldPiece(newHoldPiece);
    setCanHold(false);
    
    // Track hold for T-spin detection
    lastMoveRef.current = 'hold';
    lastWasKickedRef.current = false;
    
    // Record hold input for V4 with position
    if (isRecording && currentPiece) {
      recordInput('hold', true, { x: currentPiece.x, y: currentPiece.y }, currentPiece.rotation);
    }
  }, [canHold, gameOver, isPaused, currentPiece, holdPiece, createGamePiece, isRecording, recordInput]);

  const startGame = useCallback(() => {
    // Clear any existing lock delay timer
    clearLockDelayTimer();
    
    setBoard(createEmptyBoard());
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setIsPaused(false);
    setGameInitialized(true);
    setCanHold(true);
    setHoldPiece(null);
    setComboCount(0);
    setIsB2B(0);
    setIsNewRecord(false);
    setLockDelayResetCount(0);
    
    // Skip countdown for replay mode
    if (isReplay) {
      setPhase('playing');
      setGameStarted(true);
      gameStartTime.current = Date.now();
    } else {
      setPhase('countdown');
    }

    // Apply replay seed for deterministic playback
    const useSeed = replaySeed || seedRef.current || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (!seedRef.current) {
      seedRef.current = useSeed;
    }
    
    // Reset 7-bag with proper seed for replay consistency
    resetSevenBag(useSeed);
    
    const initialPieces = Array.from({ length: 7 }, () => createGamePiece(generateRandomPiece()));
    setCurrentPiece(initialPieces[0]);
    setNextPieces(initialPieces.slice(1));
    
    // Start V4 recording for non-endless modes (and non-replay modes)
    if (!isReplay && gameMode.id !== 'endless') {
      // Only start recording if user is authenticated
      if (user && user.id) {
        console.log('[V4] Starting replay recording for mode:', gameMode.id, 'user:', user.id);
        
        // Get initial piece sequence (first 2 bags = 14 pieces)
        const initialSequence = initialPieces.map(p => p.type);
        const nextSequence = Array.from({ length: 7 }, () => generateRandomPiece());
        const fullSequence = [...initialSequence, ...nextSequence];
        
        startRecording(
          useSeed,
          fullSequence.slice(0, 14).map(p => String(p)),
          {
            das: 167,
            arr: 33,
            sdf: 20
          },
          user.id,
          user.email?.split('@')[0] || user.username || 'Player',
          gameMode.id
        );
        
        // Start diagnostics recording if enabled
        diagnostics.startRecording();
      } else {
        console.warn('[V4] User not authenticated, replay recording skipped');
      }
    }
    
    // Only start countdown timer if not in replay mode
    if (!isReplay) {
      setTimeout(() => {
        setGameStarted(true);
        setPhase('playing');
        gameStartTime.current = Date.now();
      }, 3000); // 3-second countdown
    }

  }, [createGamePiece, isReplay, gameMode.id, startRecording, replaySeed, clearLockDelayTimer, user]);

  // Virtual clock tick for replay mode - synchronous processing with refs
  const tickReplay = useCallback((deltaMs: number) => {
    if (!replayClockControlled || !gameStarted || gameOver || isPaused) return;
    
    const dropInterval = Math.max(50, 1000 - (level - 1) * 50);
    let remainingDelta = deltaMs;
    
    // Use refs for synchronous processing
    let currentGravityAccumulator = gravityAccumulatorMs;
    let currentLockDelayRemaining = lockDelayRemainingMs;
    
    // Process gravity in a while loop for multiple steps per tick
    while (remainingDelta > 0) {
      // Handle gravity accumulation
      currentGravityAccumulator += remainingDelta;
      
      // Check if gravity should trigger a drop
      if (currentGravityAccumulator >= dropInterval && currentPieceRef.current) {
        const piece = currentPieceRef.current;
        const newPiece = { ...piece, y: piece.y + 1 };
        
        if (isValidPosition(boardRef.current, newPiece)) {
          // Piece can move down
          setCurrentPiece(newPiece);
          currentPieceRef.current = newPiece;
          currentGravityAccumulator -= dropInterval;
          
          // Track move for T-spin detection
          lastMoveRef.current = 'drop';
          lastWasKickedRef.current = false;
        } else {
          // Piece cannot move down, start lock delay if not already started
          if (currentLockDelayRemaining <= 0) {
            currentLockDelayRemaining = LOCK_DELAY_TIME;
          }
          currentGravityAccumulator = 0; // Reset gravity accumulator
        }
      }
      
      // Handle lock delay countdown
      if (currentLockDelayRemaining > 0) {
        currentLockDelayRemaining = Math.max(0, currentLockDelayRemaining - remainingDelta);
        
        // If lock delay expired, lock the piece
        if (currentLockDelayRemaining === 0 && currentPieceRef.current) {
          const piece = currentPieceRef.current;
          const testPiece = { ...piece, y: piece.y + 1 };
          if (!isValidPosition(boardRef.current, testPiece)) {
            handlePieceLock(piece);
          }
        }
      }
      
      remainingDelta = 0; // Exit loop after processing
    }
    
    // Update state with final values
    setGravityAccumulatorMs(currentGravityAccumulator);
    setLockDelayRemainingMs(currentLockDelayRemaining);
  }, [replayClockControlled, gameStarted, gameOver, isPaused, level, gravityAccumulatorMs, lockDelayRemainingMs, handlePieceLock]);

  // Force place method for replay position correction
  const forcePlace = useCallback((x: number, y: number, rotation: number) => {
    if (!currentPieceRef.current) return;
    
    const correctedPiece = {
      ...currentPieceRef.current,
      x,
      y, 
      rotation
    };
    
    // Validate and set the corrected position
    if (isValidPosition(boardRef.current, correctedPiece)) {
      setCurrentPiece(correctedPiece);
      currentPieceRef.current = correctedPiece;
    }
    
    // Immediately lock the piece
    handlePieceLock(correctedPiece);
  }, [handlePieceLock]);

  // Main Game Loop (Gravity) - disabled in replay clock controlled mode
  useEffect(() => {
    if (replayClockControlled || (isReplay && !enableReplayGravity) || !gameStarted || gameOver || isPaused || phase !== 'playing') return;

    const dropInterval = Math.max(50, 1000 - (level - 1) * 50);
    const timer = setTimeout(() => {
      // ✅ 重力下落由游戏引擎自动处理，不记录为INPUT事件
      // 只有用户主动按键的softDrop才应该被记录（在键盘处理器中）
      movePiece(0, 1);
    }, dropInterval);
    return () => clearTimeout(timer);
  }, [replayClockControlled, isReplay, enableReplayGravity, gameStarted, gameOver, isPaused, level, movePiece, phase, currentPiece, board, isValidPosition, isRecording, recordInput]);

  // RAF-based precise timing with immediate 2min mode termination - disabled in replay clock controlled mode
  useEffect(() => {
    if (replayClockControlled || (isReplay && !enableReplayGravity) || !gameStarted || gameOver || isPaused) return;

    let animationFrameId: number;

    const tick = () => {
      if (gameStartTime.current) {
        const elapsed = (Date.now() - gameStartTime.current) / 1000;
        const elapsedMs = Date.now() - gameStartTime.current;
        
        setTime(elapsed);
        
        if (totalPieces.current > 0) {
          setPps(totalPieces.current / elapsed);
          setApm((totalActions.current / elapsed) * 60);
        }

        // Check for time attack mode end condition with millisecond precision
        if (gameMode.isTimeAttack && gameMode.timeLimit) {
          const timeLimitMs = gameMode.timeLimit * 1000;
          if (elapsedMs >= timeLimitMs) {
            // Force immediate game end for time attack modes
            setPhase('gameOver');
            setGameOver(true);
            setGameStarted(false);
            gameRecording.setGameActive(false);
            
            if (isRecording) {
              stopRecording({
                score,
                lines,
                level,
                duration: timeLimitMs,
                pps: totalPieces.current / elapsed,
                apm: (totalActions.current / elapsed) * 60
              }, gameMode.id, 'complete').then(result => {
                if (result.isNewRecord) {
                  setIsNewRecord(true);
                }
              });
              diagnostics.stopRecording();
            }
            return; // Stop the animation frame
          }
        }

        // Check for line-based goals
        if (gameMode.targetLines && lines >= gameMode.targetLines) {
          setPhase('gameOver');
          setGameOver(true);
          setGameStarted(false);
          gameRecording.setGameActive(false);
          
            if (isRecording) {
              stopRecording({
                score,
                lines,
                level,
                duration: elapsedMs,
                pps: totalPieces.current / elapsed,
                apm: (totalActions.current / elapsed) * 60
              }, gameMode.id, 'complete').then(result => {
              if (result.isNewRecord) {
                setIsNewRecord(true);
              }
            });
            diagnostics.stopRecording();
          }
          return;
        }
      }
      
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isReplay, gameStarted, gameOver, isPaused, gameMode, score, lines, level, totalPieces, totalActions, isRecording, stopRecording]);

  const ghostPiece = currentPiece ? { ...currentPiece, y: calculateDropPosition(board, currentPiece) } : null;

  // ✅ P0: Force set game state for KEYFRAME correction
  const forceSetGameState = useCallback((state: {
    board?: Board;
    score?: number;
    lines?: number;
    level?: number;
    nextPieces?: string[];
    holdPiece?: string | null;
  }) => {
    if (state.board !== undefined) {
      setBoard(state.board);
      boardRef.current = state.board;
    }
    if (state.score !== undefined) setScore(state.score);
    if (state.lines !== undefined) setLines(state.lines);
    if (state.level !== undefined) setLevel(state.level);
    if (state.nextPieces !== undefined) {
      const { TETROMINO_TYPES } = require('./pieceGeneration');
      const newNextPieces = state.nextPieces
        .map(pieceTypeStr => TETROMINO_TYPES[pieceTypeStr])
        .filter(Boolean)
        .map(pieceType => createGamePiece(pieceType));
      setNextPieces(newNextPieces);
    }
    if (state.holdPiece !== undefined) {
      if (state.holdPiece === null) {
        setHoldPiece(null);
      } else {
        const { TETROMINO_TYPES } = require('./pieceGeneration');
        const pieceType = TETROMINO_TYPES[state.holdPiece];
        if (pieceType) {
          setHoldPiece(createGamePiece(pieceType));
        }
      }
    }
  }, [createGamePiece]);

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
    gameStarted,
    gameInitialized,
    comboCount,
    achievements,
    isNewRecord,
    phase,
    ghostPiece,
    startGame,
    pauseGame: () => setIsPaused(true),
    resumeGame: () => setIsPaused(false),
    resetGame: startGame,
    movePiece,
    rotatePieceClockwise,
    rotatePieceCounterclockwise,
    rotatePiece180,
    holdCurrentPiece,
    spawnNewPiece,
    lockPiece,
    hardDrop,
    initializeForCountdown: startGame,
    removeAchievement,
    isValidPosition,
    gameStartTime,
    getGameStats: () => ({ score, lines, level, time, pps, apm, gameMode: gameMode.id }),
    tickReplay,
    forcePlace,
    forceSetGameState, // ✅ Export for KEYFRAME correction
  };
};
