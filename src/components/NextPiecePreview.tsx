
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
  const displayCount = compact ? 4 : 5;  // Show 4 pieces in compact mode
  const pieceSize = compact ? 40 : 56;

  return (
    <div className={`p-2 rounded-lg ${compact ? 'w-48' : 'w-full'}`}>
      <h3 className="text-foreground text-xs font-bold mb-2 text-center">NEXT</h3>
      <div className="space-y-1">
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
              cellSize={compact ? 20 : 40}  // Doubled cell size
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NextPiecePreview;
