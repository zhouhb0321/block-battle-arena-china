
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionLogger } from '@/hooks/useSessionLogger';
import { useTheme } from '@/contexts/ThemeContext';
import { debugLog } from '@/utils/debugLogger';
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
  gameStarted?: boolean;
  onGameEnd: (finalStats: any) => void;
  onBackToMenu?: () => void;
}

const SinglePlayerGameArea: React.FC<SinglePlayerGameAreaProps> = ({
  gameMode,
  gameStarted = false,
  onGameEnd,
  onBackToMenu
}) => {
  const { user } = useAuth();
  const { logUserSession } = useSessionLogger();
  const { actualTheme } = useTheme();
  const [showCountdown, setShowCountdown] = useState(true);
  const [gameReallyStarted, setGameReallyStarted] = useState(false);
  const [animationText, setAnimationText] = useState('');
  const [showAnimation, setShowAnimation] = useState(false);

  const gameLogic = useGameLogic({
    gameMode,
    onGameEnd: (stats) => {
      debugLog.game('Game ended', { stats, gameMode: gameMode.id });
      if (user && !user.isGuest) {
        logUserSession('game_end', gameMode.id, { 
          finalStats: stats,
          gameMode: gameMode.id
        });
      }
      onGameEnd(stats);
    },
    onSpecialClear: (clearType: string, lines: number) => {
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
    debugLog.game('Countdown completed, starting game...');
    setShowCountdown(false);
    setGameReallyStarted(true);
    
    // 启动游戏逻辑
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

  // 当倒计时开始时，立即初始化方块
  useEffect(() => {
    if (gameStarted && showCountdown && !gameLogic.gameInitialized) {
      debugLog.game('Game area ready, initializing pieces for countdown...');
      gameLogic.initializeForCountdown();
    }
  }, [gameStarted, showCountdown, gameLogic]);

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
      {/* 返回菜单按钮 - 放在顶部 */}
      <div className="mb-4 flex justify-between items-center">
        {onBackToMenu && (
          <Button
            onClick={onBackToMenu}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回菜单
          </Button>
        )}
        
        {/* 游戏模式信息 */}
        <div className="text-lg font-semibold">
          {gameMode.displayName}
        </div>
      </div>

      {/* 游戏区域 - 重新布局 */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
        {/* 左侧面板 - Hold区域 */}
        <div className="flex flex-col gap-4 lg:w-48">
          <div className={`p-3 rounded-lg border ${getPanelThemeClasses()}`}>
            <HoldPieceDisplay 
              holdPiece={gameLogic.holdPiece} 
              canHold={gameLogic.canHold}
            />
          </div>
          
          {/* 游戏信息面板 - 与游戏板底部对齐 */}
          <div className="flex-1 flex flex-col justify-end">
            <div className="relative">
              <GameInfo 
                username={user?.username || 'Player'}
                score={gameLogic.score}
                lines={gameLogic.lines}
                level={gameLogic.level}
                pps={gameLogic.pps}
                attack={gameLogic.apm}
                paused={gameLogic.isPaused}
                gameStarted={gameReallyStarted}
                onPause={() => gameLogic.isPaused ? gameLogic.resumeGame() : gameLogic.pauseGame()}
                onShare={() => debugLog.info('Share game functionality')}
              />
              
              <LineCleanAnimation
                isVisible={showAnimation}
                text={animationText}
                onComplete={handleAnimationComplete}
              />
            </div>
          </div>
        </div>

        {/* 中央游戏区域 */}
        <div className="relative">
          <div className={`p-4 rounded-lg border ${getBoardThemeClasses()}`}>
            <EnhancedGameBoard
              board={gameLogic.board}
              currentPiece={gameLogic.currentPiece}
              ghostPiece={gameLogic.ghostPiece}
            />
          </div>
          
          {/* 倒计时覆盖层 */}
          {gameStarted && showCountdown && (
            <GameCountdownInArea
              initialCount={3}
              onComplete={handleCountdownComplete}
              isVisible={true}
            />
          )}
        </div>

        {/* 右侧面板 - NEXT区域 */}
        <div className="lg:w-48">
          <div className={`p-3 rounded-lg border ${getPanelThemeClasses()}`}>
            <NextPiecePreview 
              nextPieces={gameLogic.nextPieces} 
              compact={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SinglePlayerGameArea;
