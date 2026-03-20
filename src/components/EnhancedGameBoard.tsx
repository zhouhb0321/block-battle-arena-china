import React from 'react';
import { getCurrentSkin, GARBAGE_COLOR, isGarbageBlock, getColorByTypeId } from '@/utils/blockSkins';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useTheme } from '@/contexts/ThemeContext';
import type { GamePiece } from '@/utils/gameTypes';
import { getPieceShape } from '@/utils/pieceGeneration';

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
  boardWidth?: number;
  boardHeight?: number;
}

const EnhancedGameBoard: React.FC<EnhancedGameBoardProps> = React.memo(({
  board,
  currentPiece,
  ghostPiece,
  cellSize: propCellSize,
  showGrid = true,
  showHiddenRows = true,
  isLockDelayActive = false,
  lockDelayResetCount = 0,
  clearingLines = [],
  boardWidth: propBoardWidth,
  boardHeight: propBoardHeight
}) => {
  const { settings } = useUserSettings();
  const { actualTheme } = useTheme();
  const currentSkin = getCurrentSkin(settings.blockSkin || 'wood');
  
  const actualBoardWidth = propBoardWidth ?? board[0]?.length ?? 10;
  const actualVisibleRows = propBoardHeight ?? 20;
  const hiddenRows = 3;
  const totalRows = actualVisibleRows + hiddenRows;
  
  const calculateAdaptiveCellSize = () => {
    if (propCellSize) return propCellSize;
    
    if (actualBoardWidth !== 10 || actualVisibleRows !== 20) {
      const maxWidth = 280;
      const maxHeight = 480;
      const widthBasedSize = Math.floor(maxWidth / actualBoardWidth);
      const heightBasedSize = Math.floor(maxHeight / actualVisibleRows);
      return Math.min(widthBasedSize, heightBasedSize, 28);
    }
    
    return 24;
  };
  
  const cellSize = calculateAdaptiveCellSize();

  const createExtendedBoard = () => {
    if (!board || !Array.isArray(board) || board.length === 0) {
      return Array(totalRows).fill(null).map(() => Array(actualBoardWidth).fill(0));
    }
    
    const extendedBoard = board.map((row) => {
      if (!row || !Array.isArray(row)) {
        return Array(actualBoardWidth).fill(0);
      }
      const fixedRow = [...row];
      while (fixedRow.length < actualBoardWidth) fixedRow.push(0);
      return fixedRow.slice(0, actualBoardWidth);
    });
    
    while (extendedBoard.length < totalRows) {
      extendedBoard.unshift(Array(actualBoardWidth).fill(0));
    }

    if (ghostPiece && settings.enableGhost && ghostPiece.type) {
      const typeName = typeof ghostPiece.type === 'string' ? ghostPiece.type : ghostPiece.type.type;
      const shape = getPieceShape(typeName, ghostPiece.rotation || 0);
      for (let row = 0; row < shape.length; row++) {
        if (!shape[row]) continue;
        for (let col = 0; col < shape[row].length; col++) {
          if (shape[row][col] !== 0) {
            const boardX = ghostPiece.x + col;
            const boardY = ghostPiece.y + row;
            if (boardY >= 0 && boardY < extendedBoard.length && 
                extendedBoard[boardY] && Array.isArray(extendedBoard[boardY]) &&
                boardX >= 0 && boardX < extendedBoard[boardY].length) {
              if (extendedBoard[boardY][boardX] === 0) {
                const color = ghostPiece.type.color;
                extendedBoard[boardY][boardX] = `ghost-${color}` as any;
              }
            }
          }
        }
      }
    }

    if (currentPiece && currentPiece.type) {
      const typeName = typeof currentPiece.type === 'string' ? currentPiece.type : currentPiece.type.type;
      const shape = getPieceShape(typeName, currentPiece.rotation || 0);
      for (let row = 0; row < shape.length; row++) {
        if (!shape[row]) continue;
        for (let col = 0; col < shape[row].length; col++) {
          if (shape[row][col] !== 0) {
            const boardX = currentPiece.x + col;
            const boardY = currentPiece.y + row;
            if (boardY >= 0 && boardY < extendedBoard.length && 
                extendedBoard[boardY] && Array.isArray(extendedBoard[boardY]) &&
                boardX >= 0 && boardX < extendedBoard[boardY].length) {
              extendedBoard[boardY][boardX] = currentPiece.type.color as any;
            }
          }
        }
      }
    }

    return extendedBoard;
  };

  const extendedBoard = createExtendedBoard();
  
  const rowsToRender = showHiddenRows ? extendedBoard : extendedBoard.slice(hiddenRows);
  const displayRowCount = showHiddenRows ? totalRows : actualVisibleRows;

  const getCellStyle = (cellValue: number | string, actualRowIndex: number) => {
    let cellStyle: React.CSSProperties = {};
    let cellClass = '';
    const isHidden = showHiddenRows && actualRowIndex < hiddenRows;
    const isClearing = clearingLines.includes(actualRowIndex);

    if (typeof cellValue === 'string') {
      if (cellValue.startsWith('ghost-')) {
        // Ghost piece: simple semi-transparent fill, no animation
        const ghostColor = cellValue.replace('ghost-', '');
        cellStyle = {
          backgroundColor: ghostColor,
          opacity: (settings.ghostOpacity ?? 50) / 100 * 0.4,
          borderRadius: '2px',
        };
        cellClass = 'ghost-block';
      } else if (cellValue.startsWith('#')) {
        cellStyle = currentSkin.getBlockStyle(cellValue, false);
        cellClass = currentSkin.getBlockClass(cellValue, false);
        // Add inner highlight for 3D depth
        if (!cellStyle.boxShadow) {
          cellStyle.boxShadow = 'inset 1px 1px 0 rgba(255,255,255,0.25), inset -1px -1px 0 rgba(0,0,0,0.2)';
        }
      }
    } else if (cellValue !== 0) {
      if (isGarbageBlock(cellValue)) {
        cellStyle = {
          backgroundColor: GARBAGE_COLOR,
          border: '2px solid #666666',
          boxShadow: 'inset 1px 1px 0 #999999, inset -1px -1px 0 #666666',
          borderRadius: '1px',
          opacity: isHidden ? 0.3 : 1,
        };
        cellClass = 'garbage-block';
      } else {
        const color = getColorByTypeId(cellValue);
        cellStyle = currentSkin.getBlockStyle(color, false);
        cellClass = currentSkin.getBlockClass(color, false);
        if (!cellStyle.boxShadow) {
          cellStyle.boxShadow = 'inset 1px 1px 0 rgba(255,255,255,0.25), inset -1px -1px 0 rgba(0,0,0,0.2)';
        }
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
      {isLockDelayActive && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-500/20 text-yellow-300 text-xs text-center py-1 z-10">
          Lock Delay ({lockDelayResetCount}/15)
        </div>
      )}
      
      <div 
        className="game-board relative border-2 border-gray-600 bg-transparent"
        style={{
          width: cellSize * actualBoardWidth,
          height: cellSize * displayRowCount,
          display: 'grid',
          gridTemplateColumns: `repeat(${actualBoardWidth}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${displayRowCount}, ${cellSize}px)`,
        }}
      >
        {rowsToRender.map((row, displayIndex) => {
          const actualRowIndex = showHiddenRows ? displayIndex : displayIndex + hiddenRows;
          return row.map((cellValue: number | string, colIndex: number) => {
            const { cellStyle, cellClass } = getCellStyle(cellValue, actualRowIndex);
            
            return (
              <div
                key={`${actualRowIndex}-${colIndex}`}
                className={`game-cell ${cellClass} ${
                  showHiddenRows && actualRowIndex < hiddenRows ? 'hidden-row' : ''
                } ${showGrid ? 'show-grid' : ''}`}
                style={{
                  ...cellStyle,
                  width: cellSize,
                  height: cellSize,
                  boxSizing: 'border-box',
                }}
              />
            );
          });
        })}
      </div>
      
      <style>{`
        .game-cell {
          position: relative;
        }
        
        .show-grid .game-cell {
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .lock-delay-flash {
          box-shadow: 0 0 4px 1px rgba(255, 220, 0, 0.6);
        }
        
        .clearing-line {
          animation: clearing-fade-out 0.25s ease-out;
          will-change: opacity, transform;
        }
        
        @keyframes clearing-fade-out {
          0% { 
            opacity: 1; 
            transform: scale(1);
          }
          50% { 
            opacity: 0.6; 
            transform: scale(1.03);
            box-shadow: 0 0 8px 2px rgba(255, 255, 255, 0.3);
          }
          100% { 
            opacity: 0; 
            transform: scale(1.03);
          }
        }
        
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
