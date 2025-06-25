
import React, { useRef, useCallback, useEffect } from 'react';
import { GamePiece } from '@/contexts/GameContext';
import { calculateDropPosition } from '@/utils/tetrisLogic';

interface GameBoardProps {
  board: number[][];
  currentPiece: GamePiece | null;
  enableGhost: boolean;
  cellSize?: number;
}

const GameBoard: React.FC<GameBoardProps> = ({ 
  board, 
  currentPiece, 
  enableGhost, 
  cellSize = 30 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const BOARD_WIDTH = 10;
  const BOARD_HEIGHT = 20;
  const CANVAS_WIDTH = BOARD_WIDTH * cellSize;
  const CANVAS_HEIGHT = BOARD_HEIGHT * cellSize;

  const getColorByType = (type: number): string => {
    const colors = [
      '#000000', // 0: 空
      '#00f0f0', // 1: I (青色)
      '#f0f000', // 2: O (黄色)  
      '#a000f0', // 3: T (紫色)
      '#00f000', // 4: S (绿色)
      '#f00000', // 5: Z (红色)
      '#0000f0', // 6: J (蓝色)
      '#f0a000', // 7: L (橙色)
      '#666666'  // 8: 垃圾块 (灰色)
    ];
    return colors[type] || '#ffffff';
  };

  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布，使用深色背景
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 绘制网格线
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 0.5;
    
    // 垂直线
    for (let x = 0; x <= BOARD_WIDTH; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, CANVAS_HEIGHT);
      ctx.stroke();
    }
    
    // 水平线
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(CANVAS_WIDTH, y * cellSize);
      ctx.stroke();
    }

    // 绘制已放置的方块
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (board[y][x] !== 0) {
          const color = getColorByType(board[y][x]);
          
          // 主色块
          ctx.fillStyle = color;
          ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
          
          // 添加3D效果边框
          ctx.fillStyle = board[y][x] === 8 ? '#999999' : '#ffffff';
          ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, 2); // 顶部高光
          ctx.fillRect(x * cellSize + 1, y * cellSize + 1, 2, cellSize - 2); // 左侧高光
          
          ctx.fillStyle = board[y][x] === 8 ? '#333333' : '#000000';
          ctx.fillRect(x * cellSize + 1, y * cellSize + cellSize - 3, cellSize - 2, 2); // 底部阴影
          ctx.fillRect(x * cellSize + cellSize - 3, y * cellSize + 1, 2, cellSize - 2); // 右侧阴影
        }
      }
    }

    // 绘制幽灵方块（Ghost piece）
    if (currentPiece && enableGhost) {
      const ghostY = calculateDropPosition(board, currentPiece);
      if (ghostY > currentPiece.y) {
        // 设置幽灵方块样式
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = currentPiece.type.color;
        ctx.lineWidth = 2;
        
        currentPiece.type.shape.forEach((row, dy) => {
          row.forEach((cell, dx) => {
            if (cell) {
              const drawX = (currentPiece.x + dx) * cellSize;
              const drawY = (ghostY + dy) * cellSize;
              
              if (drawX >= 0 && drawX < CANVAS_WIDTH && drawY >= 0 && drawY < CANVAS_HEIGHT) {
                // 绘制虚线边框效果
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(drawX + 2, drawY + 2, cellSize - 4, cellSize - 4);
                ctx.setLineDash([]);
              }
            }
          });
        });
        
        ctx.globalAlpha = 1;
      }
    }

    // 绘制当前控制的方块
    if (currentPiece) {
      currentPiece.type.shape.forEach((row, dy) => {
        row.forEach((cell, dx) => {
          if (cell) {
            const drawX = (currentPiece.x + dx) * cellSize;
            const drawY = (currentPiece.y + dy) * cellSize;
            
            if (drawX >= 0 && drawX < CANVAS_WIDTH && drawY >= 0) {
              // 主色块
              ctx.fillStyle = currentPiece.type.color;
              ctx.fillRect(drawX + 1, drawY + 1, cellSize - 2, cellSize - 2);
              
              // 添加3D效果
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(drawX + 1, drawY + 1, cellSize - 2, 2); // 顶部高光
              ctx.fillRect(drawX + 1, drawY + 1, 2, cellSize - 2); // 左侧高光
              
              ctx.fillStyle = '#000000';
              ctx.fillRect(drawX + 1, drawY + cellSize - 3, cellSize - 2, 2); // 底部阴影
              ctx.fillRect(drawX + cellSize - 3, drawY + 1, 2, cellSize - 2); // 右侧阴影
              
              // 外边框
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1;
              ctx.strokeRect(drawX + 1, drawY + 1, cellSize - 2, cellSize - 2);
            }
          }
        });
      });
    }
  }, [board, currentPiece, enableGhost, cellSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      // 设置画布样式以获得清晰的像素渲染
      canvas.style.imageRendering = 'pixelated';
    }
    drawBoard();
  }, [drawBoard]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="border-2 border-gray-600 bg-gray-900 rounded-lg shadow-inner"
        tabIndex={0}
        style={{
          imageRendering: 'pixelated',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
        }}
      />
    </div>
  );
};

export default GameBoard;
