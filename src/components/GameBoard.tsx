
import React from 'react';
import WoodTextureCell from './WoodTextureCell';
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
  // 只显示游戏区域的20行，隐藏上方3行（显示第3-22行，共20行）
  const visibleBoard = board.slice(3); // 隐藏前3行，显示后20行
  const extendedBoard: (number | string)[][] = visibleBoard.map(row => [...row]);

  // 添加幽灵方块（虚线样式）
  if (enableGhost && ghostPiece && currentPiece) {
    const { shape, color } = ghostPiece.type;
    shape.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell) {
          const boardY = ghostPiece.y + rowIndex;
          const boardX = ghostPiece.x + colIndex;
          // 转换为可见区域坐标（减去隐藏的3行）
          const visibleY = boardY - 3;
          if (visibleY >= 0 && visibleY < 20 && boardX >= 0 && boardX < 10) {
            if (extendedBoard[visibleY][boardX] === 0) {
              extendedBoard[visibleY][boardX] = `ghost-${color}`;
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
          const boardY = currentPiece.y + rowIndex;
          const boardX = currentPiece.x + colIndex;
          // 转换为可见区域坐标（减去隐藏的3行）
          const visibleY = boardY - 3;
          if (visibleY >= 0 && visibleY < 20 && boardX >= 0 && boardX < 10) {
            extendedBoard[visibleY][boardX] = `solid-${color}`;
          }
        }
      });
    });
  }

  return (
    <div className="relative">
      <style>
        {`
          @keyframes flash {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          
          .wood-texture-block {
            transition: all 0.2s ease;
          }
          
          .wood-texture-block.clearing {
            animation: flash 0.3s ease-in-out;
            filter: brightness(1.5) saturate(1.3);
          }
          
          .wood-texture-block:hover {
            filter: brightness(1.1);
          }
          
          .wood-grain-overlay {
            mix-blend-mode: multiply;
          }
          
          .shimmer-overlay {
            animation: shimmer 3s ease-in-out infinite;
          }
          
          @keyframes shimmer {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 0.6; }
          }
        `}
      </style>
      
      <div 
        className="grid gap-0 border-2 border-border bg-background shadow-2xl"
        style={{ 
          gridTemplateColumns: `repeat(10, ${cellSize}px)`,
          width: `${cellSize * 10 + 4}px`,
          height: `${cellSize * 20 + 4}px`
        }}
      >
        {extendedBoard.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <WoodTextureCell
              key={`${rowIndex}-${colIndex}`}
              cellValue={cell}
              rowIndex={rowIndex}
              cellSize={cellSize}
              isClearing={clearingLines.includes(rowIndex)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default GameBoard;
