
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Share2, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';
import { 
  isValidPosition, 
  placePiece, 
  clearLines, 
  rotatePiece, 
  calculateDropPosition,
  generateSevenBag 
} from '@/utils/tetrisLogic';

interface TetrisGameProps {
  mode: 'single' | 'multi';
  gameType?: 'sprint40' | 'ultra2min' | 'endless';
}

const TetrisGame: React.FC<TetrisGameProps> = ({ mode, gameType = 'endless' }) => {
  const { gameState, gameSettings, resetGame, pauseGame, resumeGame } = useGame();
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const lastDropTime = useRef<number>(0);
  const keyPressedTime = useRef<{[key: string]: number}>({});
  const [keys, setKeys] = useState<Set<string>>(new Set());
  
  const [currentPiece, setCurrentPiece] = useState(gameState.currentPiece);
  const [board, setBoard] = useState(() => Array(20).fill(null).map(() => Array(10).fill(0)));
  const [nextPieces, setNextPieces] = useState(() => generateSevenBag());
  const [holdPiece, setHoldPiece] = useState(gameState.holdPiece);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);

  const CELL_SIZE = 30;
  const BOARD_WIDTH = 10;
  const BOARD_HEIGHT = 20;
  const CANVAS_WIDTH = BOARD_WIDTH * CELL_SIZE;
  const CANVAS_HEIGHT = BOARD_HEIGHT * CELL_SIZE;

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
  }, [board, nextPieces]);

  const lockPiece = useCallback(() => {
    if (!currentPiece) return;

    const newBoard = placePiece(board, currentPiece);
    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
    
    setBoard(clearedBoard);
    setLines(prev => prev + linesCleared);
    
    // 计算得分 (标准俄罗斯方块得分系统)
    const lineScores = [0, 40, 100, 300, 1200];
    const lineScore = lineScores[Math.min(linesCleared, 4)] || 0;
    setScore(prev => prev + lineScore * level);
    
    // 每10行增加一个等级
    const newLevel = Math.floor((lines + linesCleared) / 10) + 1;
    setLevel(newLevel);
    
    spawnNewPiece();
  }, [currentPiece, board, level, lines, spawnNewPiece]);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (!currentPiece || gameOver || paused) return false;

    const newX = currentPiece.x + dx;
    const newY = currentPiece.y + dy;

    if (isValidPosition(board, currentPiece, newX, newY)) {
      setCurrentPiece(prev => prev ? { ...prev, x: newX, y: newY } : null);
      return true;
    } else if (dy > 0) {
      // 如果向下移动失败，锁定方块
      lockPiece();
      return false;
    }
    return false;
  }, [currentPiece, board, gameOver, paused, lockPiece]);

  const rotatePieceClockwise = useCallback(() => {
    if (!currentPiece || gameOver || paused) return;

    const rotated = rotatePiece(currentPiece.type, true);
    const newPiece = { ...currentPiece, type: rotated };

    // 简单的墙踢系统
    const kickTests = [
      { x: 0, y: 0 },   // 原位置
      { x: -1, y: 0 },  // 左移一格
      { x: 1, y: 0 },   // 右移一格
      { x: 0, y: -1 },  // 上移一格
      { x: -1, y: -1 }, // 左上
      { x: 1, y: -1 }   // 右上
    ];

    for (const kick of kickTests) {
      const testPiece = { ...newPiece, x: newPiece.x + kick.x, y: newPiece.y + kick.y };
      if (isValidPosition(board, testPiece)) {
        setCurrentPiece(testPiece);
        return;
      }
    }
  }, [currentPiece, board, gameOver, paused]);

  const rotatePieceCounterclockwise = useCallback(() => {
    if (!currentPiece || gameOver || paused) return;

    const rotated = rotatePiece(currentPiece.type, false);
    const newPiece = { ...currentPiece, type: rotated };

    // 简单的墙踢系统
    const kickTests = [
      { x: 0, y: 0 },   // 原位置
      { x: -1, y: 0 },  // 左移一格
      { x: 1, y: 0 },   // 右移一格
      { x: 0, y: -1 },  // 上移一格
      { x: -1, y: -1 }, // 左上
      { x: 1, y: -1 }   // 右上
    ];

    for (const kick of kickTests) {
      const testPiece = { ...newPiece, x: newPiece.x + kick.x, y: newPiece.y + kick.y };
      if (isValidPosition(board, testPiece)) {
        setCurrentPiece(testPiece);
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
  }, [gameSettings, gameOver, paused, rotatePieceClockwise, rotatePieceCounterclockwise, hardDrop, holdCurrentPiece]);

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
        movePiece(0, 1);
        lastDropTime.current = timestamp;
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
    movePiece, drawBoard
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
    setGameOver(false);
    setPaused(false);
    setCanHold(true);
    lastDropTime.current = 0;
    keyPressedTime.current = {};
    setTimeout(() => spawnNewPiece(), 100);
    resetGame();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
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
      {/* 左侧广告位 */}
      <div className="w-60 h-[600px] bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center rounded-lg">
        <span className="text-gray-500 text-sm text-center">广告位<br/>招租中<br/>联系管理员</span>
      </div>

      <div className="flex gap-4">
        {/* Hold区域 */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-white text-sm mb-2 text-center">HOLD</h3>
          <div className="w-32 h-32 bg-black border border-gray-600 flex items-center justify-center rounded">
            {holdPiece && (
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${holdPiece.shape[0].length}, 1fr)` }}>
                {holdPiece.shape.map((row, y) =>
                  row.map((cell, x) => (
                    <div
                      key={`${y}-${x}`}
                      className={`w-4 h-4 ${cell ? 'opacity-100' : 'opacity-0'} border border-white border-opacity-20`}
                      style={{ backgroundColor: cell ? holdPiece.color : 'transparent' }}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* 游戏主区域 */}
        <div className="bg-gray-800 p-4 rounded-lg relative">
          <div className="mb-4 text-white text-sm flex justify-between items-center">
            <div>
              <div>{user?.username || 'Guest'} - 得分: {score}</div>
              <div>行数: {lines} - 等级: {level}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={togglePause}>
                {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </Button>
              <Button size="sm" variant="outline" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <canvas
            ref={canvasRef}
            className="border border-gray-600 bg-black rounded"
            tabIndex={0}
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
          <h3 className="text-white text-sm mb-2 text-center">NEXT</h3>
          <div className="space-y-2">
            {nextPieces.slice(0, 4).map((piece, index) => (
              <div key={index} className="w-32 h-20 bg-black border border-gray-600 flex items-center justify-center rounded">
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${piece.shape[0].length}, 1fr)` }}>
                  {piece.shape.map((row, y) =>
                    row.map((cell, x) => (
                      <div
                        key={`${y}-${x}`}
                        className={`w-4 h-4 ${cell ? 'opacity-100' : 'opacity-0'} border border-white border-opacity-20`}
                        style={{ backgroundColor: cell ? piece.color : 'transparent' }}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧广告位 */}
      <div className="w-60 h-[600px] bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center rounded-lg">
        <span className="text-gray-500 text-sm text-center">广告位<br/>招租中<br/>联系管理员</span>
      </div>
    </div>
  );
};

export default TetrisGame;
