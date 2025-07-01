
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
  // 创建显示用的棋盘
  const displayBoard = board.map(row => [...row]);

  // 添加幽灵方块
  if (enableGhost && ghostPiece) {
    const { shape, color } = ghostPiece.type;
    shape.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell) {
          const boardY = ghostPiece.y + rowIndex;
          const boardX = ghostPiece.x + colIndex;
          if (boardY >= 0 && boardY < 20 && boardX >= 0 && boardX < 10) {
            if (displayBoard[boardY][boardX] === 0) {
              displayBoard[boardY][boardX] = `ghost-${color}`;
            }
          }
        }
      });
    });
  }

  // 添加当前方块
  if (currentPiece) {
    const { shape, color } = currentPiece.type;
    shape.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell) {
          const boardY = currentPiece.y + rowIndex;
          const boardX = currentPiece.x + colIndex;
          if (boardY >= 0 && boardY < 20 && boardX >= 0 && boardX < 10) {
            displayBoard[boardY][boardX] = color;
          }
        }
      });
    });
  }

  const getCellStyle = (cellValue: any, rowIndex: number) => {
    const isClearing = clearingLines.includes(rowIndex);
    
    if (cellValue === 0) {
      return {
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        width: `${cellSize}px`,
        height: `${cellSize}px`,
      };
    }
    
    if (typeof cellValue === 'string' && cellValue.startsWith('ghost-')) {
      const color = cellValue.replace('ghost-', '');
      return {
        backgroundColor: 'transparent',
        border: `2px dashed ${color}`,
        opacity: 0.5,
        width: `${cellSize}px`,
        height: `${cellSize}px`,
      };
    }
    
    return {
      backgroundColor: cellValue,
      border: `1px solid ${cellValue}`,
      width: `${cellSize}px`,
      height: `${cellSize}px`,
      boxShadow: isClearing ? '0 0 10px #fff' : 'inset 2px 2px 4px rgba(255,255,255,0.3)',
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
        className="grid gap-0 border-2 border-gray-600 bg-black"
        style={{ 
          gridTemplateColumns: `repeat(10, ${cellSize}px)`,
          width: `${cellSize * 10 + 4}px`,
          height: `${cellSize * 20 + 4}px`
        }}
      >
        {displayBoard.map((row, rowIndex) =>
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
