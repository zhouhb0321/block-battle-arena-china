
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
    small: { container: 'w-20 h-16', cell: 'w-3 h-3' },
    medium: { container: 'w-32 h-20', cell: 'w-4 h-4' },
    large: { container: 'w-40 h-24', cell: 'w-5 h-5' }
  };

  const { container, cell } = sizeMap[size];

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-white text-sm mb-2 text-center font-bold">{title}</h3>
      <div className={`${container} bg-black border border-gray-600 flex items-center justify-center rounded`}>
        {piece && (
          <div 
            className="grid gap-1" 
            style={{ gridTemplateColumns: `repeat(${piece.shape[0].length}, 1fr)` }}
          >
            {piece.shape.map((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${y}-${x}`}
                  className={`${cell} ${cell ? 'opacity-100' : 'opacity-0'} border border-white border-opacity-20 rounded-sm`}
                  style={{ backgroundColor: cell ? piece.color : 'transparent' }}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PiecePreview;
