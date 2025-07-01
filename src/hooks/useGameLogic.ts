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
  }, [createGamePieceFromType]);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (!gameState.currentPiece || gameState.gameOver) return false;

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
    if (!gameState.currentPiece || gameState.gameOver) return;

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
    if (!gameState.currentPiece || gameState.gameOver) return;

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

  // 修复硬降落功能 - 确保方块正确降到最底部并立即锁定
  const hardDrop = useCallback(() => {
    if (!gameState.currentPiece || gameState.gameOver) return;

    console.log('硬降落开始，当前方块位置:', { x: gameState.currentPiece.x, y: gameState.currentPiece.y });
    
    // 使用修复后的计算函数获取最终位置
    const targetY = calculateDropPosition(gameState.board, gameState.currentPiece);
    const dropDistance = targetY - gameState.currentPiece.y;
    
    console.log('硬降落目标位置:', targetY, '降落距离:', dropDistance);
    
    if (dropDistance <= 0) {
      // 如果已经到底部，直接锁定
      console.log('方块已在底部，直接锁定');
      lockPiece();
      return;
    }
    
    // 立即移动到目标位置并添加硬降落得分
    const droppedPiece = { ...gameState.currentPiece, y: targetY };
    
    // 验证目标位置是否有效
    if (!isValidPosition(gameState.board, droppedPiece)) {
      console.error('硬降落目标位置无效!');
      return;
    }
    
    // 更新方块位置，清除幽灵，添加得分
    setGameState(prev => ({
      ...prev,
      currentPiece: droppedPiece,
      ghostPiece: null,
      score: prev.score + dropDistance * 2
    }));
    
    // 立即锁定方块（无延迟）
    setTimeout(() => {
      console.log('硬降落后锁定方块');
      lockPiece();
    }, 10);
  }, [gameState.currentPiece, gameState.board, gameState.gameOver]);

  const lockPiece = useCallback(() => {
    if (!gameState.currentPiece) return;

    console.log('锁定方块，位置:', gameState.currentPiece.x, gameState.currentPiece.y);
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
    if (!gameState.currentPiece || !gameState.canHold || gameState.gameOver) return;

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
    console.log('Starting game...');
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
          console.log('Initializing seven bag for game start:', gamePieces.map(p => p.type.name));
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
    console.log('Resetting game...');
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
    console.log('Sharing game...');
    toast.success('游戏分享功能即将推出！');
  }, []);

  // Game loop
  useEffect(() => {
    const gameLoop = (timestamp: number) => {
      if (gameState.gameOver || gameState.paused) {
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
