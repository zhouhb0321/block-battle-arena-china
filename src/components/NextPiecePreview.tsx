
import React from 'react';
import type { GamePiece } from '@/utils/gameTypes';

interface NextPiecePreviewProps {
  nextPieces: GamePiece[];
}

const NextPiecePreview: React.FC<NextPiecePreviewProps> = ({ nextPieces }) => {
  const renderPiece = (piece: GamePiece | null, index: number) => {
    if (!piece) {
      return (
        <div key={index} className="w-16 h-16 border border-gray-600 rounded mb-2 bg-gray-800"></div>
      );
    }

    const { shape, color } = piece.type;
    const cellSize = 3; // 缩小方块大小以适应预览区域

    return (
      <div key={index} className="mb-2 p-1 bg-gray-800 rounded border border-gray-600">
        <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(4, ${cellSize * 4}px)` }}>
          {shape.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`w-3 h-3 ${cell ? `bg-${color}-500` : 'bg-transparent'}`}
                style={{
                  backgroundColor: cell ? color : 'transparent',
                  border: cell ? '1px solid rgba(0,0,0,0.2)' : 'none'
                }}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
      <h3 className="text-white text-sm font-bold mb-2 text-center">NEXT</h3>
      <div className="flex flex-col items-center">
        {[0, 1, 2, 3].map(index => renderPiece(nextPieces[index] || null, index))}
      </div>
    </div>
  );
};

export default NextPiecePreview;
