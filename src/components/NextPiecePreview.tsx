
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
  const displayCount = compact ? 3 : 5;
  const pieceSize = compact ? 20 : 28;

  return (
    <div className={`${compact ? 'w-24' : 'w-full'}`}>
      <h3 className="text-sm font-bold mb-3 text-center">NEXT</h3>
      <div className="space-y-3">
        {nextPieces.slice(0, displayCount).map((piece, index) => (
          <div 
            key={index} 
            className={`flex justify-center ${compact ? 'p-1' : 'p-2'} ${
              index === 0 ? 'bg-gray-800 rounded' : ''
            }`}
          >
            <PiecePreview 
              piece={piece.type} 
              title=""
              cellSize={pieceSize}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NextPiecePreview;
