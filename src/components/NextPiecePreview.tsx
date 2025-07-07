
import React from 'react';
import PiecePreview from './PiecePreview';
import type { GamePiece } from '@/utils/gameTypes';

interface NextPiecePreviewProps {
  nextPieces: GamePiece[];
  compact?: boolean;
}

const NextPiecePreview: React.FC<NextPiecePreviewProps> = ({ 
  nextPieces, 
  compact = false 
}) => {
  const displayCount = compact ? 3 : 4;
  const pieceSize = compact ? 20 : 24;

  return (
    <div className={`bg-gray-900 p-3 rounded-lg border border-gray-700 ${compact ? 'w-20' : 'w-24'}`}>
      <h3 className="text-white text-sm font-bold mb-2 text-center">NEXT</h3>
      <div className="space-y-2">
        {nextPieces.slice(0, displayCount).map((piece, index) => (
          <div 
            key={index} 
            className={`flex justify-center ${compact ? 'p-1' : 'p-2'} ${
              index === 0 ? 'bg-gray-800 rounded' : ''
            }`}
          >
            <PiecePreview 
              tetromino={piece.type} 
              size={pieceSize}
              opacity={index === 0 ? 1 : 0.7}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NextPiecePreview;
