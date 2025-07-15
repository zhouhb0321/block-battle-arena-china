
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import EnhancedGameBoard from '@/components/EnhancedGameBoard';
import GameCountdownInArea from '@/components/GameCountdownInArea';
import OutOfFocusOverlay from '@/components/OutOfFocusOverlay';
import type { Board, GamePiece } from '@/utils/gameTypes';

interface GameCentralAreaProps {
  board: Board;
  currentPiece: GamePiece | null;
  ghostPiece: GamePiece | null;
  cellSize: number;
  gameStarted: boolean;
  showCountdown: boolean;
  showOutOfFocusOverlay: boolean;
  onCountdownComplete: () => void;
  onResumeFromOverlay: () => void;
}

const GameCentralArea: React.FC<GameCentralAreaProps> = ({
  board,
  currentPiece,
  ghostPiece,
  cellSize,
  gameStarted,
  showCountdown,
  showOutOfFocusOverlay,
  onCountdownComplete,
  onResumeFromOverlay
}) => {
  const { actualTheme } = useTheme();

  const getBoardThemeClasses = () => {
    return actualTheme === 'light' 
      ? 'bg-white border-gray-300' 
      : 'bg-gray-800 border-gray-600';
  };

  return (
    <div className="relative flex-shrink-0">
      <div className={`p-4 rounded-lg border ${getBoardThemeClasses()}`}>
        <EnhancedGameBoard
          board={board as number[][]}
          currentPiece={currentPiece}
          ghostPiece={ghostPiece}
          cellSize={cellSize}
        />
      </div>
      
      {/* 倒计时覆盖层 */}
      {gameStarted && showCountdown && (
        <GameCountdownInArea
          initialCount={3}
          onComplete={onCountdownComplete}
          isVisible={true}
        />
      )}
      
      {/* 失焦覆盖层 */}
      <OutOfFocusOverlay 
        show={showOutOfFocusOverlay}
        onResume={onResumeFromOverlay}
      />
    </div>
  );
};

export default GameCentralArea;
