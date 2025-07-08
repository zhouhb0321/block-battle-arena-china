
import React from 'react';
import { TETROMINO_TYPES } from '@/utils/tetrisLogic';
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
    // 使用柔和的颜色
    const pieceColors = {
      I: '#4a9d9c', // 柔和的青色
      O: '#c4a661', // 柔和的黄色
      T: '#8b6bb1', // 柔和的紫色
      S: '#6b9b6b', // 柔和的绿色
      Z: '#b87575', // 柔和的红色  
      J: '#5d7fb8', // 柔和的蓝色
      L: '#c4906b'  // 柔和的橙色
    };

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
                  backgroundColor: cell ? pieceColors[piece.type as keyof typeof pieceColors] : 'transparent'
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
