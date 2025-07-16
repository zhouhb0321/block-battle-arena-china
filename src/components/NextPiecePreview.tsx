
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
    <div className={`p-2 rounded-lg ${compact ? 'w-28' : 'w-full'}`}>
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
              cellSize={compact ? 12 : 20}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NextPiecePreview;
