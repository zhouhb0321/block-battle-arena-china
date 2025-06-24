
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
    const colors = ['#000', '#00f0f0', '#f0f000', '#a000f0', '#00f000', '#f00000', '#0000f0', '#f0a000'];
    return colors[type] || '#fff';
  };

  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 绘制网格
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let x = 0; x <= BOARD_WIDTH; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, CANVAS_HEIGHT);
      ctx.stroke();
    }
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
          ctx.fillStyle = getColorByType(board[y][x]);
          ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
          
          // 添加边框效果
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.strokeRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
        }
      }
    }

    // 绘制Ghost piece (预览落点)
    if (currentPiece && enableGhost) {
      const ghostY = calculateDropPosition(board, currentPiece);
      if (ghostY !== currentPiece.y) {
        ctx.fillStyle = currentPiece.type.color + '40'; // 半透明
        currentPiece.type.shape.forEach((row, dy) => {
          row.forEach((cell, dx) => {
            if (cell) {
              const drawX = (currentPiece.x + dx) * cellSize;
              const drawY = (ghostY + dy) * cellSize;
              if (drawX >= 0 && drawX < CANVAS_WIDTH && drawY >= 0 && drawY < CANVAS_HEIGHT) {
                ctx.fillRect(drawX + 1, drawY + 1, cellSize - 2, cellSize - 2);
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
            const drawX = (currentPiece.x + dx) * cellSize;
            const drawY = (currentPiece.y + dy) * cellSize;
            if (drawX >= 0 && drawX < CANVAS_WIDTH && drawY >= 0 && drawY < CANVAS_HEIGHT) {
              ctx.fillRect(drawX + 1, drawY + 1, cellSize - 2, cellSize - 2);
              
              // 添加边框效果
              ctx.strokeStyle = '#fff';
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
    }
    drawBoard();
  }, [drawBoard]);

  return (
    <canvas
      ref={canvasRef}
      className="border border-gray-600 bg-black rounded"
      tabIndex={0}
    />
  );
};

export default GameBoard;
