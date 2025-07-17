
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
  const displayCount = compact ? 4 : 5;
  const cellSize = 42; // Unified size with game board

  return (
    <div className={`p-3 rounded-lg ${compact ? 'w-56' : 'w-full'}`}>
      <h3 className="text-foreground text-xs font-bold mb-3 text-center">NEXT</h3>
      <div className="space-y-2">
        {nextPieces.slice(0, displayCount).map((piece, index) => (
          <div 
            key={index} 
            className={`flex justify-center ${compact ? 'p-1' : 'p-2'} ${
              index === 0 ? 'bg-muted/50 rounded' : ''
            }`}
          >
            <PiecePreview 
              piece={piece.type} 
              title=""
              cellSize={cellSize}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NextPiecePreview;
