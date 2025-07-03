import React from 'react';
import type { GamePiece } from '@/utils/gameTypes';

interface GameBoardProps {
  board: number[][];
  currentPiece: GamePiece | null;
  ghostPiece?: GamePiece | null;
  enableGhost?: boolean;
  cellSize?: number;
  clearingLines?: number[];
}

const GameBoard: React.FC<GameBoardProps> = ({
  board,
  currentPiece,
  ghostPiece,
  enableGhost = true,
  cellSize = 25,
  clearingLines = []
}) => {
  // 创建显示用的棋盘，包含上方2行（总共22行）
  const extendedBoard: (number | string)[][] = [
    // 上方2行，初始为空
    Array(10).fill(0),
    Array(10).fill(0),
    // 正常游戏区域的20行
    ...board.map(row => [...row])
  ];

  // 添加幽灵方块（虚线样式）
  if (enableGhost && ghostPiece && currentPiece) {
    const { shape, color } = ghostPiece.type;
    shape.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell) {
          const boardY = ghostPiece.y + rowIndex + 2; // 加2是因为扩展了上方2行
          const boardX = ghostPiece.x + colIndex;
          if (boardY >= 0 && boardY < 22 && boardX >= 0 && boardX < 10) {
            if (extendedBoard[boardY][boardX] === 0) {
              extendedBoard[boardY][boardX] = `ghost-${color}`;
            }
          }
        }
      });
    });
  }

  // 添加当前方块（实心样式）
  if (currentPiece) {
    const { shape, color } = currentPiece.type;
    shape.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell) {
          const boardY = currentPiece.y + rowIndex + 2; // 加2是因为扩展了上方2行
          const boardX = currentPiece.x + colIndex;
          if (boardY >= 0 && boardY < 22 && boardX >= 0 && boardX < 10) {
            extendedBoard[boardY][boardX] = `solid-${color}`;
          }
        }
      });
    });
  }

  const getCellStyle = (cellValue: number | string, rowIndex: number) => {
    const isClearing = clearingLines.includes(rowIndex - 2); // 减2因为上方2行
    const isSpawnArea = rowIndex < 2; // 前2行是生成区域
    const baseStyle = {
      width: `${cellSize}px`,
      height: `${cellSize}px`,
    };
    
    if (cellValue === 0) {
      return {
        ...baseStyle,
        backgroundColor: isSpawnArea ? 'rgba(26, 26, 26, 0.3)' : '#1a1a1a',
        border: isSpawnArea ? '1px dashed #555' : '1px solid #333',
      };
    }
    
    // 幽灵方块 - 虚线边框样式
    if (typeof cellValue === 'string' && cellValue.startsWith('ghost-')) {
      const color = cellValue.replace('ghost-', '');
      return {
        ...baseStyle,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: `2px dashed ${color}`,
        opacity: 0.6,
        borderRadius: '2px',
      };
    }
    
    // 实心方块 - 带阴影和渐变的立体效果
    if (typeof cellValue === 'string' && cellValue.startsWith('solid-')) {
      const color = cellValue.replace('solid-', '');
      return {
        ...baseStyle,
        backgroundColor: color,
        border: `1px solid ${color}`,
        boxShadow: isClearing 
          ? '0 0 15px #fff, inset 2px 2px 4px rgba(255,255,255,0.4), inset -2px -2px 4px rgba(0,0,0,0.3)' 
          : 'inset 2px 2px 4px rgba(255,255,255,0.3), inset -2px -2px 4px rgba(0,0,0,0.3)',
        borderRadius: '1px',
        animation: isClearing ? 'flash 0.3s ease-in-out' : 'none',
      };
    }
    
    // 已放置的方块 - 根据数字获取颜色
    const colors = ['', '#00f0f0', '#f0f000', '#a000f0', '#00f000', '#f00000', '#0000f0', '#f0a000', '#666666'];
    const backgroundColor = colors[cellValue as number] || '#666666';
    
    return {
      ...baseStyle,
      backgroundColor,
      border: `1px solid ${backgroundColor}`,
      boxShadow: isClearing 
        ? '0 0 15px #fff, inset 2px 2px 4px rgba(255,255,255,0.3), inset -2px -2px 4px rgba(0,0,0,0.3)' 
        : 'inset 2px 2px 4px rgba(255,255,255,0.2), inset -2px -2px 4px rgba(0,0,0,0.3)',
      borderRadius: '1px',
      animation: isClearing ? 'flash 0.3s ease-in-out' : 'none',
    };
  };

  return (
    <div className="relative">
      <style>
        {`
          @keyframes flash {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}
      </style>
      
      <div 
        className="grid gap-0 border-2 border-border bg-background shadow-2xl"
        style={{ 
          gridTemplateColumns: `repeat(10, ${cellSize}px)`,
          width: `${cellSize * 10 + 4}px`,
          height: `${cellSize * 22 + 4}px`
        }}
      >
        {extendedBoard.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              style={getCellStyle(cell, rowIndex)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default GameBoard;