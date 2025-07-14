import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionLogger } from '@/hooks/useSessionLogger';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsiveCellSize } from '@/hooks/useResponsiveCellSize';
import { useGameHistory } from '@/hooks/useGameHistory';
import { debugLog } from '@/utils/debugLogger';
import GameTopBar from './GameTopBar';
import GameInfoPanel from './GameInfoPanel';
import GameCentralArea from './GameCentralArea';
import GameRightPanel from './GameRightPanel';
import AchievementDetector from './AchievementDetector';
import { useTetrisGame } from './TetrisGameProvider';
import type { GameMode, GameState } from '@/utils/gameTypes';

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

  // 保存游戏状态用于撤销/重做
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

  // 撤销/重做键盘控制
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameReallyStarted || gameLogic.gameOver) return;
      
      if (event.ctrlKey) {
        if (event.code === 'KeyZ' && canUndo && !event.shiftKey) {
          event.preventDefault();
          const previousState = undo();
          if (previousState && gameLogic.applyGameState) {
            gameLogic.applyGameState(previousState);
            debugLog.game('撤销操作执行');
          }
        } else if ((event.code === 'KeyY' || (event.code === 'KeyZ' && event.shiftKey)) && canRedo) {
          event.preventDefault();
          const nextState = redo();
          if (nextState && gameLogic.applyGameState) {
            gameLogic.applyGameState(nextState);
            debugLog.game('重做操作执行');
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [gameReallyStarted, gameLogic.gameOver, canUndo, canRedo, undo, redo, gameLogic]);

  const handleCountdownComplete = () => {
    debugLog.game('倒计时完成，开始游戏...');
    setShowCountdown(false);
    setGameReallyStarted(true);
    clearHistory();
    
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

  const handleAchievement = (achievement: string) => {
    setAchievementText(achievement);
  };

  const handleResumeFromOverlay = () => {
    debugLog.game('恢复游戏 - 从失焦覆盖层');
    gameLogic.resumeGame();
    
    if (gameContainerRef.current) {
      gameContainerRef.current.focus();
    }
  };

  const handlePauseResume = () => {
    gameLogic.isPaused ? gameLogic.resumeGame() : gameLogic.pauseGame();
  };

  const handleUndo = () => {
    if (canUndo) {
      const previousState = undo();
      if (previousState && gameLogic.applyGameState) {
        gameLogic.applyGameState(previousState);
      }
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      const nextState = redo();
      if (nextState && gameLogic.applyGameState) {
        gameLogic.applyGameState(nextState);
      }
    }
  };

  useEffect(() => {
    if (gameStarted && showCountdown && !gameLogic.gameInitialized) {
      debugLog.game('游戏区域准备，为倒计时初始化方块...');
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
      
      debugLog.game('游戏结束', { stats: finalStats, gameMode: gameMode.id });
      
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

  const elapsedTime = gameLogic.time;
  const showOutOfFocusOverlay = gameLogic.isPaused && gameReallyStarted && !gameLogic.gameOver && !gameLogic.isManuallyPaused;

  return (
    <div 
      ref={gameContainerRef}
      className={`min-h-screen p-4 ${getThemeClasses()}`}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      <GameTopBar
        gameMode={gameMode}
        gameReallyStarted={gameReallyStarted}
        isPaused={gameLogic.isPaused}
        gameOver={gameLogic.gameOver}
        canUndo={canUndo}
        canRedo={canRedo}
        onBackToMenu={onBackToMenu}
        onPauseResume={handlePauseResume}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* 游戏区域 */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-center max-w-7xl mx-auto">
        <GameInfoPanel
          holdPiece={gameLogic.holdPiece}
          canHold={gameLogic.canHold}
          score={gameLogic.score}
          lines={gameLogic.lines}
          level={gameLogic.level}
          pps={gameLogic.pps}
          apm={gameLogic.apm}
          elapsedTime={elapsedTime}
          isManuallyPaused={gameLogic.isManuallyPaused}
          showAnimation={showAnimation}
          animationText={animationText}
          achievementText={achievementText}
          onAnimationComplete={handleAnimationComplete}
          onAchievementComplete={handleAchievementComplete}
        />

        <GameCentralArea
          board={gameLogic.board}
          currentPiece={gameLogic.currentPiece}
          ghostPiece={gameLogic.ghostPiece}
          cellSize={cellSize}
          gameStarted={gameStarted}
          showCountdown={showCountdown}
          showOutOfFocusOverlay={showOutOfFocusOverlay}
          onCountdownComplete={handleCountdownComplete}
          onResumeFromOverlay={handleResumeFromOverlay}
        />

        <GameRightPanel
          nextPieces={gameLogic.nextPieces}
        />
      </div>
      
      {/* 成就检测器 */}
      <AchievementDetector
        linesCleared={0}
        tSpinResult={null}
        combo={-1}
        b2b={0}
        tetris={false}
        onAchievement={handleAchievement}
      />
    </div>
  );
};

export default SinglePlayerGameArea;
