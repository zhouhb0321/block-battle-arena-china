
import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  isValidPosition,
  placePiece,
  clearLines,
  rotatePiece,
  calculateDropPosition,
  generateSevenBag,
  checkTSpin,
  getKickTests,
  createNewPiece,
  createGhostPiece,
  calculateScore,
  calculateAttackLines
} from '@/utils/tetrisLogic';
import type { TetrominoType, GamePiece } from '@/utils/gameTypes';

interface UseGameLogicProps {
  currentPiece: GamePiece | null;
  setCurrentPiece: (piece: GamePiece | null) => void;
  ghostPiece: GamePiece | null;
  setGhostPiece: (piece: GamePiece | null) => void;
  board: number[][];
  setBoard: (board: number[][]) => void;
  nextPieces: TetrominoType[];
  setNextPieces: (pieces: TetrominoType[]) => void;
  holdPiece: TetrominoType | null;
  setHoldPiece: (piece: TetrominoType | null) => void;
  canHold: boolean;
  setCanHold: (canHold: boolean) => void;
  score: number;
  setScore: (score: number | ((prev: number) => number)) => void;
  lines: number;
  setLines: (lines: number | ((prev: number) => number)) => void;
  level: number;
  setLevel: (level: number) => void;
  pieces: number;
  setPieces: (pieces: number | ((prev: number) => number)) => void;
  gameOver: boolean;
  setGameOver: (gameOver: boolean) => void;
  lockDelay: boolean;
  setLockDelay: (lockDelay: boolean) => void;
  combo: number;
  setCombo: (combo: number) => void;
  b2b: number;
  setB2b: (b2b: number | ((prev: number) => number)) => void;
  totalAttack: number;
  setTotalAttack: (attack: number | ((prev: number) => number)) => void;
  pps: number;
  setPps: (pps: number) => void;
  apm: number;
  setApm: (apm: number) => void;
  startTime: number;
  mode: 'single' | 'multi';
}

export const useGameLogic = (props: UseGameLogicProps) => {
  const {
    currentPiece, setCurrentPiece,
    ghostPiece, setGhostPiece,
    board, setBoard,
    nextPieces, setNextPieces,
    holdPiece, setHoldPiece,
    canHold, setCanHold,
    score, setScore,
    lines, setLines,
    level, setLevel,
    pieces, setPieces,
    gameOver, setGameOver,
    lockDelay, setLockDelay,
    combo, setCombo,
    b2b, setB2b,
    totalAttack, setTotalAttack,
    pps, setPps,
    apm, setApm,
    startTime,
    mode
  } = props;

  const lockDelayTime = useRef<number>(0);
  const [lastAction, setLastAction] = useState<'rotate' | 'move' | null>(null);

  const spawnNewPiece = useCallback(() => {
    if (nextPieces.length === 0) return;

    const newPiece = createNewPiece(nextPieces[0]);

    const newNextPieces = [...nextPieces.slice(1)];
    if (newNextPieces.length < 6) {
      newNextPieces.push(...generateSevenBag());
    }

    if (!isValidPosition(board, newPiece)) {
      setGameOver(true);
      return;
    }

    setCurrentPiece(newPiece);
    setGhostPiece(createGhostPiece(board, newPiece));
    setNextPieces(newNextPieces);
    setCanHold(true);
    setLockDelay(false);
    lockDelayTime.current = 0;
    setPieces(prev => {
      const newPieces = prev + 1;
      const timeElapsed = (Date.now() - startTime) / 1000;
      setPps(newPieces / Math.max(timeElapsed, 1));
      return newPieces;
    });
  }, [board, nextPieces, startTime, setCurrentPiece, setGhostPiece, setNextPieces, setCanHold, setLockDelay, setPieces, setPps, setGameOver]);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (!currentPiece || gameOver) return false;

    const newPiece = {
      ...currentPiece,
      x: currentPiece.x + dx,
      y: currentPiece.y + dy
    };

    if (isValidPosition(board, newPiece)) {
      setCurrentPiece(newPiece);
      setGhostPiece(createGhostPiece(board, newPiece));
      setLastAction('move');
      
      if (dy > 0) {
        setLockDelay(false);
        lockDelayTime.current = 0;
      }
      
      return true;
    } else if (dy > 0) {
      if (!lockDelay) {
        setLockDelay(true);
        lockDelayTime.current = Date.now();
      }
      return false;
    }
    return false;
  }, [currentPiece, board, gameOver, lockDelay, setCurrentPiece, setGhostPiece, setLockDelay]);

  const rotatePieceClockwise = useCallback(() => {
    if (!currentPiece || gameOver) return;

    const rotated = rotatePiece(currentPiece.type, true);
    const newRotation = (currentPiece.rotation + 1) % 4;
    
    const kickTests = getKickTests(currentPiece.type.type, currentPiece.rotation, newRotation);

    for (const kick of kickTests) {
      const testPiece: GamePiece = { 
        ...currentPiece, 
        type: rotated, 
        x: currentPiece.x + kick.x, 
        y: currentPiece.y + kick.y,
        rotation: newRotation
      };
      
      if (isValidPosition(board, testPiece)) {
        setCurrentPiece(testPiece);
        setGhostPiece(createGhostPiece(board, testPiece));
        setLastAction('rotate');
        
        setLockDelay(false);
        lockDelayTime.current = 0;
        return;
      }
    }
  }, [currentPiece, board, gameOver, setCurrentPiece, setGhostPiece, setLockDelay]);

  const rotatePieceCounterclockwise = useCallback(() => {
    if (!currentPiece || gameOver) return;

    const rotated = rotatePiece(currentPiece.type, false);
    const newRotation = (currentPiece.rotation + 3) % 4;
    
    const kickTests = getKickTests(currentPiece.type.type, currentPiece.rotation, newRotation);

    for (const kick of kickTests) {
      const testPiece: GamePiece = { 
        ...currentPiece, 
        type: rotated, 
        x: currentPiece.x + kick.x, 
        y: currentPiece.y + kick.y,
        rotation: newRotation
      };
      
      if (isValidPosition(board, testPiece)) {
        setCurrentPiece(testPiece);
        setGhostPiece(createGhostPiece(board, testPiece));
        setLastAction('rotate');
        
        setLockDelay(false);
        lockDelayTime.current = 0;
        return;
      }
    }
  }, [currentPiece, board, gameOver, setCurrentPiece, setGhostPiece, setLockDelay]);

  const hardDrop = useCallback(() => {
    if (!currentPiece || gameOver) return;

    const dropY = calculateDropPosition(board, currentPiece);
    const dropDistance = dropY - currentPiece.y;
    setScore(prev => prev + dropDistance * 2);
    
    const droppedPiece = { ...currentPiece, y: dropY };
    setCurrentPiece(droppedPiece);
    setGhostPiece(null);
    
    setTimeout(() => {
      lockPiece();
    }, 50);
  }, [currentPiece, board, gameOver, setScore, setCurrentPiece, setGhostPiece]);

  const lockPiece = useCallback(() => {
    if (!currentPiece) return;

    const tSpinType = checkTSpin(board, currentPiece, lastAction || 'move');
    const newBoard = placePiece(board, currentPiece);
    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
    
    setBoard(clearedBoard);
    setLines(prev => prev + linesCleared);
    
    const newCombo = linesCleared > 0 ? combo + 1 : -1;
    setCombo(newCombo);
    
    const isSpecialClear = tSpinType !== null || linesCleared === 4;
    if (isSpecialClear) {
      setB2b(prev => prev + 1);
    } else if (linesCleared > 0) {
      setB2b(0);
    }
    
    const lineScore = calculateScore(linesCleared, level, !!tSpinType, b2b > 0, newCombo);
    setScore(prev => prev + lineScore);
    
    const attackValue = calculateAttackLines(linesCleared, !!tSpinType, b2b > 0, newCombo);
    if (attackValue > 0) {
      setTotalAttack(prev => {
        const newTotal = prev + attackValue;
        const timeElapsed = (Date.now() - startTime) / 60000;
        setApm(newTotal / Math.max(timeElapsed, 1/60));
        return newTotal;
      });
      
      if (mode === 'multi') {
        console.log(`发送 ${attackValue} 行垃圾块给对手`);
      }
    }
    
    if (tSpinType) {
      toast.success(`${tSpinType}!${b2b > 1 ? ` B2B x${b2b}` : ''}`, { duration: 2000 });
    } else if (linesCleared === 4) {
      toast.success(`Tetris!${b2b > 1 ? ` B2B x${b2b}` : ''}`, { duration: 2000 });
    }
    
    if (newCombo > 0) {
      toast.success(`${newCombo + 1} 连击! +${attackValue} 攻击`, { duration: 1500 });
    }
    
    const newLevel = Math.floor((lines + linesCleared) / 10) + 1;
    setLevel(newLevel);
    
    setLastAction(null);
    setCurrentPiece(null);
    setGhostPiece(null);
    spawnNewPiece();
  }, [currentPiece, board, level, lines, lastAction, combo, b2b, mode, startTime, spawnNewPiece, setBoard, setLines, setCombo, setB2b, setScore, setTotalAttack, setApm, setLevel, setCurrentPiece, setGhostPiece]);

  const holdCurrentPiece = useCallback(() => {
    if (!currentPiece || !canHold || gameOver) return;

    if (holdPiece) {
      const newPiece = createNewPiece(holdPiece);
      setHoldPiece(currentPiece.type);
      setCurrentPiece(newPiece);
      setGhostPiece(createGhostPiece(board, newPiece));
    } else {
      setHoldPiece(currentPiece.type);
      setCurrentPiece(null);
      setGhostPiece(null);
      spawnNewPiece();
    }
    
    setCanHold(false);
    setLockDelay(false);
    lockDelayTime.current = 0;
  }, [currentPiece, holdPiece, canHold, gameOver, spawnNewPiece, board, setHoldPiece, setCurrentPiece, setGhostPiece, setCanHold, setLockDelay]);

  return {
    spawnNewPiece,
    movePiece,
    rotatePieceClockwise,
    rotatePieceCounterclockwise,
    hardDrop,
    lockPiece,
    holdCurrentPiece,
    lockDelayTime: lockDelayTime.current
  };
};

const useState = React.useState;
import React from 'react';
