
import React, { useEffect, useRef, useCallback } from 'react';
import { useGameState } from '@/hooks/useGameState';
import { useGameLogic } from '@/hooks/useGameLogic';
import type { GameSettings, GameMode } from '@/utils/gameTypes';

interface GameControllerProps {
  gameSettings: GameSettings;
  mode: 'single' | 'multi';
  gameMode: GameMode;
  children: (props: {
    gameLogic: ReturnType<typeof useGameLogic>;
    onTogglePause: () => void;
    onReset: () => void;
  }) => React.ReactNode;
  onBackToMenu?: () => void;
  resetGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
}

const GameController: React.FC<GameControllerProps> = ({
  gameSettings,
  mode,
  gameMode,
  children,
  onBackToMenu,
  resetGame,
  pauseGame,
  resumeGame
}) => {
  const gameLoopRef = useRef<number>();
  const lastDropTime = useRef<number>(0);
  const LOCK_DELAY_TIME = 500;
  
  const gameLogic = useGameLogic({
    gameMode,
    onGameEnd: (stats) => {
      console.log('Game ended:', stats);
    }
  });

  const togglePause = useCallback(() => {
    if (gameLogic.isPaused) {
      gameLogic.resumeGame();
      resumeGame();
    } else {
      gameLogic.pauseGame();
      pauseGame();
    }
  }, [gameLogic.isPaused, gameLogic.pauseGame, gameLogic.resumeGame, pauseGame, resumeGame]);

  const handleReset = () => {
    gameLogic.resetGame();
    lastDropTime.current = 0;
    setTimeout(() => gameLogic.spawnNewPiece(), 100);
    resetGame();
  };

  const handleBackToMenu = useCallback(() => {
    console.log('GameController handleBackToMenu called');
    if (onBackToMenu) {
      onBackToMenu();
    }
  }, [onBackToMenu]);

  // 键盘控制已移至GameKeyboardHandler统一处理，避免重复监听

  const gameLoop = useCallback((timestamp: number) => {
    if (gameLogic.gameOver) return;

    if (!gameLogic.isPaused) {
      // 键盘控制已移至GameKeyboardHandler，这里只处理重力下降
      const dropSpeed = Math.max(50, 1000 - (gameLogic.level - 1) * 50);
      if (timestamp - lastDropTime.current > dropSpeed) {
        const moved = gameLogic.movePiece(0, 1);
        lastDropTime.current = timestamp;
      }
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [
    gameLogic.gameOver, gameLogic.isPaused, gameLogic.level, gameLogic.movePiece
  ]);

  useEffect(() => {
    if (!gameLogic.currentPiece && gameLogic.nextPieces.length > 0) {
      setTimeout(() => gameLogic.spawnNewPiece(), 100);
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameLoop, gameLogic.currentPiece, gameLogic.nextPieces, gameLogic.spawnNewPiece]);

  return (
    <>
      {children({
        gameLogic,
        onTogglePause: togglePause,
        onReset: handleReset
      })}
    </>
  );
};

export default GameController;
