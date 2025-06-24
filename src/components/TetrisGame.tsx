import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import GameBoard from './GameBoard';
import GameInfo from './GameInfo';
import PiecePreview from './PiecePreview';
import { 
  isValidPosition, 
  placePiece, 
  clearLines, 
  rotatePiece, 
  calculateDropPosition,
  generateSevenBag,
  checkTSpin,
  getKickTests
} from '@/utils/tetrisLogic';

interface TetrisGameProps {
  mode: 'single' | 'multi';
  gameType?: 'sprint40' | 'ultra2min' | 'endless';
}

const TetrisGame: React.FC<TetrisGameProps> = ({ mode, gameType = 'endless' }) => {
  const { gameState, gameSettings, resetGame, pauseGame, resumeGame } = useGame();
  const { user } = useAuth();
  const gameLoopRef = useRef<number>();
  const lastDropTime = useRef<number>(0);
  const keyPressedTime = useRef<{[key: string]: number}>({});
  const lockDelayTime = useRef<number>(0);
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const [lastAction, setLastAction] = useState<'rotate' | 'move' | null>(null);
  
  const [currentPiece, setCurrentPiece] = useState(gameState.currentPiece);
  const [board, setBoard] = useState(() => Array(20).fill(null).map(() => Array(10).fill(0)));
  const [nextPieces, setNextPieces] = useState(() => generateSevenBag());
  const [holdPiece, setHoldPiece] = useState(gameState.holdPiece);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [pieces, setPieces] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lockDelay, setLockDelay] = useState(false);

  const BOARD_WIDTH = 10;
  const BOARD_HEIGHT = 20;
  const LOCK_DELAY_TIME = 500; // 500ms锁定延迟

  const spawnNewPiece = useCallback(() => {
    if (nextPieces.length === 0) return;

    const newPiece = {
      type: nextPieces[0],
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(nextPieces[0].shape[0].length / 2),
      y: 0,
      rotation: 0
    };

    const newNextPieces = [...nextPieces.slice(1)];
    if (newNextPieces.length < 4) {
      newNextPieces.push(...generateSevenBag());
    }

    if (!isValidPosition(board, newPiece)) {
      setGameOver(true);
      return;
    }

    setCurrentPiece(newPiece);
    setNextPieces(newNextPieces);
    setCanHold(true);
    setLockDelay(false);
    lockDelayTime.current = 0;
    setPieces(prev => prev + 1);
  }, [board, nextPieces]);

  const lockPiece = useCallback(() => {
    if (!currentPiece) return;

    // 检查T-Spin
    const tSpinType = checkTSpin(board, currentPiece, lastAction || 'move');
    
    const newBoard = placePiece(board, currentPiece);
    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
    
    setBoard(clearedBoard);
    setLines(prev => prev + linesCleared);
    
    // 计算得分 (包含T-Spin奖励)
    let lineScore = 0;
    if (tSpinType) {
      // T-Spin得分奖励
      const tSpinScores = {
        'Mini T-Spin': 100,
        'T-Spin-Single': 800,
        'T-Spin-Double': 1200,
        'T-Spin-Triple': 1600
      };
      lineScore = tSpinScores[tSpinType] || 0;
      toast.success(`${tSpinType}!`, { duration: 2000 });
    } else {
      const lineScores = [0, 40, 100, 300, 1200];
      lineScore = lineScores[Math.min(linesCleared, 4)] || 0;
    }
    
    setScore(prev => prev + lineScore * level);
    
    // 每10行增加一个等级
    const newLevel = Math.floor((lines + linesCleared) / 10) + 1;
    setLevel(newLevel);
    
    setLastAction(null);
    spawnNewPiece();
  }, [currentPiece, board, level, lines, spawnNewPiece, lastAction]);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (!currentPiece || gameOver || paused) return false;

    const newX = currentPiece.x + dx;
    const newY = currentPiece.y + dy;

    if (isValidPosition(board, currentPiece, newX, newY)) {
      setCurrentPiece(prev => prev ? { ...prev, x: newX, y: newY } : null);
      setLastAction('move');
      
      // 重置锁定延迟如果方块还能继续下落
      if (dy > 0) {
        setLockDelay(false);
        lockDelayTime.current = 0;
      }
      
      return true;
    } else if (dy > 0) {
      // 如果向下移动失败，开始锁定延迟
      if (!lockDelay) {
        setLockDelay(true);
        lockDelayTime.current = Date.now();
      }
      return false;
    }
    return false;
  }, [currentPiece, board, gameOver, paused, lockDelay]);

  const rotatePieceClockwise = useCallback(() => {
    if (!currentPiece || gameOver || paused) return;

    const rotated = rotatePiece(currentPiece.type, true);
    const newRotation = (currentPiece.rotation + 1) % 4;
    
    // 使用SRS墙踢系统
    const kickTests = getKickTests(currentPiece.type.type, currentPiece.rotation, newRotation);

    for (const kick of kickTests) {
      const testPiece = { 
        ...currentPiece, 
        type: rotated, 
        x: currentPiece.x + kick.x, 
        y: currentPiece.y + kick.y,
        rotation: newRotation
      };
      
      if (isValidPosition(board, testPiece)) {
        setCurrentPiece(testPiece);
        setLastAction('rotate');
        
        // 重置锁定延迟
        setLockDelay(false);
        lockDelayTime.current = 0;
        return;
      }
    }
  }, [currentPiece, board, gameOver, paused]);

  const rotatePieceCounterclockwise = useCallback(() => {
    if (!currentPiece || gameOver || paused) return;

    const rotated = rotatePiece(currentPiece.type, false);
    const newRotation = (currentPiece.rotation + 3) % 4;
    
    // 使用SRS墙踢系统
    const kickTests = getKickTests(currentPiece.type.type, currentPiece.rotation, newRotation);

    for (const kick of kickTests) {
      const testPiece = { 
        ...currentPiece, 
        type: rotated, 
        x: currentPiece.x + kick.x, 
        y: currentPiece.y + kick.y,
        rotation: newRotation
      };
      
      if (isValidPosition(board, testPiece)) {
        setCurrentPiece(testPiece);
        setLastAction('rotate');
        
        // 重置锁定延迟
        setLockDelay(false);
        lockDelayTime.current = 0;
        return;
      }
    }
  }, [currentPiece, board, gameOver, paused]);

  const hardDrop = useCallback(() => {
    if (!currentPiece || gameOver || paused) return;

    const dropY = calculateDropPosition(board, currentPiece);
    setCurrentPiece(prev => prev ? { ...prev, y: dropY } : null);
    
    // 立即锁定方块
    setTimeout(lockPiece, 50);
  }, [currentPiece, board, gameOver, paused, lockPiece]);

  const holdCurrentPiece = useCallback(() => {
    if (!currentPiece || !canHold || gameOver || paused) return;

    if (holdPiece) {
      const newPiece = {
        type: holdPiece,
        x: Math.floor(BOARD_WIDTH / 2) - Math.floor(holdPiece.shape[0].length / 2),
        y: 0,
        rotation: 0
      };
      setHoldPiece(currentPiece.type);
      setCurrentPiece(newPiece);
    } else {
      setHoldPiece(currentPiece.type);
      spawnNewPiece();
    }
    
    setCanHold(false);
    setLockDelay(false);
    lockDelayTime.current = 0;
  }, [currentPiece, holdPiece, canHold, gameOver, paused, spawnNewPiece]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (gameOver || paused) return;
    
    const { controls } = gameSettings;
    const now = Date.now();
    
    // 防止按键重复触发
    if (!keyPressedTime.current[event.code]) {
      keyPressedTime.current[event.code] = now;
      
      // 立即处理单次按键
      if (event.code === controls.rotateClockwise) {
        event.preventDefault();
        rotatePieceClockwise();
      } else if (event.code === controls.rotateCounterclockwise) {
        event.preventDefault();
        rotatePieceCounterclockwise();
      } else if (event.code === controls.hardDrop) {
        event.preventDefault();
        hardDrop();
      } else if (event.code === controls.hold) {
        event.preventDefault();
        holdCurrentPiece();
      } else if (event.code === controls.pause) {
        event.preventDefault();
        togglePause();
      }
    }
    
    // 添加到持续按键集合
    setKeys(prev => new Set(prev).add(event.code));
  }, [gameSettings, gameOver, paused, rotatePieceClockwise, rotatePieceCounterclockwise, hardDrop, holdCurrentPiece, togglePause]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    delete keyPressedTime.current[event.code];
    setKeys(prev => {
      const newKeys = new Set(prev);
      newKeys.delete(event.code);
      return newKeys;
    });
  }, []);

  const drawBoard = useCallback((ctx: CanvasRenderingContext2D) => {
    // 清空画布
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 绘制网格
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let x = 0; x <= BOARD_WIDTH; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE, 0);
      ctx.lineTo(x * CELL_SIZE, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL_SIZE);
      ctx.lineTo(CANVAS_WIDTH, y * CELL_SIZE);
      ctx.stroke();
    }

    // 绘制已放置的方块
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (board[y][x] !== 0) {
          ctx.fillStyle = getColorByType(board[y][x]);
          ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          
          // 添加边框效果
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.strokeRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
      }
    }

    // 绘制Ghost piece (预览落点)
    if (currentPiece && gameSettings.enableGhost) {
      const ghostY = calculateDropPosition(board, currentPiece);
      if (ghostY !== currentPiece.y) {
        ctx.fillStyle = currentPiece.type.color + '40'; // 半透明
        currentPiece.type.shape.forEach((row, dy) => {
          row.forEach((cell, dx) => {
            if (cell) {
              const drawX = (currentPiece.x + dx) * CELL_SIZE;
              const drawY = (ghostY + dy) * CELL_SIZE;
              if (drawX >= 0 && drawX < CANVAS_WIDTH && drawY >= 0 && drawY < CANVAS_HEIGHT) {
                ctx.fillRect(drawX + 1, drawY + 1, CELL_SIZE - 2, CELL_SIZE - 2);
              }
            }
          });
        });
      }
    }

    // 绘制当前方块
    if (currentPiece) {
      ctx.fillStyle = currentPiece.type.color;
      
      currentPiece.type.shape.forEach((row, dy) => {
        row.forEach((cell, dx) => {
          if (cell) {
            const drawX = (currentPiece.x + dx) * CELL_SIZE;
            const drawY = (currentPiece.y + dy) * CELL_SIZE;
            if (drawX >= 0 && drawX < CANVAS_WIDTH && drawY >= 0 && drawY < CANVAS_HEIGHT) {
              ctx.fillRect(drawX + 1, drawY + 1, CELL_SIZE - 2, CELL_SIZE - 2);
              
              // 添加边框效果
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 1;
              ctx.strokeRect(drawX + 1, drawY + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            }
          }
        });
      });
    }
  }, [board, currentPiece, gameSettings.enableGhost]);

  const getColorByType = (type: number): string => {
    const colors = ['#000', '#00f0f0', '#f0f000', '#a000f0', '#00f000', '#f00000', '#0000f0', '#f0a000'];
    return colors[type] || '#fff';
  };

  const gameLoop = useCallback((timestamp: number) => {
    if (gameOver) return;

    if (!paused) {
      const { controls } = gameSettings;
      
      // 处理持续按键 (DAS/ARR)
      keys.forEach(key => {
        const pressTime = keyPressedTime.current[key] || 0;
        const heldTime = timestamp - pressTime;
        
        if (heldTime > gameSettings.das) {
          if (key === controls.moveLeft) {
            if (heldTime % Math.max(gameSettings.arr, 16) < 16) {
              movePiece(-1, 0);
            }
          } else if (key === controls.moveRight) {
            if (heldTime % Math.max(gameSettings.arr, 16) < 16) {
              movePiece(1, 0);
            }
          } else if (key === controls.softDrop) {
            if (heldTime % Math.max(16, 1000 / gameSettings.sdf) < 16) {
              movePiece(0, 1);
            }
          }
        } else if (heldTime < 16) {
          // 初次按键立即响应
          if (key === controls.moveLeft) {
            movePiece(-1, 0);
          } else if (key === controls.moveRight) {
            movePiece(1, 0);
          } else if (key === controls.softDrop) {
            movePiece(0, 1);
          }
        }
      });

      // 自动下落
      const dropSpeed = Math.max(50, 1000 - (level - 1) * 50);
      if (timestamp - lastDropTime.current > dropSpeed) {
        const moved = movePiece(0, 1);
        if (!moved && lockDelay) {
          // 检查锁定延迟是否到期
          if (timestamp - lockDelayTime.current > LOCK_DELAY_TIME) {
            lockPiece();
          }
        }
        lastDropTime.current = timestamp;
      } else if (lockDelay) {
        // 如果有锁定延迟，检查是否到期
        if (timestamp - lockDelayTime.current > LOCK_DELAY_TIME) {
          lockPiece();
        }
      }
    }

    // 绘制游戏画面
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawBoard(ctx);
      }
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [
    gameOver, paused, keys, gameSettings, level,
    movePiece, drawBoard, lockDelay, lockPiece
  ]);

  const handleShare = () => {
    const url = window.location.href;
    const text = `我在方块竞技场获得了 ${score} 分！一起来挑战吧！`;
    
    if (navigator.share) {
      navigator.share({
        title: '方块竞技场',
        text: text,
        url: url
      });
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      toast.success('分享链接已复制到剪贴板');
    }
  };

  const togglePause = () => {
    if (paused) {
      setPaused(false);
      resumeGame();
    } else {
      setPaused(true);
      pauseGame();
    }
  };

  const handleReset = () => {
    setBoard(Array(20).fill(null).map(() => Array(10).fill(0)));
    setNextPieces(generateSevenBag());
    setCurrentPiece(null);
    setHoldPiece(null);
    setScore(0);
    setLines(0);
    setLevel(1);
    setPieces(0);
    setGameOver(false);
    setPaused(false);
    setCanHold(true);
    setLockDelay(false);
    lastDropTime.current = 0;
    lockDelayTime.current = 0;
    keyPressedTime.current = {};
    setTimeout(() => spawnNewPiece(), 100);
    resetGame();
  };

  // 计算PPS和攻击力
  const pps = pieces > 0 ? pieces / Math.max((Date.now() - Date.now()) / 1000, 1) : 0;
  const attack = lines > 0 ? lines / Math.max((Date.now() - Date.now()) / 60000, 1) : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // canvas.width = CANVAS_WIDTH;
      // canvas.height = CANVAS_HEIGHT;
    }

    // 初始化游戏
    if (!currentPiece && nextPieces.length > 0) {
      setTimeout(() => spawnNewPiece(), 100);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [handleKeyDown, handleKeyUp, gameLoop, currentPiece, nextPieces, spawnNewPiece]);

  return (
    <div className="flex gap-4 p-4 justify-center">
      {/* 单人模式布局 */}
      {mode === 'single' && (
        <>
          {/* 左侧广告位 */}
          <div className="w-60 h-[600px] bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center rounded-lg">
            <span className="text-gray-500 text-sm text-center">广告位<br/>招租中<br/>联系管理员</span>
          </div>

          <div className="flex gap-4">
            {/* Hold区域 */}
            <PiecePreview piece={holdPiece} title="HOLD" size="medium" />

            {/* 游戏主区域 */}
            <div className="bg-gray-800 p-4 rounded-lg relative">
              <GameInfo
                username={user?.username || 'Guest'}
                score={score}
                lines={lines}
                level={level}
                paused={paused}
                onPause={togglePause}
                onShare={handleShare}
                mode="single"
              />
              
              <GameBoard
                board={board}
                currentPiece={currentPiece}
                enableGhost={gameSettings.enableGhost}
              />
              
              {paused && (
                <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg">
                  <div className="text-white text-2xl">游戏暂停</div>
                </div>
              )}
              
              {gameOver && (
                <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg">
                  <div className="text-white text-center">
                    <div className="text-2xl mb-4">游戏结束</div>
                    <div className="mb-4">最终得分: {score}</div>
                    <Button onClick={handleReset}>重新开始</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Next区域 */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-white text-sm mb-2 text-center font-bold">NEXT</h3>
              <div className="space-y-2">
                {nextPieces.slice(0, 4).map((piece, index) => (
                  <PiecePreview key={index} piece={piece} title="" size="small" />
                ))}
              </div>
            </div>
          </div>

          {/* 右侧广告位 */}
          <div className="w-60 h-[600px] bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center rounded-lg">
            <span className="text-gray-500 text-sm text-center">广告位<br/>招租中<br/>联系管理员</span>
          </div>
        </>
      )}

      {/* 双人对战模式布局 */}
      {mode === 'multi' && (
        <div className="flex gap-8 w-full max-w-6xl">
          {/* 玩家1 */}
          <div className="flex gap-4">
            <PiecePreview piece={holdPiece} title="HOLD" size="small" />
            
            <div className="bg-gray-800 p-4 rounded-lg relative">
              <GameInfo
                username={user?.username || 'Player 1'}
                score={score}
                lines={lines}
                level={level}
                pieces={pieces}
                pps={pps}
                attack={attack}
                paused={paused}
                onPause={togglePause}
                onShare={handleShare}
                mode="multi"
              />
              
              <GameBoard
                board={board}
                currentPiece={currentPiece}
                enableGhost={gameSettings.enableGhost}
                cellSize={25}
              />
              
              {paused && (
                <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg">
                  <div className="text-white text-xl">暂停</div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              {nextPieces.slice(0, 3).map((piece, index) => (
                <PiecePreview key={index} piece={piece} title="" size="small" />
              ))}
            </div>
          </div>

          {/* 中间对战信息 */}
          <div className="flex flex-col items-center justify-center text-white">
            <div className="text-2xl font-bold mb-4">VS</div>
            <div className="text-sm opacity-75">1:26.867</div>
          </div>

          {/* 玩家 2 (镜像布局) */}
          <div className="flex gap-4">
            <div className="space-y-2">
              {nextPieces.slice(0, 3).map((piece, index) => (
                <PiecePreview key={index} piece={piece} title="" size="small" />
              ))}
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg relative">
              <GameInfo
                username="Player 2"
                score={0}
                lines={0}
                level={1}
                pieces={0}
                pps={0}
                attack={0}
                paused={false}
                onPause={() => {}}
                onShare={() => {}}
                mode="multi"
              />
              
              <GameBoard
                board={Array(20).fill(null).map(() => Array(10).fill(0))}
                currentPiece={null}
                enableGhost={false}
                cellSize={25}
              />
            </div>
            
            <PiecePreview piece={null} title="HOLD" size="small" />
          </div>
        </div>
      )}
    </div>
  );
};

export default TetrisGame;
