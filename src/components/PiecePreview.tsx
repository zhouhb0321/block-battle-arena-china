
import React from 'react';
import { TETROMINO_TYPES } from '@/utils/tetrisLogic';
import { getTetrominoColor } from '@/utils/blockColors';
import { getCurrentSkin } from '@/utils/blockSkins';
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
  const currentSkin = getCurrentSkin(settings.blockSkin || 'wood');

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

    const shape = piece.shape;
    const backgroundColor = piece.color;

    return (
      <div className="relative">
        {shape.map((row, y) => (
          <div key={y} className="flex">
            {row.map((cell, x) => {
              if (!cell) {
                return <div key={x} style={{ width: actualCellSize, height: actualCellSize }} />;
              }

              const blockStyle = currentSkin.getBlockStyle(backgroundColor, false);
              const blockClass = currentSkin.getBlockClass(backgroundColor, false);

              return (
                <div
                  key={x}
                  className={`${blockClass} border-0`}
                  style={{
                    ...blockStyle,
                    width: actualCellSize,
                    height: actualCellSize,
                    margin: '0.5px',
                  }}
                />
              );
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
