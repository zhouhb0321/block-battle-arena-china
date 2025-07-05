
import React from 'react';
import { getCurrentSkin, GARBAGE_COLOR, isGarbageBlock } from '@/utils/blockSkins';
import { useUserSettings } from '@/hooks/useUserSettings';
import type { GamePiece } from '@/utils/gameTypes';

interface EnhancedGameBoardProps {
  board: number[][];
  currentPiece: GamePiece | null;
  ghostPiece?: GamePiece | null;
  enableGhost?: boolean;
  cellSize?: number;
  clearingLines?: number[];
  showHiddenRows?: boolean;
}

const EnhancedGameBoard: React.FC<EnhancedGameBoardProps> = ({
  board,
  currentPiece,
  ghostPiece,
  enableGhost = true,
  cellSize = 25,
  clearingLines = [],
  showHiddenRows = true
}) => {
  const { settings } = useUserSettings();
  const currentSkin = getCurrentSkin(settings.blockSkin || 'wood');

  // 创建扩展的游戏板，包含隐藏行的半透明显示
  const createExtendedBoard = () => {
    const fullBoard: (number | string)[][] = board.map(row => [...row]);
    
    // 添加幽灵方块
    if (enableGhost && ghostPiece && currentPiece) {
      const { shape, color } = ghostPiece.type;
      shape.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          if (cell) {
            const boardY = ghostPiece.y + rowIndex;
            const boardX = ghostPiece.x + colIndex;
            if (boardY >= 0 && boardY < board.length && boardX >= 0 && boardX < 10) {
              if (fullBoard[boardY][boardX] === 0) {
                fullBoard[boardY][boardX] = `ghost-${color}`;
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
            if (boardY >= 0 && boardY < board.length && boardX >= 0 && boardX < 10) {
              fullBoard[boardY][boardX] = `solid-${color}`;
            }
          }
        });
      });
    }

    return fullBoard;
  };

  const extendedBoard = createExtendedBoard();
  
  // 分离隐藏行和可见行
  const hiddenRows = showHiddenRows ? extendedBoard.slice(0, 3) : [];
  const visibleRows = extendedBoard.slice(3);

  const renderCell = (cellValue: number | string, rowIndex: number, colIndex: number, isHidden = false) => {
    const isClearing = clearingLines.includes(rowIndex);
    const key = `${rowIndex}-${colIndex}`;
    
    let cellStyle: React.CSSProperties = {};
    let cellClass = '';
    
    if (typeof cellValue === 'string') {
      if (cellValue.startsWith('ghost-')) {
        const color = cellValue.replace('ghost-', '');
        cellStyle = currentSkin.getBlockStyle(color, true);
        cellClass = currentSkin.getBlockClass(color, true);
      } else if (cellValue.startsWith('solid-')) {
        const color = cellValue.replace('solid-', '');
        cellStyle = currentSkin.getBlockStyle(color, false);
        cellClass = currentSkin.getBlockClass(color, false);
      }
    } else if (cellValue !== 0) {
      if (isGarbageBlock(cellValue)) {
        // 垃圾行使用灰色
        cellStyle = {
          backgroundColor: GARBAGE_COLOR,
          border: `1px solid ${GARBAGE_COLOR}`,
        };
        cellClass = 'garbage-block';
      } else {
        // 已堆积的方块保持原始颜色
        const color = cellValue as string;
        cellStyle = currentSkin.getBlockStyle(color, false);
        cellClass = currentSkin.getBlockClass(color, false);
      }
    } else {
      // 空方块
      cellStyle = {
        backgroundColor: 'transparent',
        border: '1px solid rgba(255,255,255,0.1)',
      };
      cellClass = 'empty-block';
    }

    // 隐藏行的半透明效果
    if (isHidden) {
      cellStyle.opacity = (cellStyle.opacity || 1) * 0.4;
      cellClass += ' hidden-row';
    }

    // 消行动画
    if (isClearing) {
      cellClass += ' clearing';
    }

    return (
      <div
        key={key}
        className={cellClass}
        style={{
          ...cellStyle,
          width: `${cellSize}px`,
          height: `${cellSize}px`,
          transition: 'all 0.2s ease',
        }}
      />
    );
  };

  return (
    <div className="relative">
      <style>
        {`
          @keyframes flash {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          
          .clearing {
            animation: flash 0.3s ease-in-out;
            filter: brightness(1.5) saturate(1.3);
          }
          
          .hidden-row {
            position: relative;
          }
          
          .hidden-row::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
            pointer-events: none;
          }
          
          .neon-block {
            animation: neon-pulse 2s ease-in-out infinite;
          }
          
          @keyframes neon-pulse {
            0%, 100% { filter: brightness(1); }
            50% { filter: brightness(1.2); }
          }
        `}
      </style>
      
      {/* 隐藏行区域 */}
      {hiddenRows.length > 0 && (
        <div 
          className="grid gap-0 border-2 border-red-500/30 bg-black/20 mb-1"
          style={{ 
            gridTemplateColumns: `repeat(10, ${cellSize}px)`,
            width: `${cellSize * 10 + 4}px`,
          }}
        >
          {hiddenRows.map((row, rowIndex) =>
            row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex, true))
          )}
        </div>
      )}
      
      {/* 主游戏区域 */}
      <div 
        className="grid gap-0 border-2 border-border bg-background shadow-2xl"
        style={{ 
          gridTemplateColumns: `repeat(10, ${cellSize}px)`,
          width: `${cellSize * 10 + 4}px`,
          height: `${cellSize * 20 + 4}px`
        }}
      >
        {visibleRows.map((row, rowIndex) =>
          row.map((cell, colIndex) => renderCell(cell, rowIndex + 3, colIndex, false))
        )}
      </div>
    </div>
  );
};

export default EnhancedGameBoard;
