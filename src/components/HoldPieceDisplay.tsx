
import React from 'react';
import type { GamePiece } from '@/utils/gameTypes';

interface HoldPieceDisplayProps {
  holdPiece: GamePiece | null;
  canHold: boolean;
}

const HoldPieceDisplay: React.FC<HoldPieceDisplayProps> = ({ holdPiece, canHold }) => {
  const renderHoldPiece = () => {
    if (!holdPiece) {
      return (
        <div className="w-16 h-16 border border-gray-600 rounded bg-gray-800 flex items-center justify-center">
          <span className="text-gray-500 text-xs">空</span>
        </div>
      );
    }

    const { shape, color } = holdPiece.type;
    const cellSize = 3;

    return (
      <div className={`p-1 bg-gray-800 rounded border border-gray-600 ${!canHold ? 'opacity-50' : ''}`}>
        <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(4, ${cellSize * 4}px)` }}>
          {shape.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`w-3 h-3 ${cell ? `bg-${color}-500` : 'bg-transparent'}`}
                style={{
                  backgroundColor: cell ? (canHold ? color : `${color}80`) : 'transparent',
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
      <h3 className="text-white text-sm font-bold mb-2 text-center">HOLD</h3>
      <div className="flex justify-center">
        {renderHoldPiece()}
      </div>
      {!canHold && (
        <p className="text-red-400 text-xs text-center mt-1">已使用</p>
      )}
    </div>
  );
};

export default HoldPieceDisplay;
