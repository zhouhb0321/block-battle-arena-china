
import { useState, useRef, useCallback, useEffect } from 'react';
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
  calculateAttackLines,
  TETROMINO_TYPES
} from '@/utils/tetrisLogic';
import type { GameMode, GameSettings, GameState, GamePiece, TetrominoType } from '@/utils/gameTypes';

export const useGameLogic = (
  gameMode: GameMode,
  gameSettings: GameSettings,
  calculateDropSpeed: (lines: number) => number
) => {
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    board: Array(20).fill(null).map(() => Array(10).fill(0)),
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
  const isHardDropping = useRef(false);

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
    isHardDropping.current = false;
  }, [createGamePieceFromType]);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (!gameState.currentPiece || gameState.gameOver || isHardDropping.current) return false;

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
  }, [gameState.currentPiece, gameState.board, gameState.gameOver, lockDelay]);

  const rotatePieceClockwise = useCallback(() => {
    if (!gameState.currentPiece || gameState.gameOver || isHardDropping.current) return;

    const rotated = rotatePiece(gameState.currentPiece.type, true);
    const newRotation = (gameState.currentPiece.rotation + 1) % 4;
    
    const kickTests = getKickTests(gameState.currentPiece.type.type, gameState.currentPiece.rotation, newRotation);

    for (const kick of kickTests) {
      const testPiece: GamePiece = { 
        ...gameState.currentPiece, 
        type: rotated, 
        x: gameState.currentPiece.x + kick.x, 
        y: gameState.currentPiece.y + kick.y,
        rotation: newRotation
      };
      
      if (isValidPosition(gameState.board, testPiece)) {
        setGameState(prev => ({
          ...prev,
          currentPiece: testPiece,
          ghostPiece: createGhostPiece(gameState.board, testPiece)
        }));
        setLastAction('rotate');
        
        setLockDelay(false);
        lockDelayTime.current = 0;
        return;
      }
    }
  }, [gameState.currentPiece, gameState.board, gameState.gameOver]);

  const rotatePieceCounterclockwise = useCallback(() => {
    if (!gameState.currentPiece || gameState.gameOver || isHardDropping.current) return;

    const rotated = rotatePiece(gameState.currentPiece.type, false);
    const newRotation = (gameState.currentPiece.rotation + 3) % 4;
    
    const kickTests = getKickTests(gameState.currentPiece.type.type, gameState.currentPiece.rotation, newRotation);

    for (const kick of kickTests) {
      const testPiece: GamePiece = { 
        ...gameState.currentPiece, 
        type: rotated, 
        x: gameState.currentPiece.x + kick.x, 
        y: gameState.currentPiece.y + kick.y,
        rotation: newRotation
      };
      
      if (isValidPosition(gameState.board, testPiece)) {
        setGameState(prev => ({
          ...prev,
          currentPiece: testPiece,
          ghostPiece: createGhostPiece(gameState.board, testPiece)
        }));
        setLastAction('rotate');
        
        setLockDelay(false);
        lockDelayTime.current = 0;
        return;
      }
    }
  }, [gameState.currentPiece, gameState.board, gameState.gameOver]);

  // 完全重写硬降功能 - 确保立即执行
  const hardDrop = useCallback(() => {
    if (!gameState.currentPiece || gameState.gameOver || gameState.paused || isHardDropping.current) return;

    console.log('硬降开始 - 当前方块位置:', { x: gameState.currentPiece.x, y: gameState.currentPiece.y });
    
    // 设置硬降状态，防止其他操作干扰
    isHardDropping.current = true;
    
    // 计算最终位置
    let finalY = gameState.currentPiece.y;
    while (isValidPosition(gameState.board, {
      ...gameState.currentPiece,
      y: finalY + 1
    })) {
      finalY++;
    }
    
    const dropDistance = finalY - gameState.currentPiece.y;
    console.log('硬降距离:', dropDistance, '最终位置:', finalY);
    
    // 立即更新方块位置并锁定
    const finalPiece = { ...gameState.currentPiece, y: finalY };
    
    // 检查T-Spin
    const tSpinType = checkTSpin(gameState.board, finalPiece, lastAction || 'move');
    
    // 放置方块并消除行
    const newBoard = placePiece(gameState.board, finalPiece);
    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
    
    // 计算得分和连击
    const newCombo = linesCleared > 0 ? gameState.combo! + 1 : -1;
    const isSpecialClear = tSpinType !== null || linesCleared === 4;
    const newB2B = isSpecialClear ? gameState.b2b! + 1 : (linesCleared > 0 ? 0 : gameState.b2b!);
    
    const lineScore = calculateScore(linesCleared, gameState.level, !!tSpinType, gameState.b2b! > 0, newCombo);
    const attackValue = calculateAttackLines(linesCleared, !!tSpinType, gameState.b2b! > 0, newCombo);
    
    // 立即更新游戏状态
    setGameState(prev => ({
      ...prev,
      board: clearedBoard,
      currentPiece: null,
      ghostPiece: null,
      lines: prev.lines + linesCleared,
      combo: newCombo,
      b2b: newB2B,
      score: prev.score + lineScore + (dropDistance * 2), // 硬降得分
      attack: prev.attack! + attackValue,
      level: Math.floor((prev.lines + linesCleared) / 40) + 1,
      clearingLines: []
    }));
    
    // 显示特殊消除提示
    if (tSpinType) {
      toast.success(`${tSpinType}!${gameState.b2b! > 1 ? ` B2B x${gameState.b2b}` : ''}`, { duration: 2000 });
    } else if (linesCleared === 4) {
      toast.success(`Tetris!${gameState.b2b! > 1 ? ` B2B x${gameState.b2b}` : ''}`, { duration: 2000 });
    }
    
    if (newCombo > 0) {
      toast.success(`${newCombo + 1} 连击! +${attackValue} 攻击`, { duration: 1500 });
    }
    
    // 重置状态并生成新方块
    setLastAction(null);
    setLockDelay(false);
    lockDelayTime.current = 0;
    
    // 短暂延迟后生成新方块
    setTimeout(() => {
      isHardDropping.current = false;
      spawnNewPiece();
    }, 50);
    
    console.log('硬降完成 - 方块已锁定，准备生成新方块');
  }, [gameState.currentPiece, gameState.board, gameState.level, gameState.lines, gameState.gameOver, gameState.paused, lastAction, gameState.combo, gameState.b2b, spawnNewPiece]);

  const lockPiece = useCallback(() => {
    if (!gameState.currentPiece || isHardDropping.current) return;

    console.log('锁定方块位置:', gameState.currentPiece.x, gameState.currentPiece.y);
    const tSpinType = checkTSpin(gameState.board, gameState.currentPiece, lastAction || 'move');
    const newBoard = placePiece(gameState.board, gameState.currentPiece);
    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
    
    const newCombo = linesCleared > 0 ? gameState.combo! + 1 : -1;
    const isSpecialClear = tSpinType !== null || linesCleared === 4;
    const newB2B = isSpecialClear ? gameState.b2b! + 1 : (linesCleared > 0 ? 0 : gameState.b2b!);
    
    const lineScore = calculateScore(linesCleared, gameState.level, !!tSpinType, gameState.b2b! > 0, newCombo);
    const attackValue = calculateAttackLines(linesCleared, !!tSpinType, gameState.b2b! > 0, newCombo);
    
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
    
    if (tSpinType) {
      toast.success(`${tSpinType}!${gameState.b2b! > 1 ? ` B2B x${gameState.b2b}` : ''}`, { duration: 2000 });
    } else if (linesCleared === 4) {
      toast.success(`Tetris!${gameState.b2b! > 1 ? ` B2B x${gameState.b2b}` : ''}`, { duration: 2000 });
    }
    
    if (newCombo > 0) {
      toast.success(`${newCombo + 1} 连击! +${attackValue} 攻击`, { duration: 1500 });
    }
    
    setLastAction(null);
    setTimeout(() => spawnNewPiece(), 100);
  }, [gameState.currentPiece, gameState.board, gameState.level, gameState.lines, lastAction, gameState.combo, gameState.b2b, spawnNewPiece]);

  const holdCurrentPiece = useCallback(() => {
    if (!gameState.currentPiece || !gameState.canHold || gameState.gameOver || isHardDropping.current) return;

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
  }, [gameState.currentPiece, gameState.holdPiece, gameState.canHold, gameState.gameOver, gameState.board, spawnNewPiece, createGamePieceFromType]);

  const startGame = useCallback(() => {
    console.log('开始游戏...');
    isHardDropping.current = false;
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
    setGameState(prev => ({ ...prev, paused: true }));
  }, []);

  const resetGame = useCallback(() => {
    console.log('重置游戏...');
    isHardDropping.current = false;
    setGameState({
      board: Array(20).fill(null).map(() => Array(10).fill(0)),
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

  // Game loop
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
    startGame,
    pauseGame,
    resetGame,
    shareGame,
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
