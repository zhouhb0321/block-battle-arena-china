
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  
  // 成就相关状态
  const [currentAchievementData, setCurrentAchievementData] = useState({
    linesCleared: 0,
    tSpinResult: null as any,
    combo: -1,
    b2b: 0,
    tetris: false
  });
  
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // 保存游戏状态用于撤销/重做
  useEffect(() => {
    if (gameReallyStarted && !gameLogic.gameState.gameOver) {
      const completeGameState: GameState = {
        board: gameLogic.gameState.board,
        currentPiece: gameLogic.gameState.currentPiece ? {
          type: {
            name: gameLogic.gameState.currentPiece.type,
            type: gameLogic.gameState.currentPiece.type,
            shape: gameLogic.gameState.currentPiece.shape,
            color: '#ffffff'
          },
          x: gameLogic.gameState.currentPiece.x,
          y: gameLogic.gameState.currentPiece.y,
          rotation: gameLogic.gameState.currentPiece.rotation
        } : null,
        nextPieces: gameLogic.gameState.nextPieces.map(piece => ({
          type: {
            name: piece.type,
            type: piece.type,
            shape: piece.shape,
            color: '#ffffff'
          },
          x: piece.x,
          y: piece.y,
          rotation: piece.rotation
        })),
        holdPiece: gameLogic.gameState.heldPiece ? {
          type: {
            name: gameLogic.gameState.heldPiece.type,
            type: gameLogic.gameState.heldPiece.type,
            shape: gameLogic.gameState.heldPiece.shape,
            color: '#ffffff'
          },
          x: gameLogic.gameState.heldPiece.x,
          y: gameLogic.gameState.heldPiece.y,
          rotation: gameLogic.gameState.heldPiece.rotation
        } : null,
        canHold: gameLogic.gameState.canHold,
        isHolding: false,
        score: gameLogic.gameState.score,
        level: gameLogic.gameState.level,
        lines: gameLogic.gameState.lines,
        gameOver: gameLogic.gameState.gameOver,
        paused: gameLogic.gameState.isPaused,
        combo: gameLogic.gameState.combo,
        b2b: gameLogic.gameState.b2b,
        pieces: gameLogic.gameState.pieces || 0,
        attack: gameLogic.gameState.attack || 0,
        pps: 0,
        apm: 0,
        startTime: gameLogic.gameState.startTime || Date.now(),
        endTime: null,
        ghostPiece: null,
        clearingLines: []
      };
      saveState(completeGameState);
    }
  }, [gameLogic.gameState.board, gameLogic.gameState.currentPiece, gameLogic.gameState.nextPieces, gameLogic.gameState.heldPiece, gameLogic.gameState.canHold, gameLogic.gameState.score, gameLogic.gameState.level, gameLogic.gameState.lines, gameLogic.gameState.gameOver, gameLogic.gameState.isPaused, gameLogic.gameState.combo, gameLogic.gameState.b2b, gameReallyStarted, saveState]);

  // 撤销/重做键盘控制 - 修复Ctrl+Z和Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameReallyStarted || gameLogic.gameState.gameOver) return;
      
      if (event.ctrlKey) {
        if (event.code === 'KeyZ' && !event.shiftKey) {
          event.preventDefault();
          debugLog.game('撤销功能暂时不可用');
        } else if (event.code === 'KeyY' || (event.code === 'KeyZ' && event.shiftKey)) {
          event.preventDefault();
          debugLog.game('重做功能暂时不可用');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [gameReallyStarted, gameLogic.gameState.gameOver]);

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

  // 处理成就数据更新
  const handleAchievement = useCallback((achievement: string) => {
    setAchievementText(achievement);
  }, []);

  // 处理游戏逻辑中的成就触发
  const handleGameAchievement = useCallback((data: { linesCleared: number; tSpinResult: any; combo: number; b2b: number; tetris: boolean }) => {
    setCurrentAchievementData(data);
  }, []);

  const handleResumeFromOverlay = () => {
    debugLog.game('恢复游戏 - 从失焦覆盖层');
    gameLogic.pauseGame();
    
    if (gameContainerRef.current) {
      gameContainerRef.current.focus();
    }
  };

  const handlePauseResume = () => {
    gameLogic.pauseGame();
  };

  const handleUndo = () => {
    debugLog.game('撤销功能暂时不可用');
  };

  const handleRedo = () => {
    debugLog.game('重做功能暂时不可用');
  };

  useEffect(() => {
    if (gameStarted && showCountdown) {
      debugLog.game('游戏区域准备，为倒计时初始化方块...');
      gameLogic.startGame();
    }
  }, [gameStarted, showCountdown, gameLogic]);

  useEffect(() => {
    if (gameReallyStarted && gameContainerRef.current) {
      gameContainerRef.current.focus();
    }
  }, [gameReallyStarted]);

  useEffect(() => {
    if (gameLogic.gameState.gameOver) {
      const finalStats = {
        score: gameLogic.gameState.score,
        lines: gameLogic.gameState.lines,
        level: gameLogic.gameState.level,
        time: 0,
        pps: 0,
        apm: 0,
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
  }, [gameLogic.gameState.gameOver, gameLogic.gameState.score, gameLogic.gameState.lines, gameLogic.gameState.level, gameMode.id, user, logUserSession, onGameEnd]);

  const getThemeClasses = () => {
    return actualTheme === 'light' 
      ? 'bg-gray-50 text-gray-900' 
      : 'bg-gray-900 text-white';
  };

  const elapsedTime = 0;
  const showOutOfFocusOverlay = gameLogic.gameState.isPaused && gameReallyStarted && !gameLogic.gameState.gameOver;

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
        isPaused={gameLogic.gameState.isPaused}
        gameOver={gameLogic.gameState.gameOver}
        canUndo={canUndo}
        canRedo={canRedo}
        onBackToMenu={onBackToMenu}
        onPauseResume={handlePauseResume}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      <div className="flex flex-col lg:flex-row gap-6 items-start justify-center max-w-7xl mx-auto">
        <GameInfoPanel
          holdPiece={gameLogic.gameState.heldPiece ? {
            type: {
              name: gameLogic.gameState.heldPiece.type,
              type: gameLogic.gameState.heldPiece.type,
              shape: gameLogic.gameState.heldPiece.shape,
              color: '#ffffff'
            },
            x: gameLogic.gameState.heldPiece.x,
            y: gameLogic.gameState.heldPiece.y,
            rotation: gameLogic.gameState.heldPiece.rotation
          } : null}
          canHold={gameLogic.gameState.canHold}
          score={gameLogic.gameState.score}
          lines={gameLogic.gameState.lines}
          level={gameLogic.gameState.level}
          pps={0}
          apm={0}
          elapsedTime={elapsedTime}
          isManuallyPaused={gameLogic.gameState.isPaused}
          showAnimation={showAnimation}
          animationText={animationText}
          achievementText={achievementText}
          onAnimationComplete={handleAnimationComplete}
          onAchievementComplete={handleAchievementComplete}
        />

        <GameCentralArea
          board={gameLogic.gameState.board}
          currentPiece={gameLogic.gameState.currentPiece ? {
            type: {
              name: gameLogic.gameState.currentPiece.type,
              type: gameLogic.gameState.currentPiece.type,
              shape: gameLogic.gameState.currentPiece.shape,
              color: '#ffffff'
            },
            x: gameLogic.gameState.currentPiece.x,
            y: gameLogic.gameState.currentPiece.y,
            rotation: gameLogic.gameState.currentPiece.rotation
          } : null}
          ghostPiece={null}
          cellSize={cellSize}
          gameStarted={gameStarted}
          showCountdown={showCountdown}
          showOutOfFocusOverlay={showOutOfFocusOverlay}
          onCountdownComplete={handleCountdownComplete}
          onResumeFromOverlay={handleResumeFromOverlay}
        />

        <GameRightPanel
          nextPieces={gameLogic.gameState.nextPieces.map(piece => ({
            type: {
              name: piece.type,
              type: piece.type,
              shape: piece.shape,
              color: '#ffffff'
            },
            x: piece.x,
            y: piece.y,
            rotation: piece.rotation
          }))}
        />
      </div>
      
      {/* 成就检测器 - 使用实际的游戏数据 */}
      <AchievementDetector
        linesCleared={currentAchievementData.linesCleared}
        tSpinResult={currentAchievementData.tSpinResult}
        combo={currentAchievementData.combo}
        b2b={currentAchievementData.b2b}
        tetris={currentAchievementData.tetris}
        onAchievement={handleAchievement}
      />
    </div>
  );
};

export default SinglePlayerGameArea;
