import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionLogger } from '@/hooks/useSessionLogger';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsiveCellSize } from '@/hooks/useResponsiveCellSize';
import { useGameHistory } from '@/hooks/useGameHistory';
import { debugLog } from '@/utils/debugLogger';
import GameCountdownInArea from '@/components/GameCountdownInArea';
import EnhancedGameBoard from '@/components/EnhancedGameBoard';
import HoldPieceDisplay from '@/components/HoldPieceDisplay';
import NextPiecePreview from '@/components/NextPiecePreview';
import LineCleanAnimation from '@/components/LineCleanAnimation';
import OutOfFocusOverlay from '@/components/OutOfFocusOverlay';
import AchievementAnimation from '@/components/AchievementAnimation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import { useTetrisGame } from './TetrisGameProvider';
import type { GameMode, GameState, GamePiece } from '@/utils/gameTypes';

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
  const { gameLogic, gameSettings } = useTetrisGame();
  const cellSize = useResponsiveCellSize({ minSize: 26, maxSize: 30 });
  const { saveState, undo, redo, canUndo, canRedo, clearHistory } = useGameHistory(50);
  
  const [showCountdown, setShowCountdown] = useState(true);
  const [gameReallyStarted, setGameReallyStarted] = useState(false);
  const [animationText, setAnimationText] = useState('');
  const [showAnimation, setShowAnimation] = useState(false);
  const [achievementText, setAchievementText] = useState<string | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Save game state for undo/redo system
  useEffect(() => {
    if (gameReallyStarted && !gameLogic.gameOver) {
      const completeGameState = {
        board: gameLogic.board,
        currentPiece: gameLogic.currentPiece,
        nextPieces: gameLogic.nextPieces,
        holdPiece: gameLogic.holdPiece,
        canHold: gameLogic.canHold,
        isHolding: false,
        score: gameLogic.score,
        level: gameLogic.level,
        lines: gameLogic.lines,
        gameOver: gameLogic.gameOver,
        paused: gameLogic.isPaused,
        combo: -1,
        b2b: 0,
        pieces: 0,
        attack: 0,
        pps: gameLogic.pps,
        apm: gameLogic.apm,
        startTime: Date.now(),
        endTime: null,
        ghostPiece: gameLogic.ghostPiece,
        clearingLines: []
      };
      saveState(completeGameState);
    }
  }, [gameLogic.board, gameLogic.currentPiece, gameLogic.nextPieces, gameLogic.holdPiece, gameLogic.canHold, gameLogic.score, gameLogic.level, gameLogic.lines, gameLogic.gameOver, gameLogic.isPaused, gameLogic.pps, gameLogic.apm, gameLogic.ghostPiece, gameReallyStarted, saveState]);

  // Achievement detection and animation
  useEffect(() => {
    // Listen for special clears and show achievements
    const checkForAchievements = () => {
      // This would be called from game logic when special clears happen
      // For now, just a placeholder
    };
    
    checkForAchievements();
  }, [gameLogic.lines, gameLogic.score]);

  // Keyboard controls for undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameReallyStarted || gameLogic.gameOver) return;
      
      if (event.ctrlKey) {
        if (event.code === 'KeyZ' && canUndo) {
          event.preventDefault();
          const previousState = undo();
          if (previousState) {
            // Apply previous state to game logic
            // This would need to be implemented in the game logic
            debugLog.game('Undo performed');
          }
        } else if (event.code === 'KeyX' && canRedo) {
          event.preventDefault();
          const nextState = redo();
          if (nextState) {
            // Apply next state to game logic
            debugLog.game('Redo performed');
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [gameReallyStarted, gameLogic.gameOver, canUndo, canRedo, undo, redo]);

  const handleCountdownComplete = () => {
    debugLog.game('Countdown completed, starting game...');
    setShowCountdown(false);
    setGameReallyStarted(true);
    clearHistory(); // Clear any previous history
    
    gameLogic.startGame();
    
    if (user && !user.isGuest) {
      logUserSession('game_start', gameMode.id, { 
        gameMode: gameMode.id,
        startTime: new Date().toISOString()
      });
    }

    if (gameContainerRef.current) {
      gameContainerRef.current.focus();
    }
  };

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    setAnimationText('');
  };

  const handleAchievementComplete = () => {
    setAchievementText(null);
  };

  const handleResumeFromOverlay = () => {
    debugLog.game('恢复游戏 - 从失焦覆盖层');
    gameLogic.resumeGame();
    
    if (gameContainerRef.current) {
      gameContainerRef.current.focus();
    }
  };

  useEffect(() => {
    if (gameStarted && showCountdown && !gameLogic.gameInitialized) {
      debugLog.game('Game area ready, initializing pieces for countdown...');
      gameLogic.initializeForCountdown();
    }
  }, [gameStarted, showCountdown, gameLogic]);

  useEffect(() => {
    if (gameReallyStarted && gameContainerRef.current) {
      gameContainerRef.current.focus();
    }
  }, [gameReallyStarted]);

  useEffect(() => {
    if (gameLogic.gameOver) {
      const finalStats = {
        score: gameLogic.score,
        lines: gameLogic.lines,
        level: gameLogic.level,
        time: gameLogic.time,
        pps: gameLogic.pps,
        apm: gameLogic.apm,
        gameMode: gameMode.id
      };
      
      debugLog.game('Game ended', { stats: finalStats, gameMode: gameMode.id });
      
      if (user && !user.isGuest) {
        logUserSession('game_end', gameMode.id, { 
          finalStats,
          gameMode: gameMode.id
        });
      }
      
      onGameEnd(finalStats);
    }
  }, [gameLogic.gameOver, gameLogic.score, gameLogic.lines, gameLogic.level, gameLogic.time, gameLogic.pps, gameLogic.apm, gameMode.id, user, logUserSession, onGameEnd]);

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

  const elapsedTime = gameLogic.time;
  const showOutOfFocusOverlay = gameLogic.isPaused && gameReallyStarted && !gameLogic.gameOver && !gameLogic.isManuallyPaused;

  return (
    <div 
      ref={gameContainerRef}
      className={`min-h-screen p-4 ${getThemeClasses()}`}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      {/* 顶部控制栏 */}
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
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
          
          {gameReallyStarted && (
            <Button
              onClick={() => gameLogic.isPaused ? gameLogic.resumeGame() : gameLogic.pauseGame()}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={gameLogic.gameOver}
            >
              {gameLogic.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {gameLogic.isPaused ? '继续' : '暂停'}
            </Button>
          )}
          
          {/* Undo/Redo indicators */}
          {gameReallyStarted && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className={canUndo ? 'text-blue-400' : ''}>Ctrl+Z 撤销</span>
              <span className={canRedo ? 'text-green-400' : ''}>Ctrl+X 重做</span>
            </div>
          )}
        </div>
        
        <div className="text-lg font-semibold">
          {gameMode.displayName}
        </div>
      </div>

      {/* 游戏区域 */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-center max-w-7xl mx-auto">
        {/* 左侧面板 - Hold区域 */}
        <div className="flex flex-col gap-4 lg:w-60">
          <div className={`p-3 rounded-lg border ${getPanelThemeClasses()}`}>
            <HoldPieceDisplay 
              holdPiece={gameLogic.holdPiece} 
              canHold={gameLogic.canHold}
            />
          </div>
          
          {/* 游戏信息面板 */}
          <div className="flex-1">
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
                </div>

                {gameLogic.isManuallyPaused && (
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Pause className="w-8 h-8 mx-auto mb-2" />
                      <div className="text-sm">游戏暂停</div>
                    </div>
                  </div>
                )}
              </div>
              
              <LineCleanAnimation
                isVisible={showAnimation}
                text={animationText}
                onComplete={handleAnimationComplete}
              />
            </div>
          </div>
        </div>

        {/* 中央游戏区域 - 使用响应式游戏板 */}
        <div className="relative flex-shrink-0">
          <div className={`p-4 rounded-lg border ${getBoardThemeClasses()}`}>
            <EnhancedGameBoard
              board={gameLogic.board}
              currentPiece={gameLogic.currentPiece}
              ghostPiece={gameLogic.ghostPiece}
              cellSize={cellSize}
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
          
          {/* 失焦覆盖层 */}
          <OutOfFocusOverlay 
            show={showOutOfFocusOverlay}
            onResume={handleResumeFromOverlay}
          />
          
          {/* 成就动画覆盖层 */}
          {achievementText && (
            <AchievementAnimation
              achievement={achievementText}
              onComplete={handleAchievementComplete}
            />
          )}
        </div>

        {/* 右侧面板 - NEXT区域 */}
        <div className="lg:w-60">
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
