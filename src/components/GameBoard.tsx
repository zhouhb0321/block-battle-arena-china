
import React, { useRef, useCallback, useEffect } from 'react';
import type { GamePiece } from '@/utils/gameTypes';

interface GameBoardProps {
  board: number[][];
  currentPiece: GamePiece | null;
  ghostPiece?: GamePiece | null;
  enableGhost: boolean;
  cellSize?: number;
  clearingLines?: number[];
}

const GameBoard: React.FC<GameBoardProps> = ({ 
  board, 
  currentPiece, 
  ghostPiece,
  enableGhost, 
  cellSize = 30,
  clearingLines = []
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

  const drawBlock = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    isGhost: boolean = false,
    isClearing: boolean = false
  ) => {
    const drawX = x * cellSize;
    const drawY = y * cellSize;
    
    if (isGhost) {
      // 幽灵方块 - 虚线边框，更明显的显示
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(drawX + 2, drawY + 2, cellSize - 4, cellSize - 4);
      
      // 添加半透明填充，使幽灵方块更明显
      ctx.fillStyle = color.replace(')', ', 0.2)').replace('rgb', 'rgba');
      ctx.fill();
      ctx.fillRect(drawX + 2, drawY + 2, cellSize - 4, cellSize - 4);
      
      ctx.setLineDash([]);
      return;
    }
    
    // 消行闪烁效果
    const alpha = isClearing ? 0.3 : 1;
    const originalAlpha = ctx.globalAlpha;
    ctx.globalAlpha = alpha;
    
    // 主色块
    ctx.fillStyle = color;
    ctx.fillRect(drawX + 1, drawY + 1, cellSize - 2, cellSize - 2);
    
    // 3D效果高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(drawX + 1, drawY + 1, cellSize - 2, 2); // 顶部高光
    ctx.fillRect(drawX + 1, drawY + 1, 2, cellSize - 2); // 左侧高光
    
    // 3D效果阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(drawX + 1, drawY + cellSize - 3, cellSize - 2, 2); // 底部阴影
    ctx.fillRect(drawX + cellSize - 3, drawY + 1, 2, cellSize - 2); // 右侧阴影
    
    // 外边框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(drawX + 1, drawY + 1, cellSize - 2, cellSize - 2);
    
    ctx.globalAlpha = originalAlpha;
  };

  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
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
          const isClearing = clearingLines.includes(y);
          drawBlock(ctx, x, y, color, false, isClearing);
        }
      }
    }

    // 绘制幽灵方块 - 确保在当前方块之前绘制
    if (ghostPiece && enableGhost && ghostPiece.type) {
      ghostPiece.type.shape.forEach((row, dy) => {
        row.forEach((cell, dx) => {
          if (cell) {
            const drawX = ghostPiece.x + dx;
            const drawY = ghostPiece.y + dy;
            
            // 只在可见区域内绘制幽灵方块
            if (drawX >= 0 && drawX < BOARD_WIDTH && drawY >= 0 && drawY < BOARD_HEIGHT) {
              // 确保不与已放置的方块重叠
              if (board[drawY][drawX] === 0) {
                drawBlock(ctx, drawX, drawY, ghostPiece.type.color, true);
              }
            }
          }
        });
      });
    }

    // 绘制当前控制的方块
    if (currentPiece) {
      currentPiece.type.shape.forEach((row, dy) => {
        row.forEach((cell, dx) => {
          if (cell) {
            const drawX = currentPiece.x + dx;
            const drawY = currentPiece.y + dy;
            
            // 允许方块部分超出顶部（y < 0），但只绘制可见部分
            if (drawX >= 0 && drawX < BOARD_WIDTH && drawY < BOARD_HEIGHT) {
              if (drawY >= 0) {
                drawBlock(ctx, drawX, drawY, currentPiece.type.color);
              }
            }
          }
        });
      });
    }
  }, [board, currentPiece, ghostPiece, enableGhost, cellSize, clearingLines]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
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
