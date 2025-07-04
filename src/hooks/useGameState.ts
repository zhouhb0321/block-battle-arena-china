
import { useState, useCallback } from 'react';
import { generateSevenBag, createEmptyBoard } from '@/utils/tetrisLogic';
import type { TetrominoType, GamePiece } from '@/utils/gameTypes';

export const useGameState = () => {
  const [currentPiece, setCurrentPiece] = useState<GamePiece | null>(null);
  const [ghostPiece, setGhostPiece] = useState<GamePiece | null>(null);
  const [board, setBoard] = useState(() => createEmptyBoard());
  const [nextPieces, setNextPieces] = useState<GamePiece[]>([]);
  const [holdPiece, setHoldPiece] = useState<GamePiece | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [pieces, setPieces] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lockDelay, setLockDelay] = useState(false);
  const [combo, setCombo] = useState(-1);
  const [attack, setAttack] = useState(0);
  const [garbageLines, setGarbageLines] = useState<number[]>([]);
  const [b2b, setB2b] = useState(0);
  const [totalAttack, setTotalAttack] = useState(0);
  const [pps, setPps] = useState(0);
  const [apm, setApm] = useState(0);
  const [startTime] = useState(Date.now());

  const resetGameState = useCallback(() => {
    setBoard(createEmptyBoard());
    setNextPieces([]);
    setCurrentPiece(null);
    setGhostPiece(null);
    setHoldPiece(null);
    setScore(0);
    setLines(0);
    setLevel(1);
    setPieces(0);
    setGameOver(false);
    setPaused(false);
    setCanHold(true);
    setLockDelay(false);
    setCombo(-1);
    setAttack(0);
    setB2b(0);
    setTotalAttack(0);
    setPps(0);
    setApm(0);
  }, []);

  return {
    // State
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
    paused, setPaused,
    lockDelay, setLockDelay,
    combo, setCombo,
    attack, setAttack,
    garbageLines, setGarbageLines,
    b2b, setB2b,
    totalAttack, setTotalAttack,
    pps, setPps,
    apm, setApm,
    startTime,
    // Actions
    resetGameState
  };
};
