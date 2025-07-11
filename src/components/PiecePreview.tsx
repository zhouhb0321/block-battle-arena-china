
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
      case 'small': return 12;
      case 'medium': return 16;
      case 'large': return 20;
      default: return 16;
    }
  };

  const actualCellSize = getCellSize();

  const renderPiece = () => {
    if (!piece) {
      return (
        <div 
          className="bg-gray-700/30 border border-gray-600 rounded-sm"
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
                className={`border-0 ${
                  cell ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  width: actualCellSize,
                  height: actualCellSize,
                  backgroundColor: cell ? backgroundColor : 'transparent',
                  borderRadius: '2px',
                  margin: '0.5px',
                  boxShadow: cell ? 'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.15)' : 'none'
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-2 rounded-lg">
      {title && (
        <h3 className="text-white text-xs mb-2 text-center font-bold opacity-90">
          {title}
        </h3>
      )}
      <div className="flex justify-center items-center min-h-[32px]">
        {renderPiece()}
      </div>
    </div>
  );
};

export default PiecePreview;
