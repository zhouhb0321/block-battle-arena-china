
import React from 'react';
import { PIECE_SHAPES } from '@/utils/tetrisLogic';
import type { PieceType } from '@/utils/gameTypes';

interface PiecePreviewProps {
  piece: PieceType | null;
  title: string;
  size?: 'small' | 'medium' | 'large';
  cellSize?: number; // 新增：允许自定义方块大小
}

const PiecePreview: React.FC<PiecePreviewProps> = ({ 
  piece, 
  title, 
  size = 'medium',
  cellSize 
}) => {
  // 根据size确定方块大小，优先使用传入的cellSize
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

    const shape = PIECE_SHAPES[piece][0];
    const pieceColors = {
      I: '#00f0f0',
      O: '#f0f000',
      T: '#a000f0',
      S: '#00f000',
      Z: '#f00000',
      J: '#0000f0',
      L: '#f0a000'
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
                  backgroundColor: cell ? pieceColors[piece] : 'transparent'
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
