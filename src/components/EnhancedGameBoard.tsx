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
  // 4W 模式支持 - 动态棋盘尺寸
  boardWidth?: number;   // 棋盘宽度 (4-10)
  boardHeight?: number;  // 可见行数 (10-40)
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
  
  // 从 board 推断实际尺寸，或使用 props
  const actualBoardWidth = propBoardWidth ?? board[0]?.length ?? 10;
  const actualVisibleRows = propBoardHeight ?? 20;
  const hiddenRows = 3;
  const totalRows = actualVisibleRows + hiddenRows;
  
  // 自适应计算 cellSize 以适应屏幕
  const calculateAdaptiveCellSize = () => {
    if (propCellSize) return propCellSize;
    
    // 对于非标准尺寸棋盘，自动缩放
    if (actualBoardWidth !== 10 || actualVisibleRows !== 20) {
      const maxWidth = 280; // 最大棋盘宽度像素
      const maxHeight = 480; // 最大棋盘高度像素
      
      const widthBasedSize = Math.floor(maxWidth / actualBoardWidth);
      const heightBasedSize = Math.floor(maxHeight / actualVisibleRows);
      
      return Math.min(widthBasedSize, heightBasedSize, 28);
    }
    
    return 24; // 默认 cellSize
  };
  
  const cellSize = calculateAdaptiveCellSize();

  const createExtendedBoard = () => {
    // ✅ 增强防御性检查：确保 board 存在且是有效数组
    if (!board || !Array.isArray(board) || board.length === 0) {
      console.warn('[EnhancedGameBoard] Invalid board data', board);
      return Array(totalRows).fill(null).map(() => Array(actualBoardWidth).fill(0));
    }
    
    // ✅ 验证并修复每一行
    const extendedBoard = board.map((row, idx) => {
      if (!row || !Array.isArray(row)) {
        console.warn(`[EnhancedGameBoard] Row ${idx} is invalid, creating empty row`);
        return Array(actualBoardWidth).fill(0);
      }
      // 确保每行有正确数量的元素
      const fixedRow = [...row];
      while (fixedRow.length < actualBoardWidth) fixedRow.push(0);
      return fixedRow.slice(0, actualBoardWidth);
    });
    
    // ✅ 确保棋盘有正确行数
    while (extendedBoard.length < totalRows) {
      extendedBoard.unshift(Array(actualBoardWidth).fill(0));
    }

    if (ghostPiece && settings.enableGhost && ghostPiece.type) {
      // ✅ 使用 getPieceShape 获取旋转后的形状
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
      // ✅ 使用 getPieceShape 获取旋转后的形状
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
  
  // 根据 showHiddenRows 决定渲染哪些行
  const rowsToRender = showHiddenRows ? extendedBoard : extendedBoard.slice(hiddenRows);
  const displayRowCount = showHiddenRows ? totalRows : actualVisibleRows;

  const getCellStyle = (cellValue: number | string, actualRowIndex: number) => {
    let cellStyle: React.CSSProperties = {};
    let cellClass = '';
    const isHidden = showHiddenRows && actualRowIndex < hiddenRows;
    const isClearing = clearingLines.includes(actualRowIndex);

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
          width: cellSize * actualBoardWidth,
          height: cellSize * displayRowCount,
          display: 'grid',
          gridTemplateColumns: `repeat(${actualBoardWidth}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${displayRowCount}, ${cellSize}px)`,
        }}
      >
        {rowsToRender.map((row, displayIndex) => {
          // 计算实际行索引（用于消行动画等）
          const actualRowIndex = showHiddenRows ? displayIndex : displayIndex + hiddenRows;
          return row.map((cellValue, colIndex) => {
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