
import React from 'react';
import { TetrominoType } from '@/contexts/GameContext';

interface PiecePreviewProps {
  piece: TetrominoType | null;
  title: string;
  size?: 'small' | 'medium' | 'large';
}

const PiecePreview: React.FC<PiecePreviewProps> = ({ 
  piece, 
  title, 
  size = 'medium' 
}) => {
  const sizeMap = {
    small: { container: 'w-20 h-16', cellSize: 10, text: 'text-xs' },
    medium: { container: 'w-28 h-20', cellSize: 12, text: 'text-sm' },
    large: { container: 'w-36 h-24', cellSize: 14, text: 'text-base' }
  };

  const { container, cellSize, text } = sizeMap[size];

  const drawBlock = (color: string, key: string) => (
    <div
      key={key}
      className="rounded-sm transition-all duration-200"
      style={{ 
        backgroundColor: color,
        width: `${cellSize}px`,
        height: `${cellSize}px`,
        boxShadow: '0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}
    />
  );

  return (
    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 shadow-lg">
      {title && (
        <h3 className={`text-white ${text} mb-2 text-center font-bold tracking-wide`}>
          {title}
        </h3>
      )}
      <div className={`${container} bg-gray-900 border border-gray-600 flex items-center justify-center rounded shadow-inner relative`}>
        {piece ? (
          <div 
            className="grid gap-0.5" 
            style={{ 
              gridTemplateColumns: `repeat(${piece.shape[0].length}, 1fr)`,
              transform: 'scale(0.9)'
            }}
          >
            {piece.shape.map((row, y) =>
              row.map((cell, x) => 
                cell ? drawBlock(piece.color, `${y}-${x}`) : (
                  <div
                    key={`${y}-${x}`}
                    style={{ 
                      width: `${cellSize}px`,
                      height: `${cellSize}px` 
                    }}
                  />
                )
              )
            )}
          </div>
        ) : (
          <div className="text-gray-600 text-xs text-center">
            空
          </div>
        )}
      </div>
    </div>
  );
};

export default PiecePreview;
