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
}

export const useGameLogic = ({
  gameMode,
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
  const [pps, setPps] = useState(0);
  const [apm, setApm] = useState(0);
  const [isHardDropping, setIsHardDropping] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameInitialized, setGameInitialized] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [isB2B, setIsB2B] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [phase, setPhase] = useState<'ready' | 'countdown' | 'playing' | 'gameOver'>('ready');

  
  const { startRecording, recordAction, stopRecording, isRecording } = useReplayRecorder();
  const { achievements, showTetris, showTSpin, showCombo, showPerfectClear, showLevelUp, removeAchievement } = useAchievements();
  const isUndoRedoEnabled = gameMode.id === 'endless';
  const gameStateManager = useGameState({ maxHistorySize: undoSteps, enabled: isUndoRedoEnabled });
  const { isWindowFocused, setWasManuallyPaused } = useWindowFocus();

  const gameStartTime = useRef<number | null>(null);
  const seedRef = useRef<string>('');
  const totalPieces = useRef<number>(0);
  const totalActions = useRef<number>(0);
  const lockDelayTimer = useRef<NodeJS.Timeout | null>(null);
  const [lockDelayResetCount, setLockDelayResetCount] = useState(0);
  const lastTSpinCheck = useRef<{ piece: GamePiece; board: Board; wasKicked: boolean } | null>(null);

  const LOCK_DELAY_TIME = 500;
  const MAX_LOCK_RESETS = 15;

  const createGamePiece = useCallback((pieceType: TetrominoType): GamePiece => createNewPiece(pieceType), []);

  const clearLockDelayTimer = useCallback(() => {
    if (lockDelayTimer.current) {
      clearTimeout(lockDelayTimer.current);
      lockDelayTimer.current = null;
    }
  }, []);
  
  const spawnNewPiece = useCallback(() => {
    const newPiece = nextPieces[0];
    const newNextPieces = [...nextPieces.slice(1)];
    if (newNextPieces.length < 6) {
      newNextPieces.push(...Array.from({ length: 7 }, () => createGamePiece(generateRandomPiece())));
    }

    setCurrentPiece(newPiece);
    setNextPieces(newNextPieces);
    setCanHold(true);
    setLockDelayResetCount(0);
    totalPieces.current++;

    if (!isValidPosition(board, newPiece)) {
      setGameOver(true);
    }
  }, [nextPieces, board, createGamePiece]);

  const handlePieceLock = useCallback((pieceToLock: GamePiece) => {
    // 1. T-Spin Check
    const tSpinResult = checkTSpin(board, pieceToLock, 'rotate'); // Assuming last action was rotate for check

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
      const isDifficultClear = tSpinResult !== null || linesCleared === 4;
      const newB2B = isDifficultClear ? isB2B + 1 : 0;

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

      if (tSpinResult) {
        showTSpin(linesCleared, tSpinResult.isMini, newB2B > 1, newB2B);
      } else if (linesCleared === 4) {
        showTetris(false, newB2B > 1, newB2B);
      }

      if (newCombo > 1) {
        showCombo(newCombo);
      }

      setComboCount(newCombo);
      setIsB2B(newB2B);
    } else {
      setComboCount(0);
    }

    setLines(newTotalLines);
    setLevel(Math.floor(newTotalLines / 10) + 1);

    // 5. Spawn next piece
    spawnNewPiece();

  }, [board, isB2B, comboCount, lines, spawnNewPiece, showTSpin, showTetris, showCombo, showPerfectClear]);

  const lockPiece = useCallback(() => {
    if (!currentPiece) return;
    clearLockDelayTimer();
    handlePieceLock(currentPiece);
  }, [currentPiece, handlePieceLock, clearLockDelayTimer]);

  const resetLockDelay = useCallback(() => {
    if (lockDelayResetCount >= MAX_LOCK_RESETS) {
      lockPiece();
      return false;
    }
    clearLockDelayTimer();
    setLockDelayResetCount(prev => prev + 1);
    return true;
  }, [lockDelayResetCount, lockPiece, clearLockDelayTimer]);

  const startLockDelay = useCallback(() => {
    if (!currentPiece) return;
    const testPiece = { ...currentPiece, y: currentPiece.y + 1 };
    if (isValidPosition(board, testPiece)) return;
    
    lockDelayTimer.current = setTimeout(() => lockPiece(), LOCK_DELAY_TIME);
  }, [currentPiece, board, lockPiece]);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (!currentPiece || gameOver || isPaused) return;

    const newPiece = { ...currentPiece, x: currentPiece.x + dx, y: currentPiece.y + dy };
    // Clear any existing lock timer on horizontal move
    if (dx !== 0) {
        clearLockDelayTimer();
    }

    if (isValidPosition(board, newPiece)) {
      setCurrentPiece(newPiece);
    } else if (dy > 0) {
      // Only start lock delay if piece fails to move down
      startLockDelay();
    }
  }, [currentPiece, board, gameOver, isPaused, startLockDelay, clearLockDelayTimer]);


  const hardDrop = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return;
    
    const dropY = calculateDropPosition(board, currentPiece);
    const pieceToLock = { ...currentPiece, y: dropY };
    
    // Also add score for the drop distance
    const dropDistance = dropY - currentPiece.y;
    setScore(prev => prev + dropDistance);

    handlePieceLock(pieceToLock);
  }, [currentPiece, board, gameOver, isPaused, handlePieceLock]);

  const rotatePiece = (clockwise: boolean) => {
    if (!currentPiece || gameOver || isPaused) return;
    const srsResult = performSRSRotation(board, currentPiece, clockwise);
    if (srsResult.success && srsResult.newPiece) {
      setCurrentPiece(srsResult.newPiece);
    }
  };
  const rotatePieceClockwise = useCallback(() => rotatePiece(true), [currentPiece, board, gameOver, isPaused]);
  const rotatePieceCounterclockwise = useCallback(() => rotatePiece(false), [currentPiece, board, gameOver, isPaused]);

  const holdCurrentPiece = useCallback(() => {
    if (!canHold || gameOver || isPaused) return;
    const newHoldPiece = currentPiece;
    setCurrentPiece(holdPiece || createGamePiece(generateRandomPiece()));
    setHoldPiece(newHoldPiece);
    setCanHold(false);
  }, [canHold, gameOver, isPaused, currentPiece, holdPiece, createGamePiece]);

  const startGame = useCallback(() => {
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
    setPhase('countdown');

    if (!seedRef.current) {
      seedRef.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    resetSevenBag(seedRef.current);
    
    const initialPieces = Array.from({ length: 7 }, () => createGamePiece(generateRandomPiece()));
    setCurrentPiece(initialPieces[0]);
    setNextPieces(initialPieces.slice(1));
    
    setTimeout(() => {
      setGameStarted(true);
      setPhase('playing');
      gameStartTime.current = Date.now();
    }, 3000); // 3-second countdown

  }, [createGamePiece]);

  // Main Game Loop (Gravity)
  useEffect(() => {
    if (!gameStarted || gameOver || isPaused || phase !== 'playing') return;

    const dropInterval = Math.max(50, 1000 - (level - 1) * 50);
    const timer = setTimeout(() => movePiece(0, 1), dropInterval);
    return () => clearTimeout(timer);
  }, [gameStarted, gameOver, isPaused, level, movePiece]);

  // Game Timer and Stats Effect
  useEffect(() => {
    if (!gameStarted || gameOver || isPaused) return;
    const tick = () => {
      const elapsed = (Date.now() - gameStartTime.current!) / 1000;
      setTime(elapsed);
      if (elapsed > 0) {
        setPps(totalPieces.current / elapsed);
        setApm((totalActions.current / elapsed) * 60);
      }
    };
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [gameStarted, gameOver, isPaused]);

  // Game End Condition Effect
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    let isGameOver = false;
    if (gameMode.isTimeAttack && gameMode.timeLimit && time >= gameMode.timeLimit) {
      isGameOver = true;
    }
    if (gameMode.targetLines && lines >= gameMode.targetLines) {
      isGameOver = true;
    }

    if (isGameOver) {

      setPhase('gameOver');

      setGameOver(true);
      if (isRecording) {
        stopRecording({ score, lines, level, pps, apm, duration: time * 1000, gameMode: gameMode.id })
          .then(result => {
            if (result.isNewRecord) {
              setIsNewRecord(true);
            }
          });
      }
    }
  }, [time, lines, gameStarted, gameOver, gameMode, isRecording, stopRecording, score, level, pps, apm]);

  const ghostPiece = currentPiece ? { ...currentPiece, y: calculateDropPosition(board, currentPiece) } : null;

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
    rotatePiece180: () => {}, // Placeholder
    holdCurrentPiece,
    spawnNewPiece,
    lockPiece,
    hardDrop,
    initializeForCountdown: startGame,
    removeAchievement,
    isValidPosition,
    gameStartTime,
    getGameStats: () => ({ score, lines, level, time, pps, apm, gameMode: gameMode.id }),
  };
};
