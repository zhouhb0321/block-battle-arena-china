
import React from 'react';
import { getCurrentSkin, getColorByTypeId } from '@/utils/blockSkins';
import { useUserSettings } from '@/hooks/useUserSettings';
import type { GamePiece } from '@/utils/gameTypes';

interface HoldPieceDisplayProps {
  holdPiece: GamePiece | null;
  canHold: boolean;
}

const HoldPieceDisplay: React.FC<HoldPieceDisplayProps> = ({ holdPiece, canHold }) => {
  const { settings } = useUserSettings();
  const currentSkin = getCurrentSkin(settings.blockSkin || 'wood');

  const renderHoldPiece = () => {
    if (!holdPiece) {
      return (
        <div className="w-16 h-16 border border-border rounded bg-muted flex items-center justify-center">
          <span className="text-muted-foreground text-xs">空</span>
        </div>
      );
    }

    const { shape } = holdPiece.type;
    const cellSize = 12;

    // 计算方块的边界框
    let minRow = shape.length, maxRow = -1;
    let minCol = shape[0].length, maxCol = -1;
    
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] !== 0) {
          minRow = Math.min(minRow, row);
          maxRow = Math.max(maxRow, row);
          minCol = Math.min(minCol, col);
          maxCol = Math.max(maxCol, col);
        }
      }
    }

    const pieceWidth = maxCol - minCol + 1;
    const pieceHeight = maxRow - minRow + 1;

    return (
      <div className={`p-2 bg-muted rounded border border-border ${!canHold ? 'opacity-50' : ''}`}>
        <div 
          className="flex justify-center items-center"
          style={{ 
            width: Math.max(64, pieceWidth * cellSize),
            height: Math.max(48, pieceHeight * cellSize)
          }}
        >
          <div 
            className="relative"
            style={{
              width: pieceWidth * cellSize,
              height: pieceHeight * cellSize,
              display: 'grid',
              gridTemplateColumns: `repeat(${pieceWidth}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${pieceHeight}, ${cellSize}px)`,
            }}
          >
            {shape.slice(minRow, maxRow + 1).map((row, rowIndex) =>
              row.slice(minCol, maxCol + 1).map((cell, colIndex) => {
                if (cell === 0) {
                  return <div key={`${rowIndex}-${colIndex}`} />;
                }
                
                const color = getColorByTypeId(cell);
                const blockStyle = currentSkin.getBlockStyle(color, false);
                const blockClass = currentSkin.getBlockClass(color, false);
                
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`${blockClass} ${!canHold ? 'grayscale' : ''}`}
                    style={{
                      ...blockStyle,
                      width: cellSize,
                      height: cellSize,
                      opacity: canHold ? 1 : 0.6,
                      filter: !canHold ? 'brightness(0.7) saturate(0.5)' : 'none'
                    }}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="game-panel-light p-3 rounded-lg">
      <h3 className="text-foreground text-sm font-bold mb-2 text-center">HOLD</h3>
      <div className="flex justify-center">
        {renderHoldPiece()}
      </div>
      {!canHold && (
        <p className="text-destructive text-xs text-center mt-1">已使用</p>
      )}
    </div>
  );
};

export default HoldPieceDisplay;
