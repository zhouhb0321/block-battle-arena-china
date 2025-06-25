
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
    small: { container: 'w-20 h-16', cell: 'w-3 h-3', text: 'text-xs' },
    medium: { container: 'w-28 h-20', cell: 'w-4 h-4', text: 'text-sm' },
    large: { container: 'w-36 h-24', cell: 'w-5 h-5', text: 'text-base' }
  };

  const { container, cell, text } = sizeMap[size];

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
              transform: 'scale(0.9)' // 稍微缩小以提供更好的边距
            }}
          >
            {piece.shape.map((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${y}-${x}`}
                  className={`${cell} ${cell ? 'opacity-100' : 'opacity-0'} rounded-sm transition-all duration-200`}
                  style={{ 
                    backgroundColor: cell ? piece.color : 'transparent',
                    width: size === 'small' ? '10px' : size === 'medium' ? '12px' : '14px',
                    height: size === 'small' ? '10px' : size === 'medium' ? '12px' : '14px',
                    boxShadow: cell ? '0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none'
                  }}
                />
              ))
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
