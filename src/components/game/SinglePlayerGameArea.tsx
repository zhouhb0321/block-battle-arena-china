
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionLogger } from '@/hooks/useSessionLogger';
import { useTheme } from '@/contexts/ThemeContext';
import GameCountdownInArea from '@/components/GameCountdownInArea';
import EnhancedGameBoard from '@/components/EnhancedGameBoard';
import HoldPieceDisplay from '@/components/HoldPieceDisplay';
import NextPiecePreview from '@/components/NextPiecePreview';
import GameInfo from '@/components/GameInfo';
import LineCleanAnimation from '@/components/LineCleanAnimation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useGameLogic } from '@/hooks/useGameLogic';
import type { GameMode } from '@/utils/gameTypes';

interface SinglePlayerGameAreaProps {
  gameMode: GameMode;
  onGameEnd: (finalStats: any) => void;
  onBackToMenu?: () => void;
}

const SinglePlayerGameArea: React.FC<SinglePlayerGameAreaProps> = ({
  gameMode,
  onGameEnd,
  onBackToMenu
}) => {
  const { user } = useAuth();
  const { logUserSession } = useSessionLogger();
  const { actualTheme } = useTheme();
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
    console.log('Countdown completed, starting game...');
    setShowCountdown(false);
    setGameStarted(true);
    
    // 调用游戏逻辑的开始函数
    gameLogic.startGame();
    
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

  // 获取主题相关的背景色
  const getThemeClasses = () => {
    return actualTheme === 'light' 
      ? 'bg-gray-50 text-gray-900' 
      : 'bg-gray-900 text-white';
  };

  const getBoardThemeClasses = () => {
    return actualTheme === 'light' 
      ? 'bg-white border-gray-300' 
      : 'bg-gray-800 border-gray-600';
  };

  const getPanelThemeClasses = () => {
    return actualTheme === 'light' 
      ? 'bg-white border-gray-300' 
      : 'bg-gray-900 border-gray-700';
  };

  return (
    <div className={`min-h-screen p-4 ${getThemeClasses()}`}>
      {/* 返回按钮 */}
      {onBackToMenu && (
        <div className="mb-4">
          <Button
            onClick={onBackToMenu}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回菜单
          </Button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 items-start justify-center">
        {/* Left side: Hold area and Game Info */}
        <div className="flex flex-col gap-4 lg:w-48">
          <div className={`p-3 rounded-lg border ${getPanelThemeClasses()}`}>
            <HoldPieceDisplay 
              holdPiece={gameLogic.holdPiece} 
              canHold={gameLogic.canHold}
            />
          </div>
          
          {/* Game Info moved below Hold area */}
          <div className="relative">
            <GameInfo 
              username={user?.username || 'Player'}
              score={gameLogic.score}
              lines={gameLogic.lines}
              level={gameLogic.level}
              pps={gameLogic.pps}
              attack={gameLogic.apm}
              paused={gameLogic.isPaused}
              gameStarted={gameStarted}
              onPause={() => gameLogic.isPaused ? gameLogic.resumeGame() : gameLogic.pauseGame()}
              onShare={() => console.log('Share game')}
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
          <div className={`p-4 rounded-lg border ${getBoardThemeClasses()}`}>
            <EnhancedGameBoard
              board={gameLogic.board}
              currentPiece={gameLogic.currentPiece}
              ghostPiece={gameLogic.ghostPiece}
            />
          </div>
          
          {/* Countdown overlay */}
          <GameCountdownInArea
            initialCount={3}
            onComplete={handleCountdownComplete}
            isVisible={showCountdown}
          />
        </div>

        {/* Right side: Next pieces */}
        <div className="lg:w-40">
          <div className={`p-3 rounded-lg border ${getPanelThemeClasses()}`}>
            <NextPiecePreview nextPieces={gameLogic.nextPieces} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SinglePlayerGameArea;
