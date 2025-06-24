
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';

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
  const [dropTime, setDropTime] = useState<number>(0);
  const [moveTime, setMoveTime] = useState<number>(0);

  const CELL_SIZE = 30;
  const BOARD_WIDTH = 10;
  const BOARD_HEIGHT = 20;
  const CANVAS_WIDTH = BOARD_WIDTH * CELL_SIZE;
  const CANVAS_HEIGHT = BOARD_HEIGHT * CELL_SIZE;

  // 7-bag随机序列生成
  const generateSevenBag = useCallback(() => {
    const pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    return pieces;
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
        if (gameState.board[y][x] !== 0) {
          ctx.fillStyle = getColorByType(gameState.board[y][x]);
          ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
      }
    }

    // 绘制当前方块
    if (gameState.currentPiece) {
      const { type, x, y } = gameState.currentPiece;
      ctx.fillStyle = type.color;
      
      type.shape.forEach((row, dy) => {
        row.forEach((cell, dx) => {
          if (cell) {
            const drawX = (x + dx) * CELL_SIZE;
            const drawY = (y + dy) * CELL_SIZE;
            if (drawX >= 0 && drawX < CANVAS_WIDTH && drawY >= 0 && drawY < CANVAS_HEIGHT) {
              ctx.fillRect(drawX + 1, drawY + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            }
          }
        });
      });
    }
  }, [gameState.board, gameState.currentPiece]);

  const getColorByType = (type: number): string => {
    const colors = ['#000', '#00f0f0', '#f0f000', '#a000f0', '#00f000', '#f00000', '#0000f0', '#f0a000'];
    return colors[type] || '#fff';
  };

  const isValidPosition = useCallback((piece: any, newX: number, newY: number, rotation = 0) => {
    // 检查方块位置是否有效
    for (let dy = 0; dy < piece.shape.length; dy++) {
      for (let dx = 0; dx < piece.shape[dy].length; dx++) {
        if (piece.shape[dy][dx]) {
          const x = newX + dx;
          const y = newY + dy;
          
          // 检查边界
          if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) {
            return false;
          }
          
          // 检查是否与已有方块冲突
          if (y >= 0 && gameState.board[y][x] !== 0) {
            return false;
          }
        }
      }
    }
    return true;
  }, [gameState.board]);

  const clearLines = useCallback(() => {
    const newBoard = [...gameState.board];
    let linesCleared = 0;
    
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (newBoard[y].every(cell => cell !== 0)) {
        newBoard.splice(y, 1);
        newBoard.unshift(Array(BOARD_WIDTH).fill(0));
        linesCleared++;
        y++; // 重新检查这一行
      }
    }
    
    return { newBoard, linesCleared };
  }, [gameState.board]);

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

  const gameLoop = useCallback((timestamp: number) => {
    if (!gameState.paused && !gameState.gameOver) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawBoard(ctx);
        }
      }

      // 处理自动下落
      if (timestamp - dropTime > 1000 / gameState.level) {
        // 自动下落逻辑
        setDropTime(timestamp);
      }

      // 处理键盘输入
      keys.forEach(key => {
        const { controls } = gameSettings;
        
        if (key === controls.moveLeft && timestamp - moveTime > gameSettings.das) {
          // 左移逻辑
          setMoveTime(timestamp);
        } else if (key === controls.moveRight && timestamp - moveTime > gameSettings.das) {
          // 右移逻辑
          setMoveTime(timestamp);
        } else if (key === controls.softDrop) {
          // 软降逻辑
        } else if (key === controls.hardDrop) {
          // 硬降逻辑
        } else if (key === controls.rotateClockwise) {
          // 顺时针旋转逻辑
        } else if (key === controls.rotateCounterclockwise) {
          // 逆时针旋转逻辑
        } else if (key === controls.rotate180) {
          // 180度旋转逻辑
        } else if (key === controls.hold) {
          // Hold逻辑
        } else if (key === controls.pause) {
          pauseGame();
        }
      });
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, gameSettings, keys, dropTime, moveTime, drawBoard, pauseGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
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
  }, [handleKeyDown, handleKeyUp, gameLoop]);

  return (
    <div className="flex gap-4 p-4">
      {/* 左侧广告位 */}
      <div className="w-48 h-96 bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center">
        <span className="text-gray-500 text-sm text-center">广告位<br/>招租中</span>
      </div>

      <div className="flex gap-4">
        {/* Hold区域 */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-white text-sm mb-2">HOLD</h3>
          <div className="w-24 h-24 bg-black border border-gray-600 flex items-center justify-center">
            {gameState.holdPiece && (
              <div className="text-xs text-white">
                {gameState.holdPiece.type}
              </div>
            )}
          </div>
        </div>

        {/* 游戏主区域 */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="mb-4 text-white text-sm">
            {user?.username} - 得分: {gameState.score} - 行数: {gameState.lines} - 等级: {gameState.level}
          </div>
          <canvas
            ref={canvasRef}
            className="border border-gray-600 bg-black"
            tabIndex={0}
          />
          {gameState.paused && (
            <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
              <div className="text-white text-2xl">游戏暂停</div>
            </div>
          )}
          {gameState.gameOver && (
            <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="text-2xl mb-4">游戏结束</div>
                <button
                  onClick={resetGame}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  重新开始
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Next区域 */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-white text-sm mb-2">NEXT</h3>
          <div className="space-y-2">
            {gameState.nextPieces.slice(0, 4).map((piece, index) => (
              <div key={index} className="w-24 h-16 bg-black border border-gray-600 flex items-center justify-center">
                <div className="text-xs text-white">{piece.type}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧广告位 */}
      <div className="w-48 h-96 bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center">
        <span className="text-gray-500 text-sm text-center">广告位<br/>招租中</span>
      </div>
    </div>
  );
};

export default TetrisGame;
