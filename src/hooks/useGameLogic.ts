import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useWindowFocus } from '@/hooks/useWindowFocus';
import { calculateDropSpeed, getGravityInfo } from '@/utils/gravitySystem';
import {
  isValidPosition,
  placePiece,
  clearLines,
  rotatePiece,
  calculateDropPosition,
  generateSevenBag,
  checkTSpin,
  performSRSRotation,
  performSRS180Rotation,
  createNewPiece,
  createGhostPiece,
  calculateScore,
  calculateAttackLines,
  TETROMINO_TYPES
} from '@/utils/tetrisLogic';
import type { GameMode, GameSettings, GameState, GamePiece, TetrominoType } from '@/utils/gameTypes';

// Define history state type
interface GameStateHistory {
  board: number[][];
  currentPiece: GamePiece | null;
  nextPieces: GamePiece[];
  holdPiece: GamePiece | null;
  score: number;
  lines: number;
  level: number;
  canHold: boolean;
  combo: number;
  b2b: number;
  pieces: number;
}

export const useGameLogic = (
  gameMode: GameMode,
  gameSettings: GameSettings,
  customCalculateDropSpeed?: (lines: number) => number
) => {
  const isWindowFocused = useWindowFocus();
  
  // Use the gravity system's drop speed calculation
  const getDropSpeed = useCallback((lines: number) => {
    return customCalculateDropSpeed ? customCalculateDropSpeed(lines) : calculateDropSpeed(lines);
  }, [customCalculateDropSpeed]);
  
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    board: Array(23).fill(null).map(() => Array(10).fill(0)),
    currentPiece: null,
    nextPieces: [],
    holdPiece: null,
    score: 0,
    lines: 0,
    level: 1,
    gameOver: false,
    paused: false,
    canHold: true,
    isHolding: false,
    combo: -1,
    b2b: 0,
    pieces: 0,
    startTime: Date.now(),
    endTime: null,
    attack: 0,
    pps: 0,
    apm: 0,
    ghostPiece: null,
    clearingLines: []
  });

  // History for undo/redo functionality
  const [history, setHistory] = useState<GameStateHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistorySize = 10;

  const gameLoopRef = useRef<number>();
  const lastDropTime = useRef<number>(0);
  const lockDelayTime = useRef<number>(0);
  const [lockDelay, setLockDelay] = useState(false);
  const [lastAction, setLastAction] = useState<'rotate' | 'move' | null>(null);
  const [wasKicked, setWasKicked] = useState(false);
  const isHardDropping = useRef(false);

  // 自动重力、软降、硬降实现
  // 新增：自动重力、软降、硬降、ARE锁定
  const [softDrop, setSoftDrop] = useState(false);
  const [areDelay, setAreDelay] = useState(false);
  const gravityInterval = useRef<NodeJS.Timeout | null>(null);
  const areTimeout = useRef<NodeJS.Timeout | null>(null);
  const GRAVITY_NORMAL = 1000; // 普通重力间隔（ms）
  const GRAVITY_SOFT = 50;    // 软降重力间隔（ms）
  const ARE_DELAY = 300;      // ARE锁定延迟（ms）

  // 简化窗口焦点处理 - 移除自动暂停逻辑
  useEffect(() => {
    // 只在调试时输出焦点状态
    console.log('窗口焦点状态:', isWindowFocused ? '获得焦点' : '失去焦点');
  }, [isWindowFocused]);

  // Save state to history
  const saveStateToHistory = useCallback(() => {
    const stateToSave: GameStateHistory = {
      board: gameState.board.map(row => [...row]),
      currentPiece: gameState.currentPiece ? { ...gameState.currentPiece } : null,
      nextPieces: [...gameState.nextPieces],
      holdPiece: gameState.holdPiece ? { ...gameState.holdPiece } : null,
      score: gameState.score,
      lines: gameState.lines,
      level: gameState.level,
      canHold: gameState.canHold,
      combo: gameState.combo || -1,
      b2b: gameState.b2b || 0,
      pieces: gameState.pieces || 0
    };

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(stateToSave);
      return newHistory.slice(-maxHistorySize);
    });
    setHistoryIndex(prev => Math.min(prev + 1, maxHistorySize - 1));
  }, [gameState, historyIndex]);

  // Undo function
  const undoMove = useCallback(() => {
    if (gameState.gameOver || gameState.paused || historyIndex <= 0) return;
    
    const prevState = history[historyIndex - 1];
    if (!prevState) return;

    setGameState(prev => ({
      ...prev,
      board: prevState.board.map(row => [...row]),
      currentPiece: prevState.currentPiece ? { ...prevState.currentPiece } : null,
      nextPieces: [...prevState.nextPieces],
      holdPiece: prevState.holdPiece ? { ...prevState.holdPiece } : null,
      score: prevState.score,
      lines: prevState.lines,
      level: prevState.level,
      canHold: prevState.canHold,
      combo: prevState.combo,
      b2b: prevState.b2b,
      pieces: prevState.pieces,
      ghostPiece: prevState.currentPiece ? createGhostPiece(prevState.board, prevState.currentPiece) : null
    }));

    setHistoryIndex(prev => prev - 1);
    setLockDelay(false);
    lockDelayTime.current = 0;
    toast.success('撤销操作', { duration: 1000 });
  }, [history, historyIndex, gameState.gameOver, gameState.paused]);

  // Redo function
  const redoMove = useCallback(() => {
    if (gameState.gameOver || gameState.paused || historyIndex >= history.length - 1) return;
    
    const nextState = history[historyIndex + 1];
    if (!nextState) return;

    setGameState(prev => ({
      ...prev,
      board: nextState.board.map(row => [...row]),
      currentPiece: nextState.currentPiece ? { ...nextState.currentPiece } : null,
      nextPieces: [...nextState.nextPieces],
      holdPiece: nextState.holdPiece ? { ...nextState.holdPiece } : null,
      score: nextState.score,
      lines: nextState.lines,
      level: nextState.level,
      canHold: nextState.canHold,
      combo: nextState.combo,
      b2b: nextState.b2b,
      pieces: nextState.pieces,
      ghostPiece: nextState.currentPiece ? createGhostPiece(nextState.board, nextState.currentPiece) : null
    }));

    setHistoryIndex(prev => prev + 1);
    setLockDelay(false);
    lockDelayTime.current = 0;
    toast.success('重做操作', { duration: 1000 });
  }, [history, historyIndex, gameState.gameOver, gameState.paused]);

  // Helper function to create GamePiece from TetrominoType
  const createGamePieceFromType = useCallback((pieceType: TetrominoType, x: number = 4, y: number = 0): GamePiece => {
    return {
      type: pieceType,
      x,
      y,
      rotation: 0
    };
  }, []);

  const spawnNewPiece = useCallback(() => {
    console.log('Spawning new piece, nextPieces length:', gameState.nextPieces.length);
    
    // Save state before spawning new piece
    saveStateToHistory();
    
    setGameState(prev => {
      if (prev.nextPieces.length === 0) {
        const sevenBag = generateSevenBag();
        const gamePieces = sevenBag.map(pieceType => createGamePieceFromType(pieceType));
        console.log('Generated new seven bag:', gamePieces.map(p => p.type.name));
        
        const newPiece = createGamePieceFromType(gamePieces[0].type);
        const newNextPieces = gamePieces.slice(1);
        
        if (!isValidPosition(prev.board, newPiece)) {
          return { ...prev, gameOver: true };
        }

        const ghostPiece = createGhostPiece(prev.board, newPiece);
        
        return {
          ...prev,
          currentPiece: newPiece,
          ghostPiece: ghostPiece,
          nextPieces: newNextPieces,
          canHold: true,
          pieces: prev.pieces! + 1
        };
      } else {
        const newPiece = createGamePieceFromType(prev.nextPieces[0].type);
        let newNextPieces = [...prev.nextPieces.slice(1)];
        
        if (newNextPieces.length < 6) {
          const sevenBag = generateSevenBag();
          const gamePieces = sevenBag.map(pieceType => createGamePieceFromType(pieceType));
          newNextPieces.push(...gamePieces);
        }

        if (!isValidPosition(prev.board, newPiece)) {
          return { ...prev, gameOver: true };
        }

        const ghostPiece = createGhostPiece(prev.board, newPiece);

        return {
          ...prev,
          currentPiece: newPiece,
          ghostPiece: ghostPiece,
          nextPieces: newNextPieces,
          canHold: true,
          pieces: prev.pieces! + 1
        };
      }
    });
    
    setLockDelay(false);
    lockDelayTime.current = 0;
    setWasKicked(false);
    isHardDropping.current = false;
  }, [createGamePieceFromType, saveStateToHistory]);

  // Check if piece is at bottom
  const isPieceAtBottom = useCallback((board: number[][], piece: GamePiece): boolean => {
    const testPiece = { ...piece, y: piece.y + 1 };
    return !isValidPosition(board, testPiece);
  }, []);

  const movePiece = useCallback((dx: number, dy: number) => {
    // 硬降期间不允许移动
    if (!gameState.currentPiece || gameState.gameOver || gameState.paused || isHardDropping.current) return false;

    const newPiece = {
      ...gameState.currentPiece,
      x: gameState.currentPiece.x + dx,
      y: gameState.currentPiece.y + dy
    };

    if (isValidPosition(gameState.board, newPiece)) {
      const ghostPiece = createGhostPiece(gameState.board, newPiece);
      
      setGameState(prev => ({
        ...prev,
        currentPiece: newPiece,
        ghostPiece: ghostPiece
      }));
      setLastAction('move');
      setWasKicked(false);
      
      // Reset lock delay on any movement
      if (lockDelay) {
        setLockDelay(false);
        lockDelayTime.current = 0;
      }
      
      // Check if piece is at bottom after movement
      if (dy > 0 && isPieceAtBottom(gameState.board, newPiece)) {
        setLockDelay(true);
        lockDelayTime.current = Date.now();
      }
      
      return true;
    } else if (dy > 0) {
      // Piece can't move down, start lock delay
      if (!lockDelay) {
        setLockDelay(true);
        lockDelayTime.current = Date.now();
        console.log('Lock delay started - piece at bottom');
      }
      return false;
    }
    return false;
  }, [gameState.currentPiece, gameState.board, gameState.gameOver, gameState.paused, lockDelay, isPieceAtBottom]);

  // 工具函数：移除当前方块后的board
  function getBoardWithoutCurrentPiece(board, piece) {
    if (!piece) return board;
    const { type, x, y } = piece;
    const shape = type.shape;
    const newBoard = board.map(row => [...row]);
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] !== 0) {
          const boardX = x + col;
          const boardY = y + row;
          if (boardX >= 0 && boardX < newBoard[0].length && boardY >= 0 && boardY < newBoard.length) {
            newBoard[boardY][boardX] = 0;
          }
        }
      }
    }
    return newBoard;
  }

  // 修复旋转函数，确保正确传递踢墙状态和改进高速旋转
  const rotatePieceClockwise = useCallback(() => {
    // 硬降期间不允许旋转
    if (!gameState.currentPiece || gameState.gameOver || gameState.paused || isHardDropping.current) return;

    console.log('尝试顺时针旋转，当前速度等级:', gameState.level);
    
    const cleanBoard = getBoardWithoutCurrentPiece(gameState.board, gameState.currentPiece);
    const rotationResult = performSRSRotation(cleanBoard, gameState.currentPiece, true);
    
    if (rotationResult.success && rotationResult.newPiece) {
      const ghostPiece = createGhostPiece(gameState.board, rotationResult.newPiece);
      
      setGameState(prev => ({
        ...prev,
        currentPiece: rotationResult.newPiece!,
        ghostPiece: ghostPiece
      }));
      setLastAction('rotate');
      setWasKicked(rotationResult.wasKicked);
      
      // Reset lock delay on successful rotation
      if (lockDelay) {
        setLockDelay(false);
        lockDelayTime.current = 0;
        console.log('Lock delay reset after rotation');
      }
      
      // Check if rotated piece is at bottom
      if (isPieceAtBottom(gameState.board, rotationResult.newPiece)) {
        setLockDelay(true);
        lockDelayTime.current = Date.now();
        console.log('Lock delay started after rotation - piece at bottom');
      }
      
      console.log(`顺时针旋转成功, 踢墙状态: ${rotationResult.wasKicked}`);
    } else {
      console.log('顺时针旋转失败，可能原因：边界限制或碰撞检测');
    }
  }, [gameState.currentPiece, gameState.board, gameState.gameOver, gameState.paused, gameState.level, lockDelay, isPieceAtBottom]);

  const rotatePieceCounterclockwise = useCallback(() => {
    // 硬降期间不允许旋转
    if (!gameState.currentPiece || gameState.gameOver || gameState.paused || isHardDropping.current) return;

    console.log('尝试逆时针旋转，当前速度等级:', gameState.level);
    
    const cleanBoard = getBoardWithoutCurrentPiece(gameState.board, gameState.currentPiece);
    const rotationResult = performSRSRotation(cleanBoard, gameState.currentPiece, false);
    
    if (rotationResult.success && rotationResult.newPiece) {
      const ghostPiece = createGhostPiece(gameState.board, rotationResult.newPiece);
      
      setGameState(prev => ({
        ...prev,
        currentPiece: rotationResult.newPiece!,
        ghostPiece: ghostPiece
      }));
      setLastAction('rotate');
      setWasKicked(rotationResult.wasKicked);
      
      // Reset lock delay on successful rotation
      if (lockDelay) {
        setLockDelay(false);
        lockDelayTime.current = 0;
        console.log('Lock delay reset after rotation');
      }
      
      // Check if rotated piece is at bottom
      if (isPieceAtBottom(gameState.board, rotationResult.newPiece)) {
        setLockDelay(true);
        lockDelayTime.current = Date.now();
        console.log('Lock delay started after rotation - piece at bottom');
      }
      
      console.log(`逆时针旋转成功, 踢墙状态: ${rotationResult.wasKicked}`);
    } else {
      console.log('逆时针旋转失败，可能原因：边界限制或碰撞检测');
    }
  }, [gameState.currentPiece, gameState.board, gameState.gameOver, gameState.paused, gameState.level, lockDelay, isPieceAtBottom]);

  const rotatePiece180 = useCallback(() => {
    // 硬降期间不允许旋转
    if (!gameState.currentPiece || gameState.gameOver || gameState.paused || isHardDropping.current) return;

    console.log('尝试180度旋转，当前速度等级:', gameState.level);
    
    const cleanBoard = getBoardWithoutCurrentPiece(gameState.board, gameState.currentPiece);
    const rotationResult = performSRS180Rotation(cleanBoard, gameState.currentPiece);
    
    if (rotationResult.success && rotationResult.newPiece) {
      const ghostPiece = createGhostPiece(gameState.board, rotationResult.newPiece);
      
      setGameState(prev => ({
        ...prev,
        currentPiece: rotationResult.newPiece!,
        ghostPiece: ghostPiece
      }));
      setLastAction('rotate');
      setWasKicked(rotationResult.wasKicked);
      
      // Reset lock delay on successful rotation
      if (lockDelay) {
        setLockDelay(false);
        lockDelayTime.current = 0;
        console.log('Lock delay reset after rotation');
      }
      
      // Check if rotated piece is at bottom
      if (isPieceAtBottom(gameState.board, rotationResult.newPiece)) {
        setLockDelay(true);
        lockDelayTime.current = Date.now();
        console.log('Lock delay started after rotation - piece at bottom');
      }
      
      console.log(`180度旋转成功, 踢墙状态: ${rotationResult.wasKicked}`);
    } else {
      console.log('180度旋转失败，可能原因：边界限制或碰撞检测');
    }
  }, [gameState.currentPiece, gameState.board, gameState.gameOver, gameState.paused, gameState.level, lockDelay, isPieceAtBottom]);

  const hardDrop = useCallback(() => {
    if (!gameState.currentPiece || gameState.gameOver || gameState.paused || isHardDropping.current) return;
    
    console.log('硬降开始');
    isHardDropping.current = true;
    
    const dropY = calculateDropPosition(gameState.board, gameState.currentPiece);
    const finalPiece = { ...gameState.currentPiece, y: dropY };
    
    setGameState(prev => ({ ...prev, currentPiece: finalPiece }));
    
    // 硬降后立即锁定，不允许任何操作
    setTimeout(() => {
      lockPiece();
    }, 0);
  }, [gameState.currentPiece, gameState.board, gameState.gameOver, gameState.paused]);

  const lockPiece = useCallback(() => {
    if (!gameState.currentPiece) return;

    console.log('锁定方块位置:', gameState.currentPiece.x, gameState.currentPiece.y);
    
    // 检查T-Spin - 传递踢墙状态
    const tSpinResult = checkTSpin(gameState.board, gameState.currentPiece, lastAction || 'move', wasKicked);
    const newBoard = placePiece(gameState.board, gameState.currentPiece);
    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
    
    const isPerfectClear = clearedBoard.every(row => row.every(cell => cell === 0));
    
    const newCombo = linesCleared > 0 ? gameState.combo! + 1 : -1;
    const isSpecialClear = tSpinResult !== null || linesCleared === 4;
    const newB2B = isSpecialClear ? gameState.b2b! + 1 : (linesCleared > 0 ? 0 : gameState.b2b!);
    
    const lineScore = calculateScore(linesCleared, gameState.level, tSpinResult, gameState.b2b! > 0, newCombo, isPerfectClear);
    const attackValue = calculateAttackLines(linesCleared, tSpinResult, gameState.b2b! > 0, newCombo);
    
    setGameState(prev => ({
      ...prev,
      board: clearedBoard,
      lines: prev.lines + linesCleared,
      combo: newCombo,
      b2b: newB2B,
      score: prev.score + lineScore,
      attack: prev.attack! + attackValue,
      level: Math.floor((prev.lines + linesCleared) / 40) + 1,
      currentPiece: null,
      ghostPiece: null,
      clearingLines: []
    }));
    
    // 显示特殊消除提示
    if (isPerfectClear) {
      toast.success('全清！+3500分！', { duration: 3000 });
    }
    
    if (tSpinResult) {
      const miniText = tSpinResult.isMini ? ' Mini' : '';
      const b2bText = gameState.b2b! > 1 ? ` B2B x${gameState.b2b}` : '';
      toast.success(`${tSpinResult.type}${miniText}!${b2bText}`, { duration: 2000 });
    } else if (linesCleared === 4) {
      toast.success(`Tetris!${gameState.b2b! > 1 ? ` B2B x${gameState.b2b}` : ''}`, { duration: 2000 });
    }
    
    if (newCombo > 0) {
      toast.success(`${newCombo + 1} 连击! +${attackValue} 攻击`, { duration: 1500 });
    }
    
    setLastAction(null);
    setWasKicked(false);
    isHardDropping.current = false;
    
    setTimeout(() => spawnNewPiece(), 100);
  }, [gameState.currentPiece, gameState.board, gameState.level, gameState.lines, lastAction, wasKicked, gameState.combo, gameState.b2b, spawnNewPiece]);

  const holdCurrentPiece = useCallback(() => {
    // 硬降期间不允许暂存
    if (!gameState.currentPiece || !gameState.canHold || gameState.gameOver || gameState.paused || isHardDropping.current) return;

    if (gameState.holdPiece) {
      const newPiece = createGamePieceFromType(gameState.holdPiece.type);
      const ghostPiece = createGhostPiece(gameState.board, newPiece);
      
      setGameState(prev => ({
        ...prev,
        holdPiece: gameState.currentPiece,
        currentPiece: newPiece,
        ghostPiece: ghostPiece,
        canHold: false
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        holdPiece: gameState.currentPiece,
        currentPiece: null,
        ghostPiece: null,
        canHold: false
      }));
      setTimeout(() => spawnNewPiece(), 100);
    }
    
    setLockDelay(false);
    lockDelayTime.current = 0;
    setWasKicked(false);
  }, [gameState.currentPiece, gameState.holdPiece, gameState.canHold, gameState.gameOver, gameState.paused, gameState.board, spawnNewPiece, createGamePieceFromType]);

  const startGame = useCallback(() => {
    console.log('开始游戏...');
    isHardDropping.current = false;
    setWasKicked(false);
    setHistory([]);
    setHistoryIndex(-1);
    setGameState(prev => ({
      ...prev,
      paused: false,
      gameOver: false,
      startTime: Date.now()
    }));
    
    // Initialize the first seven bag if needed
    setTimeout(() => {
      setGameState(prev => {
        if (prev.nextPieces.length === 0) {
          const sevenBag = generateSevenBag();
          const gamePieces = sevenBag.map(pieceType => createGamePieceFromType(pieceType));
          console.log('初始化七袋系统:', gamePieces.map(p => p.type.name));
          return { ...prev, nextPieces: gamePieces };
        }
        return prev;
      });
      
      // Spawn the first piece
      setTimeout(() => spawnNewPiece(), 100);
    }, 100);
  }, [spawnNewPiece, createGamePieceFromType]);

  const pauseGame = useCallback(() => {
    setGameState(prev => ({ ...prev, paused: !prev.paused }));
    console.log('游戏暂停状态切换');
  }, []);

  const resetGame = useCallback(() => {
    console.log('重置游戏...');
    isHardDropping.current = false;
    setWasKicked(false);
    setHistory([]);
    setHistoryIndex(-1);
    setGameState({
      board: Array(23).fill(null).map(() => Array(10).fill(0)),
      currentPiece: null,
      nextPieces: [],
      holdPiece: null,
      score: 0,
      lines: 0,
      level: 1,
      gameOver: false,
      paused: false,
      canHold: true,
      isHolding: false,
      combo: -1,
      b2b: 0,
      pieces: 0,
      startTime: Date.now(),
      endTime: null,
      attack: 0,
      pps: 0,
      apm: 0,
      ghostPiece: null,
      clearingLines: []
    });
    setLockDelay(false);
    lockDelayTime.current = 0;
  }, []);

  const shareGame = useCallback(() => {
    console.log('分享游戏...');
    toast.success('游戏分享功能即将推出！');
  }, []);

  // 动态锁定延迟（对战重力1级=500ms，10级=50ms，线性插值）
  const getDynamicLockDelay = (lines: number) => {
    const gravityInfo = getGravityInfo(lines);
    const level = Math.max(1, Math.min(gravityInfo.level, 10));
    const minDelay = 50;
    const maxDelay = 500;
    // 线性插值
    const delay = maxDelay - ((level - 1) / 9) * (maxDelay - minDelay);
    return Math.round(delay);
  };

  // Game loop - 优化锁定延迟为100ms
  useEffect(() => {
    const gameLoop = (timestamp: number) => {
      if (gameState.gameOver || gameState.paused || isHardDropping.current) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      const dropSpeed = getDropSpeed(gameState.lines);
      const dynamicLockDelay = getDynamicLockDelay(gameState.lines);
      if (timestamp - lastDropTime.current > dropSpeed) {
        const moved = movePiece(0, 1);
        if (!moved && lockDelay) {
          if (timestamp - lockDelayTime.current > dynamicLockDelay) {
            lockPiece();
          }
        }
        lastDropTime.current = timestamp;
      } else if (lockDelay) {
        if (timestamp - lockDelayTime.current > dynamicLockDelay) {
          lockPiece();
        }
      }
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.gameOver, gameState.paused, gameState.lines, lockDelay, getDropSpeed, movePiece, lockPiece]);

  useEffect(() => {
    if (gameState.gameOver || gameState.paused || areDelay) return;
    if (!gameState.currentPiece) return;
    if (gravityInterval.current) clearInterval(gravityInterval.current);
    gravityInterval.current = setInterval(() => {
      if (softDrop) {
        movePiece(0, 1); // 软降
      } else {
        movePiece(0, 1); // 普通重力
      }
    }, softDrop ? GRAVITY_SOFT : GRAVITY_NORMAL);
    return () => clearInterval(gravityInterval.current!);
  }, [gameState.currentPiece, gameState.paused, gameState.gameOver, softDrop, areDelay]);

  // 软降按键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'ArrowDown') setSoftDrop(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'ArrowDown') setSoftDrop(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 到底部自动锁定
  useEffect(() => {
    if (!gameState.currentPiece || gameState.gameOver || gameState.paused) return;
    const { x, y, type } = gameState.currentPiece;
    const shape = type.shape;
    let atBottom = false;
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const boardY = y + row;
          if (boardY + 1 >= 23 || gameState.board[boardY + 1][x + col] !== 0) {
            atBottom = true;
          }
        }
      }
    }
    if (atBottom) {
      // ARE锁定延迟
      if (!areDelay) {
        setAreDelay(true);
        areTimeout.current = setTimeout(() => {
          lockPiece();
          setAreDelay(false);
        }, ARE_DELAY);
      }
    } else {
      if (areTimeout.current) clearTimeout(areTimeout.current);
      setAreDelay(false);
    }
  }, [gameState.currentPiece, gameState.board, gameState.paused, gameState.gameOver]);

  return {
    gameState,
    isWindowFocused,
    startGame,
    pauseGame,
    resetGame,
    shareGame,
    spawnNewPiece,
    movePiece,
    rotatePieceClockwise,
    rotatePieceCounterclockwise,
    rotatePiece180,
    hardDrop,
    lockPiece,
    holdCurrentPiece,
    lockDelayTime: lockDelayTime.current,
    // Undo/Redo functions
    undoMove,
    redoMove,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1
  };
};
