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

// 时间格式化为 mm:ss.SSS
const formatMs = (ms: number) => {
  const totalMs = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const milliseconds = totalMs % 1000;
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

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
  const [displayTimeMs, setDisplayTimeMs] = useState(0);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const handleAchievementComplete = useCallback((id: string) => {
    gameLogic.removeAchievement?.(id);
  }, [gameLogic]);

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
    return 'bg-transparent';
  };

  const getPanelThemeClasses = () => {
    return 'bg-background/40 border-border/60 backdrop-blur-sm';
  };

  const remainingTimeMs = gameMode.isTimeAttack && gameMode.timeLimit ? Math.max(0, gameMode.timeLimit * 1000 - displayTimeMs) : null;

  useEffect(() => {
    let animationFrameId: number;

    const updateTimer = () => {
      if (gameLogic.gameStarted && !gameLogic.isPaused && !gameLogic.gameOver) {
        const elapsedMs = Date.now() - gameLogic.gameStartTime.current;
        setDisplayTimeMs(elapsedMs);
      }
      animationFrameId = requestAnimationFrame(updateTimer);
    };

    animationFrameId = requestAnimationFrame(updateTimer);

    return () => cancelAnimationFrame(animationFrameId);
  }, [gameLogic.gameStarted, gameLogic.isPaused, gameLogic.gameOver, gameLogic.gameStartTime]);

  return (
    <div
      ref={gameContainerRef}
      className={`min-h-screen p-4 flex flex-col items-center justify-center ${getThemeClasses()}`}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      <GameMusicManager 
        isGameActive={gameLogic.gameStarted}
        isGamePaused={gameLogic.isPaused} 
      />
      <BackgroundWallpaper>
        <div className="flex justify-center items-start p-4 gap-4">
          <div className="w-48 flex flex-col gap-4 h-full">
            <div className={`p-3 rounded-lg border ${getPanelThemeClasses()}`}>
              <HoldPieceDisplay
                holdPiece={gameLogic.holdPiece}
                canHold={gameLogic.canHold}
              />
            </div>
            <div className="flex-grow">
              <AchievementDisplay
                achievements={gameLogic.achievements || []}
                onAchievementComplete={handleAchievementComplete}
              />
            </div>
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
                  <div>攻击(APM):</div>
                  <div className="font-mono text-right">{gameLogic.apm.toFixed(1)}</div>
                  <div>{gameMode.isTimeAttack ? '剩余:' : '时间:'}</div>
                  <div className="font-mono text-right flex items-center justify-end gap-2">
                    {gameMode.isTimeAttack && gameMode.timeLimit && (
                      <svg className="w-5 h-5" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="4"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="4"
                          strokeDasharray={`${((remainingTimeMs || 0) / (gameMode.timeLimit * 1000)) * 100}, 100`}
                        />
                      </svg>
                    )}
                    <span>
                      {gameMode.isTimeAttack && gameMode.timeLimit
                        ? formatMs(remainingTimeMs || 0)
                        : formatMs(displayTimeMs)}
                    </span>
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
            {remainingTimeMs !== null && remainingTimeMs <= 10000 && remainingTimeMs > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-8xl font-bold text-red-500/80 animate-ping">
                  {Math.ceil((remainingTimeMs || 0) / 1000)}
                </div>
              </div>
            )}
          </div>
          <div className="w-48">
            <div className={`p-3 rounded-lg border ${getPanelThemeClasses()}`}>
              <NextPiecePreview
                nextPieces={gameLogic.nextPieces}
                compact={false}
              />
            </div>
          </div>
        </div>
      </BackgroundWallpaper>
    </div>
  );
};

export default SinglePlayerGameArea;
