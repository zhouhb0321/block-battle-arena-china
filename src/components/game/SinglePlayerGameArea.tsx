import React, { useState, useEffect, useRef } from 'react';
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
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import { useTetrisGame } from './TetrisGameProvider';
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
  const { gameLogic, gameSettings } = useTetrisGame();
  
  const [showCountdown, setShowCountdown] = useState(true);
  const [gameReallyStarted, setGameReallyStarted] = useState(false);
  const [animationText, setAnimationText] = useState('');
  const [showAnimation, setShowAnimation] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);

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

  const currentTime = Date.now();
  const elapsedTime = gameLogic.time;

  // 确定是否显示失焦覆盖层
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
        </div>
        
        {/* 游戏模式信息 */}
        <div className="text-lg font-semibold">
          {gameMode.displayName}
        </div>
      </div>

      {/* 游戏区域 - 优化布局，移除操作提示 */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-center max-w-7xl mx-auto">
        {/* 左侧面板 - Hold区域，宽度优化 */}
        <div className="flex flex-col gap-4 lg:w-60">
          <div className={`p-3 rounded-lg border ${getPanelThemeClasses()}`}>
            <HoldPieceDisplay 
              holdPiece={gameLogic.holdPiece} 
              canHold={gameLogic.canHold}
            />
          </div>
          
          {/* 游戏信息面板 - 增加高度和信息显示 */}
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

        {/* 中央游戏区域 - 使用更大的游戏板 */}
        <div className="relative flex-shrink-0">
          <div className={`p-4 rounded-lg border ${getBoardThemeClasses()}`}>
            <EnhancedGameBoard
              board={gameLogic.board}
              currentPiece={gameLogic.currentPiece}
              ghostPiece={gameLogic.ghostPiece}
              cellSize={42}
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

        {/* 右侧面板 - NEXT区域，移除操作提示 */}
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
