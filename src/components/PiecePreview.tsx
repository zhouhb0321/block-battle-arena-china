
import React from 'react';
import { TETROMINO_TYPES } from '@/utils/tetrisLogic';
import { getBlockStyle } from '@/utils/blockRenderer';
import { useUserSettings } from '@/hooks/useUserSettings';
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
  const { settings } = useUserSettings();
  // 统一cellSize为20
  const actualCellSize = 20;

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
    const pieceType = piece.type;

    return (
      <div className="relative">
        {shape.map((row, y) => (
          <div key={y} className="flex">
            {row.map((cell, x) => {
              if (cell) {
                const { style, className } = getBlockStyle(
                  pieceType,
                  { cellSize: actualCellSize },
                  settings
                );
                return (
                  <div
                    key={`${y}-${x}`}
                    className={className}
                    style={style}
                  />
                );
              } else {
                return (
                  <div
                    key={`${y}-${x}`}
                    className="opacity-0"
                    style={{
                      width: actualCellSize,
                      height: actualCellSize,
                    }}
                  />
                );
              }
            })}
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
