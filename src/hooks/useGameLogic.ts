import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useWindowFocus } from '@/hooks/useWindowFocus';
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

export const useGameLogic = (
  gameMode: GameMode,
  gameSettings: GameSettings,
  calculateDropSpeed: (lines: number) => number
) => {
  const isWindowFocused = useWindowFocus();
  
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

  const gameLoopRef = useRef<number>();
  const lastDropTime = useRef<number>(0);
  const lockDelayTime = useRef<number>(0);
  const [lockDelay, setLockDelay] = useState(false);
  const [lastAction, setLastAction] = useState<'rotate' | 'move' | null>(null);
  const [wasKicked, setWasKicked] = useState(false);
  const isHardDropping = useRef(false);

  // 简化窗口焦点处理 - 移除自动暂停逻辑
  useEffect(() => {
    // 只在调试时输出焦点状态
    console.log('窗口焦点状态:', isWindowFocused ? '获得焦点' : '失去焦点');
  }, [isWindowFocused]);

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

        return {
          ...prev,
          currentPiece: newPiece,
          ghostPiece: createGhostPiece(prev.board, newPiece),
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

        return {
          ...prev,
          currentPiece: newPiece,
          ghostPiece: createGhostPiece(prev.board, newPiece),
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
  }, [createGamePieceFromType]);

  const movePiece = useCallback((dx: number, dy: number) => {
    // 简化条件检查，移除窗口焦点限制
    if (!gameState.currentPiece || gameState.gameOver || gameState.paused || isHardDropping.current) return false;

    const newPiece = {
      ...gameState.currentPiece,
      x: gameState.currentPiece.x + dx,
      y: gameState.currentPiece.y + dy
    };

    if (isValidPosition(gameState.board, newPiece)) {
      setGameState(prev => ({
        ...prev,
        currentPiece: newPiece,
        ghostPiece: createGhostPiece(gameState.board, newPiece)
      }));
      setLastAction('move');
      setWasKicked(false);
      
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
  }, [gameState.currentPiece, gameState.board, gameState.gameOver, gameState.paused, lockDelay]);

  // 修复旋转函数，确保正确传递踢墙状态
  const rotatePieceClockwise = useCallback(() => {
    if (!gameState.currentPiece || gameState.gameOver || gameState.paused || isHardDropping.current) return;

    const rotationResult = performSRSRotation(gameState.board, gameState.currentPiece, true);
    
    if (rotationResult.success && rotationResult.newPiece) {
      setGameState(prev => ({
        ...prev,
        currentPiece: rotationResult.newPiece!,
        ghostPiece: createGhostPiece(prev.board, rotationResult.newPiece!)
      }));
      setLastAction('rotate');
      setWasKicked(rotationResult.wasKicked);
      
      setLockDelay(false);
      lockDelayTime.current = 0;
      
      console.log(`顺时针旋转成功, 踢墙状态: ${rotationResult.wasKicked}`);
    }
  }, [gameState.currentPiece, gameState.board, gameState.gameOver, gameState.paused]);

  const rotatePieceCounterclockwise = useCallback(() => {
    if (!gameState.currentPiece || gameState.gameOver || gameState.paused || isHardDropping.current) return;

    const rotationResult = performSRSRotation(gameState.board, gameState.currentPiece, false);
    
    if (rotationResult.success && rotationResult.newPiece) {
      setGameState(prev => ({
        ...prev,
        currentPiece: rotationResult.newPiece!,
        ghostPiece: createGhostPiece(prev.board, rotationResult.newPiece!)
      }));
      setLastAction('rotate');
      setWasKicked(rotationResult.wasKicked);
      
      setLockDelay(false);
      lockDelayTime.current = 0;
      
      console.log(`逆时针旋转成功, 踢墙状态: ${rotationResult.wasKicked}`);
    }
  }, [gameState.currentPiece, gameState.board, gameState.gameOver, gameState.paused]);

  const rotatePiece180 = useCallback(() => {
    if (!gameState.currentPiece || gameState.gameOver || gameState.paused || isHardDropping.current) return;

    const rotationResult = performSRS180Rotation(gameState.board, gameState.currentPiece);
    
    if (rotationResult.success && rotationResult.newPiece) {
      setGameState(prev => ({
        ...prev,
        currentPiece: rotationResult.newPiece!,
        ghostPiece: createGhostPiece(prev.board, rotationResult.newPiece!)
      }));
      setLastAction('rotate');
      setWasKicked(rotationResult.wasKicked);
      
      setLockDelay(false);
      lockDelayTime.current = 0;
      
      console.log(`180度旋转成功, 踢墙状态: ${rotationResult.wasKicked}`);
    }
  }, [gameState.currentPiece, gameState.board, gameState.gameOver, gameState.paused]);

  const hardDrop = useCallback(() => {
    if (!gameState.currentPiece || gameState.gameOver || gameState.paused || isHardDropping.current) return;

    console.log('硬降开始 - 当前方块位置:', { x: gameState.currentPiece.x, y: gameState.currentPiece.y });
    
    isHardDropping.current = true;
    
    const dropY = calculateDropPosition(gameState.board, gameState.currentPiece);
    const dropDistance = dropY - gameState.currentPiece.y;
    
    console.log('硬降距离:', dropDistance, '最终位置:', dropY);
    
    if (dropDistance <= 0) {
      isHardDropping.current = false;
      lockPiece();
      return;
    }
    
    const finalPiece = { ...gameState.currentPiece, y: dropY };
    
    // 检查T-Spin - 传递踢墙状态
    const tSpinResult = checkTSpin(gameState.board, finalPiece, lastAction || 'rotate', wasKicked);
    
    const newBoard = placePiece(gameState.board, finalPiece);
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
      currentPiece: null,
      ghostPiece: null,
      lines: prev.lines + linesCleared,
      combo: newCombo,
      b2b: newB2B,
      score: prev.score + lineScore + (dropDistance * 2),
      attack: prev.attack! + attackValue,
      level: Math.floor((prev.lines + linesCleared) / 40) + 1,
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
    setLockDelay(false);
    lockDelayTime.current = 0;
    
    setTimeout(() => {
      isHardDropping.current = false;
      spawnNewPiece();
    }, 10);
    
    console.log('硬降完成 - 方块已锁定');
  }, [gameState.currentPiece, gameState.board, gameState.level, gameState.lines, gameState.gameOver, gameState.paused, lastAction, wasKicked, gameState.combo, gameState.b2b, spawnNewPiece]);

  const lockPiece = useCallback(() => {
    if (!gameState.currentPiece || isHardDropping.current) return;

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
    setTimeout(() => spawnNewPiece(), 100);
  }, [gameState.currentPiece, gameState.board, gameState.level, gameState.lines, lastAction, wasKicked, gameState.combo, gameState.b2b, spawnNewPiece]);

  const holdCurrentPiece = useCallback(() => {
    if (!gameState.currentPiece || !gameState.canHold || gameState.gameOver || gameState.paused || isHardDropping.current) return;

    if (gameState.holdPiece) {
      const newPiece = createGamePieceFromType(gameState.holdPiece.type);
      setGameState(prev => ({
        ...prev,
        holdPiece: gameState.currentPiece,
        currentPiece: newPiece,
        ghostPiece: createGhostPiece(gameState.board, newPiece),
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

  // Game loop - 简化条件检查
  useEffect(() => {
    const gameLoop = (timestamp: number) => {
      if (gameState.gameOver || gameState.paused || isHardDropping.current) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const dropSpeed = calculateDropSpeed(gameState.lines);
      
      if (timestamp - lastDropTime.current > dropSpeed) {
        const moved = movePiece(0, 1);
        if (!moved && lockDelay) {
          if (timestamp - lockDelayTime.current > 500) {
            lockPiece();
          }
        }
        lastDropTime.current = timestamp;
      } else if (lockDelay) {
        if (timestamp - lockDelayTime.current > 500) {
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
  }, [gameState.gameOver, gameState.paused, gameState.lines, lockDelay, calculateDropSpeed, movePiece, lockPiece]);

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
    lockDelayTime: lockDelayTime.current
  };
};
