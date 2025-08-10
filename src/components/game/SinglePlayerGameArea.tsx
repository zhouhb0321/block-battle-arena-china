import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import GameCountdownInArea from '@/components/GameCountdownInArea';
import EnhancedGameBoard from '@/components/EnhancedGameBoard';
import HoldPieceDisplay from '@/components/HoldPieceDisplay';
import NextPiecePreview from '@/components/NextPiecePreview';
import OutOfFocusOverlay from '@/components/OutOfFocusOverlay';
import AchievementDisplay from '@/components/AchievementDisplay';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pause, Play, Undo2, Redo2 } from 'lucide-react';
import { useTetrisGame } from './TetrisGameProvider';
import GameMusicManager from '@/components/GameMusicManager';
import BackgroundWallpaper from '@/components/BackgroundWallpaper';

interface SinglePlayerGameAreaProps {
  onActualGameStart?: () => void;
}

const SinglePlayerGameArea: React.FC<SinglePlayerGameAreaProps> = ({
  onActualGameStart
}) => {
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const { gameLogic, gameSettings, gameMode } = useTetrisGame();
  
  const [showCountdown, setShowCountdown] = useState(true);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const handleCountdownComplete = () => {
    setShowCountdown(false);
    gameLogic.startGame();
    onActualGameStart?.();
    if (gameContainerRef.current) {
      gameContainerRef.current.focus();
    }
  };

  useEffect(() => {
    if (!gameLogic.gameInitialized) {
      gameLogic.initializeForCountdown();
    }
  }, [gameLogic]);

  const getThemeClasses = () => {
    return actualTheme === 'light' 
      ? 'bg-gray-50 text-gray-900' 
      : 'bg-gray-900 text-white';
  };

  const getBoardThemeClasses = () => {
    return actualTheme === 'light' 
      ? 'bg-gray-200' // 不透明背景
      : 'bg-gray-900'; // 不透明背景
  };

  const getPanelThemeClasses = () => {
    return 'bg-background/40 border-border/60 backdrop-blur-sm';
  };

  const remainingTime = gameMode.isTimeAttack && gameMode.timeLimit ? Math.max(0, gameMode.timeLimit - gameLogic.time) : null;

  return (
    <BackgroundWallpaper>
      <GameMusicManager 
        isGameActive={gameLogic.gameStarted}
        isGamePaused={gameLogic.isPaused} 
      />
      <div 
        ref={gameContainerRef}
        className={`min-h-screen p-4 ${getThemeClasses()}`}
        tabIndex={0}
        style={{ outline: 'none' }}
      >
        <div className="mb-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* Controls are now handled by GameKeyboardHandler and the provider */}
          </div>

          
          {/* 成就显示区域 - 移到Hold区下方，无额外边框 */}
          <AchievementDisplay
            achievements={gameLogic.achievements || []}
            onAchievementComplete={handleAchievementComplete}
          />
          
          {/* 游戏信息面板 - 与游戏板底部对齐 */}
          <div className="flex-1 flex flex-col justify-end">
            <div className={`p-4 rounded-lg border ${getPanelThemeClasses()} relative`}>
              <div className="space-y-3">
                <div className="text-center border-b pb-2 mb-3">
                  <div className="font-bold text-lg">
                    {user?.username || user?.email?.split('@')[0] || 'Player'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>得分:</div>
                  <div className="font-mono text-right">{gameLogic.score.toLocaleString()}</div>
                  
                  <div>行数:</div>
                  <div className="font-mono text-right">{gameLogic.lines}</div>
                  
                  <div>等级:</div>
                  <div className="font-mono text-right">{gameLogic.level}</div>
                  
                  <div>PPS:</div>
                  <div className="font-mono text-right">{gameLogic.pps.toFixed(2)}</div>
                  
                  <div>攻击:</div>
                  <div className="font-mono text-right">{gameLogic.apm.toFixed(1)}</div>
                  
                  <div>时间:</div>
                  <div className="font-mono text-right">
                    {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>得分:</div>
                    <div className="font-mono text-right">{gameLogic.score.toLocaleString()}</div>
                    <div>行数:</div>
                    <div className="font-mono text-right">{gameLogic.lines}</div>
                    <div>等级:</div>
                    <div className="font-mono text-right">{gameLogic.level}</div>
                    <div>PPS:</div>
                    <div className="font-mono text-right">{gameLogic.pps.toFixed(2)}</div>
                    <div>攻击:</div>
                    <div className="font-mono text-right">{gameLogic.apm.toFixed(1)}</div>
                    <div>{gameMode.isTimeAttack ? '剩余:' : '时间:'}</div>
                    <div className="font-mono text-right">
                      {gameMode.isTimeAttack && gameMode.timeLimit
                        ? `${Math.floor((remainingTime || 0) / 60)}:${((remainingTime || 0) % 60).toString().padStart(2, '0')}`
                        : `${Math.floor(gameLogic.time / 60)}:${(gameLogic.time % 60).toString().padStart(2, '0')}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className={`p-4 rounded-lg border ${getBoardThemeClasses()}`}>
              <EnhancedGameBoard
                board={gameLogic.board}
                currentPiece={gameLogic.currentPiece}
                ghostPiece={gameLogic.ghostPiece || null}
                cellSize={32}
              />
            </div>
            {showCountdown && (
              <GameCountdownInArea
                initialCount={3}
                onComplete={handleCountdownComplete}
                isVisible={true}
              />
            )}
            <OutOfFocusOverlay
              show={gameLogic.isPaused && gameLogic.gameStarted && !gameLogic.gameOver}
              onResume={gameLogic.resumeGame}
            />
          </div>
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
    </BackgroundWallpaper>
  );
};

export default SinglePlayerGameArea;
