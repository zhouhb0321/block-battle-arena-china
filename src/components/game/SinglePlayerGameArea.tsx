
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionLogger } from '@/hooks/useSessionLogger';
import { useTheme } from '@/contexts/ThemeContext';
import { debugLog } from '@/utils/debugLogger';
import GameCountdownInArea from '@/components/GameCountdownInArea';
import EnhancedGameBoard from '@/components/EnhancedGameBoard';
import HoldPieceDisplay from '@/components/HoldPieceDisplay';
import NextPiecePreview from '@/components/NextPiecePreview';
import LineCleanAnimation from '@/components/LineCleanAnimation';
import OutOfFocusOverlay from '@/components/OutOfFocusOverlay';
import AchievementDisplay from '@/components/AchievementDisplay';
import GameOverDialog from '@/components/GameOverDialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pause, Play, Undo2, Redo2 } from 'lucide-react';
import { useTetrisGame } from './TetrisGameProvider';
import type { GameMode } from '@/utils/gameTypes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw, RotateCw } from 'lucide-react';


import GameMusicManager from '@/components/GameMusicManager';
import BackgroundWallpaper from '@/components/BackgroundWallpaper';

interface SinglePlayerGameAreaProps {
  gameMode: GameMode;
  gameStarted?: boolean;
  onGameEnd: (finalStats: any) => void;
  onBackToMenu?: () => void;
  onActualGameStart?: () => void;
}

const SinglePlayerGameArea: React.FC<SinglePlayerGameAreaProps> = ({
  gameMode,
  gameStarted = false,
  onGameEnd,
  onBackToMenu,
  onActualGameStart
}) => {
  const { user } = useAuth();
  const { logUserSession } = useSessionLogger();
  const { actualTheme } = useTheme();
  const { gameLogic } = useTetrisGame();
  
  const handleAchievementComplete = (id: string) => {
    // 从队列中移除已显示的成就，确保下一个成就继续显示
    try {
      gameLogic.removeAchievement(id);
    } catch (e) {
      console.log('移除成就时出错', e);
    }
  };
  
  const [showCountdown, setShowCountdown] = useState(true);
  const [gameReallyStarted, setGameReallyStarted] = useState(false);
  const [animationText, setAnimationText] = useState('');
  const [showAnimation, setShowAnimation] = useState(false);
  const [showGameOverDialog, setShowGameOverDialog] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  
  

  // 键盘控制已移至GameKeyboardHandler统一处理，移除重复的键盘事件监听

  const handleUndo = useCallback(() => {
    if (gameLogic.canUndo) {
      gameLogic.undo();
    }
  }, [gameLogic]);

  const handleRedo = useCallback(() => {
    if (gameLogic.canRedo) {
      gameLogic.redo();
    }
  }, [gameLogic]);

  const handleCountdownComplete = () => {
    console.log('Countdown completed, starting game...');
    setShowCountdown(false);
    setGameReallyStarted(true);
    
    // 启动游戏逻辑 - 确保只在这里启动一次
    gameLogic.startGame();
    gameLogic.spawnNewPiece();
    
    // 通知父组件游戏真正开始了
    onActualGameStart?.();
    
    // 添加调试日志确认游戏状态
    console.log('游戏开始后状态', {
      gameStarted: gameLogic.gameStarted,
      gameInitialized: gameLogic.gameInitialized,
      isPaused: gameLogic.isPaused,
      gameOver: gameLogic.gameOver,
      currentPiece: !!gameLogic.currentPiece
    });
    
    if (user && !user.isGuest) {
      logUserSession('game_start', gameMode.id, { 
        gameMode: gameMode.id,
        startTime: new Date().toISOString()
      });
    }

    // 确保游戏容器获得焦点以接收键盘事件
    if (gameContainerRef.current) {
      gameContainerRef.current.focus();
    }
  };

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    setAnimationText('');
  };

  // 处理失焦覆盖层的恢复
  const handleResumeFromOverlay = () => {
    debugLog.game('恢复游戏 - 从失焦覆盖层');
    gameLogic.resumeGame();
    
    // 确保游戏容器重新获得焦点
    if (gameContainerRef.current) {
      gameContainerRef.current.focus();
    }
  };

  // 当倒计时开始时，立即初始化方块
  useEffect(() => {
    if (gameStarted && showCountdown && !gameLogic.gameInitialized) {
      debugLog.game('Game area ready, initializing pieces for countdown...');
      gameLogic.initializeForCountdown();
    }
  }, [gameStarted, showCountdown, gameLogic]);

  // 确保游戏容器在游戏开始后保持焦点
  useEffect(() => {
    if (gameReallyStarted && gameContainerRef.current) {
      gameContainerRef.current.focus();
    }
  }, [gameReallyStarted]);

  // 处理游戏结束 - 显示对话框而不是立即跳转
  useEffect(() => {
    if (gameLogic.gameOver && !showGameOverDialog) {
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
      
      // 显示游戏结束对话框而不是立即调用onGameEnd
      setShowGameOverDialog(true);
    }
  }, [gameLogic.gameOver, gameLogic.score, gameLogic.lines, gameLogic.level, gameLogic.time, gameLogic.pps, gameLogic.apm, gameMode.id, user, logUserSession, showGameOverDialog]);

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
    // Glassy panels so wallpaper shows through (except the stack area)
    return 'bg-background/40 border-border/60 backdrop-blur-sm';
  };

  const currentTime = Date.now();
  const elapsedTime = gameLogic.time;
  const remainingTime = gameMode.isTimeAttack && gameMode.timeLimit ? Math.max(0, gameMode.timeLimit - gameLogic.time) : null;

  // 确定是否显示失焦覆盖层
  const showOutOfFocusOverlay = gameLogic.isPaused && gameReallyStarted && !gameLogic.gameOver;

  return (
    <BackgroundWallpaper>
      <GameMusicManager 
        isGameActive={gameReallyStarted} 
        isGamePaused={gameLogic.isPaused} 
      />
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
              onClick={() => { 
                try { gameLogic.resetGame(); } catch {}
                onBackToMenu?.();
              }}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              返回菜单
            </Button>
          )}
          
          {gameReallyStarted && (
            <div className="flex items-center gap-2">
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
              <Button
                onClick={handleUndo}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={!gameLogic.canUndo}
                title="撤销 (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" /> 撤销
              </Button>
              <Button
                onClick={handleRedo}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={!gameLogic.canRedo}
                title="重做 (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" /> 重做
              </Button>
            </div>
          )}
        </div>
        
        {/* 游戏模式信息 */}
        <div className="text-lg font-semibold">
          {gameMode.displayName}
        </div>
      </div>

      {/* 游戏区域 - 重新设计布局 */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
        {/* 左侧面板 - Hold区域 */}
        <div className="flex flex-col gap-4 lg:w-48">
          <div className={`p-3 rounded-lg border ${getPanelThemeClasses()}`}>
            <HoldPieceDisplay 
              holdPiece={gameLogic.holdPiece} 
              canHold={gameLogic.canHold}
            />
          </div>
          
          {/* 成就显示区域 */}
          <div className={`relative h-48 p-2 rounded-lg border ${getPanelThemeClasses()}`}>
            <AchievementDisplay
              achievements={gameLogic.achievements || []}
              onAchievementComplete={handleAchievementComplete}
              placement="sidebar"
            />
          </div>
          
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
                  
                  <div>{gameMode.isTimeAttack ? '剩余:' : '时间:'}</div>
                  <div className="font-mono text-right">
                    {gameMode.isTimeAttack && gameMode.timeLimit
                      ? `${Math.floor((remainingTime || 0) / 60)}:${((remainingTime || 0) % 60).toString().padStart(2, '0')}`
                      : `${Math.floor(elapsedTime / 60)}:${(elapsedTime % 60).toString().padStart(2, '0')}`}
                  </div>
                </div>

                {gameLogic.isPaused && gameReallyStarted && (
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

        {/* 中央游戏区域 */}
        <div className="relative">
          <div className={`p-4 rounded-lg border ${getBoardThemeClasses()}`}>
            <EnhancedGameBoard
              board={gameLogic.board}
              currentPiece={gameLogic.currentPiece}
              ghostPiece={gameLogic.ghostPiece || null}
              cellSize={32}
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
          
          {/* 失焦覆盖层 - 支持点击恢复 */}
          <OutOfFocusOverlay 
            show={showOutOfFocusOverlay}
            onResume={handleResumeFromOverlay}
          />
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

      {/* 游戏结束对话框 */}
      <GameOverDialog
        isOpen={showGameOverDialog}
        onRestart={() => {
          setShowGameOverDialog(false);
          gameLogic.resetGame();
          setShowCountdown(true);
          setGameReallyStarted(false);
        }}
        onContinue={gameMode.id === 'endless' ? () => {
          setShowGameOverDialog(false);
          gameLogic.resetGame();
          gameLogic.startGame();
        } : undefined}
        onBackToMenu={() => {
          setShowGameOverDialog(false);
          onGameEnd({
            score: gameLogic.score,
            lines: gameLogic.lines,
            level: gameLogic.level,
            time: gameLogic.time,
            pps: gameLogic.pps,
            apm: gameLogic.apm,
            gameMode: gameMode.id
          });
        }}
        score={gameLogic.score}
        lines={gameLogic.lines}
        level={gameLogic.level}
        time={gameLogic.time}
        gameMode={gameMode.displayName}
        isEndlessMode={gameMode.id === 'endless'}
      />
      </div>
    </BackgroundWallpaper>
  );
};

export default SinglePlayerGameArea;
