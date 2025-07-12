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
}

const EnhancedGameBoard: React.FC<EnhancedGameBoardProps> = ({
  board,
  currentPiece,
  ghostPiece,
  cellSize = 24,
  showGrid = true,
  showHiddenRows = true,
  isLockDelayActive = false,
  lockDelayResetCount = 0
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
                const color = getColorByTypeId(shape[row][col]);
                extendedBoard[boardY][boardX] = `ghost-${color}`;
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
              const color = getColorByTypeId(shape[row][col]);
              const prefix = isLockDelayActive ? 'lock-delay-' : 'solid-';
              extendedBoard[boardY][boardX] = `${prefix}${color}`;
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

    if (typeof cellValue === 'string') {
      if (cellValue.startsWith('ghost-')) {
        const color = cellValue.replace('ghost-', '');
        const ghostOpacity = (settings.ghostOpacity / 100) * 0.8;
        
        if (actualTheme === 'light') {
          cellStyle = {
            backgroundColor: `rgba(0, 0, 0, ${ghostOpacity * 0.15})`,
            border: `2px dashed ${color}`,
            borderRadius: '3px',
            opacity: 1,
          };
        } else {
          cellStyle = {
            backgroundColor: `rgba(255, 255, 255, ${ghostOpacity * 0.1})`,
            border: `2px dashed ${color}`,
            borderRadius: '3px',
            opacity: ghostOpacity + 0.2,
          };
        }
        cellClass = 'ghost-block';
      } else if (cellValue.startsWith('lock-delay-')) {
        const color = cellValue.replace('lock-delay-', '');
        cellStyle = currentSkin.getBlockStyle(color, false);
        cellClass = `${currentSkin.getBlockClass(color, false)} lock-delay-flash`;
      } else if (cellValue.startsWith('solid-')) {
        const color = cellValue.replace('solid-', '');
        cellStyle = currentSkin.getBlockStyle(color, false);
        cellClass = currentSkin.getBlockClass(color, false);
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

    return { cellStyle, cellClass };
  };

  return (
    <div className="relative">
      {/* 锁定延迟提示 */}
      {isLockDelayActive && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-500/20 text-yellow-300 text-xs text-center py-1 z-10">
          锁定延迟 ({lockDelayResetCount}/{15})
        </div>
      )}
      
      <div 
        className="game-board relative border-2 border-gray-600 bg-gray-900"
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
      
      <style jsx>{`
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
          animation: lock-delay-blink 0.5s ease-in-out infinite;
        }
        
        @keyframes ghost-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.3); }
        }
        
        @keyframes lock-delay-blink {
          0%, 100% { filter: brightness(1.2); }
          50% { filter: brightness(0.8); }
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
          background: ${actualTheme === 'light' ? '#ffffff' : '#1a1a1a'};
          border: 1px solid rgba(0, 0, 0, 0.3);
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
          background: transparent;
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
};

export default EnhancedGameBoard;
