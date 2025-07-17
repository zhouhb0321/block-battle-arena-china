
import React from 'react';
import { getBlockColor } from '@/utils/blockColors';
import { useUserSettings } from '@/hooks/useUserSettings';
import type { GamePiece } from '@/utils/gameTypes';
import AchievementDisplay from './AchievementDisplay';

interface HoldPieceDisplayProps {
  holdPiece: GamePiece | null;
  canHold: boolean;
}

const HoldPieceDisplay: React.FC<HoldPieceDisplayProps> = ({ holdPiece, canHold }) => {
  const { settings } = useUserSettings();
  const cellSize = 30; // Dynamic size based on game mode

  const renderHoldPiece = () => {
    if (!holdPiece) {
      return (
        <div className="w-20 h-16 border border-border rounded bg-muted flex items-center justify-center">
          <span className="text-muted-foreground text-xs">空</span>
        </div>
      );
    }

    const { shape } = holdPiece.type;

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
      <div className={`p-3 bg-muted rounded border border-border ${!canHold ? 'opacity-50' : ''}`}>
        <div 
          className="flex justify-center items-center"
          style={{ 
            width: Math.max(84, pieceWidth * cellSize),
            height: Math.max(84, pieceHeight * cellSize)
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
                
                const color = getBlockColor(holdPiece.type.type);
                
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`guideline-block ${!canHold ? 'grayscale' : ''}`}
                    style={{
                      backgroundColor: color,
                      border: '2px solid #333',
                      borderRadius: '2px',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 2px rgba(0,0,0,0.2)',
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
    <div className="p-3 rounded-lg w-32">
      <h3 className="text-foreground text-xs font-bold mb-3 text-center">HOLD</h3>
      <div className="flex justify-center">
        {renderHoldPiece()}
      </div>
      {!canHold && (
        <p className="text-destructive text-xs text-center mt-2">Used</p>
      )}
      
      {/* Achievement Display Area */}
      <AchievementDisplay className="w-full mt-3" />
    </div>
  );
};

export default HoldPieceDisplay;
