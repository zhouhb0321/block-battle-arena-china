import React from 'react';
import { getCurrentSkin, GARBAGE_COLOR, isGarbageBlock, getColorByTypeId } from '@/utils/blockSkins';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useTheme } from '@/contexts/ThemeContext';
import type { GamePiece } from '@/utils/gameTypes';

interface EnhancedGameBoardProps {
  board: number[][];
  currentPiece?: GamePiece | null;
  ghostPiece?: GamePiece | null;
  cellSize?: number;
  showGrid?: boolean;
  showHiddenRows?: boolean;
  isLockDelayActive?: boolean;
  lockDelayResetCount?: number;
  clearingLines?: number[];
}

const EnhancedGameBoard: React.FC<EnhancedGameBoardProps> = React.memo(({
  board,
  currentPiece,
  ghostPiece,
  cellSize = 24,
  showGrid = true,
  showHiddenRows = true,
  isLockDelayActive = false,
  lockDelayResetCount = 0,
  clearingLines = []
}) => {
  const { settings } = useUserSettings();
  const { actualTheme } = useTheme();
  const currentSkin = getCurrentSkin(settings.blockSkin || 'wood');

  const createExtendedBoard = () => {
    const extendedBoard = board.map(row => [...row]);

    if (ghostPiece && settings.enableGhost) {
      const shape = ghostPiece.type.shape;
      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          if (shape[row][col] !== 0) {
            const boardX = ghostPiece.x + col;
            const boardY = ghostPiece.y + row;
            if (boardY >= 0 && boardY < extendedBoard.length && boardX >= 0 && boardX < extendedBoard[0].length) {
              if (extendedBoard[boardY][boardX] === 0) {
                const color = ghostPiece.type.color;
                extendedBoard[boardY][boardX] = `ghost-${color}` as any;
              }
            }
          }
        }
      }
    }

    if (currentPiece) {
      const shape = currentPiece.type.shape;
      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          if (shape[row][col] !== 0) {
            const boardX = currentPiece.x + col;
            const boardY = currentPiece.y + row;
            if (boardY >= 0 && boardY < extendedBoard.length && boardX >= 0 && boardX < extendedBoard[0].length) {
              // 直接使用piece的颜色，确保一致性
              extendedBoard[boardY][boardX] = currentPiece.type.color as any;
            }
          }
        }
      }
    }

    return extendedBoard;
  };

  const extendedBoard = createExtendedBoard();

  const getCellStyle = (cellValue: number | string, rowIndex: number) => {
    let cellStyle: React.CSSProperties = {};
    let cellClass = '';
    const isHidden = showHiddenRows && rowIndex < 3;
    const isClearing = clearingLines.includes(rowIndex);

    if (typeof cellValue === 'string') {
      if (cellValue.startsWith('ghost-')) {
        const color = cellValue.replace('ghost-', '');
        const ghostOpacity = (settings.ghostOpacity || 40) / 100 * 0.8;
        
        // 改进的幽灵方块样式 - 灰色边框，内部使用背景色的暗色版本
        if (actualTheme === 'light') {
          cellStyle = {
            backgroundColor: `rgba(60, 60, 60, ${ghostOpacity * 0.3})`, // 暗色填充
            border: `2px dashed #888888`,
            borderRadius: '3px',
            opacity: 1,
          };
        } else {
          cellStyle = {
            backgroundColor: `rgba(40, 40, 40, ${ghostOpacity * 0.4})`, // 深色主题下的暗色填充
            border: `2px dashed #666666`,
            borderRadius: '3px',
            opacity: ghostOpacity + 0.3,
          };
        }
        cellClass = 'ghost-block';
      } else if (cellValue.startsWith('#')) {
        // 直接使用颜色值（来自当前方块）
        cellStyle = currentSkin.getBlockStyle(cellValue, false);
        cellClass = currentSkin.getBlockClass(cellValue, false);
      }
    } else if (cellValue !== 0) {
      if (isGarbageBlock(cellValue)) {
        cellStyle = {
          backgroundColor: GARBAGE_COLOR,
          border: `1px solid ${GARBAGE_COLOR}`,
          opacity: isHidden ? 0.3 : 1,
        };
        cellClass = 'garbage-block';
      } else {
        // 使用数字ID映射的颜色（来自已落地的方块）
        const color = getColorByTypeId(cellValue);
        cellStyle = currentSkin.getBlockStyle(color, false);
        cellClass = currentSkin.getBlockClass(color, false);
      }
    } else {
      if (isHidden) {
        cellStyle = {
          backgroundColor: 'transparent',
          border: 'none',
        };
      } else {
        if (actualTheme === 'light') {
          cellStyle = {
            backgroundColor: 'transparent',
            border: '1px solid rgba(0, 0, 0, 0.1)',
          };
        } else {
          cellStyle = {
            backgroundColor: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          };
        }
      }
      cellClass = 'empty-block';
    }

    if (isHidden) {
      cellStyle.opacity = (cellStyle.opacity as number || 1) * 0.3;
    }

    if (isClearing) {
      cellClass += ' clearing-line';
    }

    return { cellStyle, cellClass };
  };

  return (
    <div className="relative">
      {/* 锁定延迟提示 */}
      {isLockDelayActive && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-500/20 text-yellow-300 text-xs text-center py-1 z-10">
          锁定延迟 ({lockDelayResetCount}/15)
        </div>
      )}
      
      <div 
        className="game-board relative border-2 border-gray-600 bg-transparent"
        style={{
          width: cellSize * 10,
          height: cellSize * (showHiddenRows ? 23 : 20),
          display: 'grid',
          gridTemplateColumns: `repeat(10, ${cellSize}px)`,
          gridTemplateRows: `repeat(${showHiddenRows ? 23 : 20}, ${cellSize}px)`,
        }}
      >
        {extendedBoard.map((row, rowIndex) => 
          row.map((cellValue, colIndex) => {
            const { cellStyle, cellClass } = getCellStyle(cellValue, rowIndex);
            
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`game-cell ${cellClass} ${
                  showHiddenRows && rowIndex < 3 ? 'hidden-row' : ''
                } ${showGrid ? 'show-grid' : ''}`}
                style={{
                  ...cellStyle,
                  width: cellSize,
                  height: cellSize,
                  boxSizing: 'border-box',
                }}
              />
            );
          })
        )}
      </div>
      
      <style>{`
        .game-board {
          image-rendering: pixelated;
          image-rendering: -moz-crisp-edges; 
          image-rendering: crisp-edges;
        }
        
        .game-cell {
          position: relative;
          transition: all 0.1s ease;
        }
        
        .show-grid .game-cell {
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .hidden-row {
          position: relative;
        }
        
        .ghost-block {
          animation: ghost-pulse 2s ease-in-out infinite;
        }
        
        .lock-delay-flash {
          animation: lock-delay-blink 0.3s ease-in-out infinite;
        }
        
        .clearing-line {
          animation: clearing-fade-out 0.25s ease-out;
        }
        
        @keyframes ghost-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.3); }
        }
        
        @keyframes lock-delay-blink {
          0%, 100% { filter: brightness(1.3) saturate(1.2); }
          50% { filter: brightness(0.7) saturate(0.8); }
        }
        
        @keyframes clearing-fade-out {
          0% { 
            opacity: 1; 
            transform: scale(1);
            filter: brightness(1.2) saturate(1.1);
          }
          50% { 
            opacity: 0.8; 
            transform: scale(1.05);
            filter: brightness(1.3) saturate(1.15);
          }
          100% { 
            opacity: 0; 
            transform: scale(1.05);
            filter: brightness(1.5) saturate(1.2);
          }
        }
        
        /* 回字皮肤样式 */
        .hui-block {
          position: relative;
        }
        
        .hui-block::after {
          content: '';
          position: absolute;
          top: 25%;
          left: 25%;
          width: 50%;
          height: 50%;
          background: currentColor;
          filter: brightness(0.6) saturate(1.2);
          border: 1px solid rgba(0, 0, 0, 0.2);
          box-sizing: border-box;
        }
        
        .hui-ghost-block {
          position: relative;
        }
        
        .hui-ghost-block::after {
          content: '';
          position: absolute;
          top: 25%;
          left: 25%;
          width: 50%;
          height: 50%;
          background: currentColor;
          filter: brightness(0.4) saturate(0.8);
          border: 1px dashed currentColor;
          box-sizing: border-box;
          opacity: 0.6;
        }
        
        .neon-block {
          box-shadow: 0 0 10px currentColor, inset 0 0 10px rgba(255, 255, 255, 0.1);
          animation: neon-glow 2s ease-in-out infinite alternate;
        }
        
        @keyframes neon-glow {
          from {
            box-shadow: 0 0 5px currentColor, inset 0 0 5px rgba(255, 255, 255, 0.1);
          }
          to {
            box-shadow: 0 0 15px currentColor, inset 0 0 15px rgba(255, 255, 255, 0.2);
          }
        }
      `}</style>
    </div>
  );
});

export default EnhancedGameBoard;