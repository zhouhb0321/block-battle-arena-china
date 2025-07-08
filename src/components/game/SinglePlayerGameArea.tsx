
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionLogger } from '@/hooks/useSessionLogger';
import GameCountdownInArea from '@/components/GameCountdownInArea';
import EnhancedGameBoard from '@/components/EnhancedGameBoard';
import HoldPieceDisplay from '@/components/HoldPieceDisplay';
import NextPiecePreview from '@/components/NextPiecePreview';
import GameInfo from '@/components/GameInfo';
import LineCleanAnimation from '@/components/LineCleanAnimation';
import { useGameLogic } from '@/hooks/useGameLogic';
import type { GameMode } from '@/utils/gameTypes';

interface SinglePlayerGameAreaProps {
  gameMode: GameMode;
  onGameEnd: (finalStats: any) => void;
}

const SinglePlayerGameArea: React.FC<SinglePlayerGameAreaProps> = ({
  gameMode,
  onGameEnd
}) => {
  const { user } = useAuth();
  const { logUserSession } = useSessionLogger();
  const [showCountdown, setShowCountdown] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [animationText, setAnimationText] = useState('');
  const [showAnimation, setShowAnimation] = useState(false);

  const gameLogic = useGameLogic({
    gameMode,
    onGameEnd: (stats) => {
      if (user && !user.isGuest) {
        logUserSession('game_end', gameMode.id, { 
          finalStats: stats,
          gameMode: gameMode.id
        });
      }
      onGameEnd(stats);
    },
    onSpecialClear: (clearType: string, lines: number) => {
      // Handle special clear animations
      let text = '';
      if (clearType === 'tetris') {
        text = 'TETRIS!';
      } else if (clearType.includes('tspin')) {
        text = clearType.includes('triple') ? 'T-SPIN TRIPLE!' : 
               clearType.includes('double') ? 'T-SPIN DOUBLE!' : 'T-SPIN!';
      } else if (lines >= 4) {
        text = 'TETRIS!';
      }
      
      if (text) {
        setAnimationText(text);
        setShowAnimation(true);
      }
    }
  });

  const handleCountdownComplete = () => {
    setShowCountdown(false);
    setGameStarted(true);
    
    if (user && !user.isGuest) {
      logUserSession('game_start', gameMode.id, { 
        gameMode: gameMode.id,
        startTime: new Date().toISOString()
      });
    }
  };

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    setAnimationText('');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start justify-center min-h-screen p-4">
      {/* Left side: Hold area and Game Info */}
      <div className="flex flex-col gap-4 lg:w-48">
        <HoldPieceDisplay 
          piece={gameLogic.holdPiece} 
          canHold={gameLogic.canHold}
        />
        
        {/* Game Info moved below Hold area */}
        <div className="relative">
          <GameInfo 
            score={gameLogic.score}
            lines={gameLogic.lines}
            level={gameLogic.level}
            time={gameLogic.time}
            pps={gameLogic.pps}
            apm={gameLogic.apm}
            gameMode={gameMode}
          />
          
          {/* Animation positioned below Hold area */}
          <LineCleanAnimation
            isVisible={showAnimation}
            text={animationText}
            onComplete={handleAnimationComplete}
          />
        </div>
      </div>

      {/* Center: Game Board */}
      <div className="relative">
        <EnhancedGameBoard
          board={gameLogic.board}
          currentPiece={gameLogic.currentPiece}
          ghostPiece={gameLogic.ghostPiece}
          gameStarted={gameStarted}
        />
        
        {/* Countdown overlay */}
        <GameCountdownInArea
          initialCount={3}
          onComplete={handleCountdownComplete}
          isVisible={showCountdown}
        />
      </div>

      {/* Right side: Next pieces */}
      <div className="lg:w-48">
        <NextPiecePreview pieces={gameLogic.nextPieces} />
      </div>
    </div>
  );
};

export default SinglePlayerGameArea;
