
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
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [lastMove, setLastMove] = useState<number>(0);
  const [currentPiece, setCurrentPiece] = useState(gameState.currentPiece);
  const [board, setBoard] = useState(gameState.board);
  const [nextPieces, setNextPieces] = useState(gameState.nextPieces);
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
      x: Math.floor(BOARD_WIDTH / 2) - 1,
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
    setScore(prev => prev + linesCleared * 100 * level);
    setLevel(Math.floor((lines + linesCleared) / 10) + 1);
    
    spawnNewPiece();
  }, [currentPiece, board, level, lines, spawnNewPiece]);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (!currentPiece || gameOver || paused) return;

    const newX = currentPiece.x + dx;
    const newY = currentPiece.y + dy;

    if (isValidPosition(board, currentPiece, newX, newY)) {
      setCurrentPiece(prev => prev ? { ...prev, x: newX, y: newY } : null);
    } else if (dy > 0) {
      // 如果向下移动失败，锁定方块
      lockPiece();
    }
  }, [currentPiece, board, gameOver, paused, lockPiece]);

  const rotatePieceClockwise = useCallback(() => {
    if (!currentPiece || gameOver || paused) return;

    const rotated = rotatePiece(currentPiece.type, true);
    const newPiece = { ...currentPiece, type: rotated };

    if (isValidPosition(board, newPiece)) {
      setCurrentPiece(newPiece);
    }
  }, [currentPiece, board, gameOver, paused]);

  const rotatePieceCounterclockwise = useCallback(() => {
    if (!currentPiece || gameOver || paused) return;

    const rotated = rotatePiece(currentPiece.type, false);
    const newPiece = { ...currentPiece, type: rotated };

    if (isValidPosition(board, newPiece)) {
      setCurrentPiece(newPiece);
    }
  }, [currentPiece, board, gameOver, paused]);

  const hardDrop = useCallback(() => {
    if (!currentPiece || gameOver || paused) return;

    const dropY = calculateDropPosition(board, currentPiece);
    setCurrentPiece(prev => prev ? { ...prev, y: dropY } : null);
    
    // 短暂延迟后锁定方块
    setTimeout(lockPiece, 50);
  }, [currentPiece, board, gameOver, paused, lockPiece]);

  const holdCurrentPiece = useCallback(() => {
    if (!currentPiece || !canHold || gameOver || paused) return;

    if (holdPiece) {
      const newPiece = {
        type: holdPiece,
        x: Math.floor(BOARD_WIDTH / 2) - 1,
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
    event.preventDefault();
    setKeys(prev => new Set(prev).add(event.code));
  }, []);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    event.preventDefault();
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
        }
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
            }
          }
        });
      });

      // 绘制Ghost piece (预览落点)
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
  }, [board, currentPiece]);

  const getColorByType = (type: number): string => {
    const colors = ['#000', '#00f0f0', '#f0f000', '#a000f0', '#00f000', '#f00000', '#0000f0', '#f0a000'];
    return colors[type] || '#fff';
  };

  const gameLoop = useCallback((timestamp: number) => {
    if (gameOver) return;

    if (!paused) {
      // 处理键盘输入
      const { controls } = gameSettings;
      
      keys.forEach(key => {
        if (key === controls.moveLeft && timestamp - lastMove > gameSettings.arr) {
          movePiece(-1, 0);
          setLastMove(timestamp);
        } else if (key === controls.moveRight && timestamp - lastMove > gameSettings.arr) {
          movePiece(1, 0);
          setLastMove(timestamp);
        } else if (key === controls.softDrop) {
          movePiece(0, 1);
        }
      });

      // 单次按键处理
      if (keys.has(controls.hardDrop)) {
        hardDrop();
        setKeys(prev => {
          const newKeys = new Set(prev);
          newKeys.delete(controls.hardDrop);
          return newKeys;
        });
      }
      
      if (keys.has(controls.rotateClockwise)) {
        rotatePieceClockwise();
        setKeys(prev => {
          const newKeys = new Set(prev);
          newKeys.delete(controls.rotateClockwise);
          return newKeys;
        });
      }
      
      if (keys.has(controls.rotateCounterclockwise)) {
        rotatePieceCounterclockwise();
        setKeys(prev => {
          const newKeys = new Set(prev);
          newKeys.delete(controls.rotateCounterclockwise);
          return newKeys;
        });
      }
      
      if (keys.has(controls.hold)) {
        holdCurrentPiece();
        setKeys(prev => {
          const newKeys = new Set(prev);
          newKeys.delete(controls.hold);
          return newKeys;
        });
      }

      // 自动下落
      const dropSpeed = Math.max(50, 1000 - (level - 1) * 50);
      if (timestamp - lastUpdate > dropSpeed) {
        movePiece(0, 1);
        setLastUpdate(timestamp);
      }

      // 绘制游戏画面
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawBoard(ctx);
        }
      }
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [
    gameOver, paused, keys, gameSettings, lastMove, lastUpdate, level,
    movePiece, hardDrop, rotatePieceClockwise, rotatePieceCounterclockwise,
    holdCurrentPiece, drawBoard
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
    spawnNewPiece();
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
      spawnNewPiece();
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
              <div className="grid grid-cols-4 gap-1">
                {holdPiece.shape.map((row, y) =>
                  row.map((cell, x) => (
                    <div
                      key={`${y}-${x}`}
                      className={`w-2 h-2 ${cell ? 'opacity-100' : 'opacity-0'}`}
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
              <div>{user?.username} - 得分: {score}</div>
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
                <div className="grid grid-cols-4 gap-1">
                  {piece.shape.map((row, y) =>
                    row.map((cell, x) => (
                      <div
                        key={`${y}-${x}`}
                        className={`w-2 h-2 ${cell ? 'opacity-100' : 'opacity-0'}`}
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
