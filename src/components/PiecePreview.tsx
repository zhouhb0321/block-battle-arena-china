
import React from 'react';
import { TETROMINO_TYPES } from '@/utils/tetrisLogic';
import { getTetrominoColor } from '@/utils/blockColors';
import type { TetrominoType } from '@/utils/gameTypes';

interface PiecePreviewProps {
  piece: TetrominoType | null;
  title: string;
  size?: 'small' | 'medium' | 'large';
  cellSize?: number;
}

const PiecePreview: React.FC<PiecePreviewProps> = ({ 
  piece, 
  title, 
  size = 'medium',
  cellSize 
}) => {
  const getCellSize = () => {
    if (cellSize) return cellSize;
    switch (size) {
      case 'small': return 15;
      case 'medium': return 20;
      case 'large': return 25;
      default: return 20;
    }
  };

  const actualCellSize = getCellSize();

  const renderPiece = () => {
    if (!piece) {
      return (
        <div 
          className="bg-gray-700 border border-gray-600 rounded"
          style={{ 
            width: actualCellSize * 4, 
            height: actualCellSize * 2 
          }}
        />
      );
    }

    const shape = TETROMINO_TYPES[piece.type]?.shape || piece.shape;
    const backgroundColor = getTetrominoColor(piece.type);

    return (
      <div className="relative">
        {shape.map((row, y) => (
          <div key={y} className="flex">
            {row.map((cell, x) => (
              <div
                key={x}
                className={`border border-gray-800 ${
                  cell ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  width: actualCellSize,
                  height: actualCellSize,
                  backgroundColor: cell ? backgroundColor : 'transparent'
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-800 p-3 rounded-lg">
      {title && (
        <h3 className="text-white text-xs mb-2 text-center font-bold">
          {title}
        </h3>
      )}
      <div className="flex justify-center items-center min-h-[40px]">
        {renderPiece()}
      </div>
    </div>
  );
};

export default PiecePreview;
