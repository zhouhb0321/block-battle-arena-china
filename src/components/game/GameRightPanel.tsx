
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import NextPiecePreview from '@/components/NextPiecePreview';
import type { GamePiece } from '@/utils/gameTypes';

interface GameRightPanelProps {
  nextPieces: GamePiece[];
}

const GameRightPanel: React.FC<GameRightPanelProps> = ({
  nextPieces
}) => {
  const { actualTheme } = useTheme();

  const getPanelThemeClasses = () => {
    return actualTheme === 'light' 
      ? 'bg-white border-gray-300' 
      : 'bg-gray-900 border-gray-700';
  };

  return (
    <div className="lg:w-44">
      <div className={`p-3 rounded-lg border ${getPanelThemeClasses()}`}>
        <NextPiecePreview 
          nextPieces={nextPieces} 
          compact={false}
        />
      </div>
    </div>
  );
};

export default GameRightPanel;
