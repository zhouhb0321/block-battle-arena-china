
import React from 'react';
import { getBlockColor } from '@/utils/blockColors';
import { PIECE_SHAPES } from '@/utils/pieceGeneration';
import type { TetrominoType } from '@/utils/gameTypes';

interface PiecePreviewProps {
  piece: TetrominoType | null;
  title?: string;
  cellSize?: number;
  size?: 'small' | 'medium' | 'large'; // For backward compatibility
}

const PiecePreview: React.FC<PiecePreviewProps> = ({ 
  piece, 
  title, 
  cellSize = 30 // Dynamic size based on game mode
}) => {
  if (!piece) {
    return (
      <div className="w-20 h-16 border border-border rounded bg-muted flex items-center justify-center">
        <span className="text-muted-foreground text-xs">空</span>
      </div>
    );
  }

  const shape = PIECE_SHAPES[piece.type] || piece.shape;
  const color = getBlockColor(piece.type);

  // Calculate bounding box
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
    <div className="flex flex-col items-center">
      {title && (
        <h4 className="text-xs font-bold text-foreground mb-2">{title}</h4>
      )}
      <div 
        className="flex justify-center items-center"
        style={{ 
          width: Math.max(cellSize * 4, pieceWidth * cellSize),
          height: Math.max(cellSize * 2, pieceHeight * cellSize)
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
            row.slice(minCol, maxCol + 1).map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="guideline-block"
                style={{
                  backgroundColor: cell === 1 ? color : 'transparent',
                  border: cell === 1 ? '2px solid #333' : 'none',
                  borderRadius: cell === 1 ? '2px' : '0',
                  boxShadow: cell === 1 ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 2px rgba(0,0,0,0.2)' : 'none',
                  width: cellSize,
                  height: cellSize,
                  boxSizing: 'border-box',
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PiecePreview;
