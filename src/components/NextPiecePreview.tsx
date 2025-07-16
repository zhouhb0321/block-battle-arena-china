
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
  const pieceSize = compact ? 20 : 28;

  return (
    <div className={`p-2 rounded-lg ${compact ? 'w-24' : 'w-full'}`}>
      <h3 className="text-foreground text-xs font-bold mb-2 text-center">NEXT</h3>
      <div className="space-y-1">
        {nextPieces.slice(0, displayCount).map((piece, index) => (
          <div 
            key={index} 
            className={`flex justify-center ${compact ? 'p-0.5' : 'p-1'} ${
              index === 0 ? 'bg-muted/50 rounded' : ''
            }`}
          >
            <PiecePreview 
              piece={piece.type} 
              title=""
              cellSize={compact ? 10 : 20}  // Smaller cells for compact mode
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NextPiecePreview;
