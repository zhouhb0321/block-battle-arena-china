
import React, { useEffect, useRef, useCallback } from 'react';
import { useGameState } from '@/hooks/useGameState';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
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
  
  const gameLogic = useGameLogic(gameMode.id);

  const togglePause = useCallback(() => {
    if (gameLogic.gameState.isPaused) {
      resumeGame();
    } else {
      gameLogic.pauseGame();
      pauseGame();
    }
  }, [gameLogic.gameState.isPaused, gameLogic.pauseGame, pauseGame, resumeGame]);

  const handleReset = () => {
    gameLogic.resetGame();
    lastDropTime.current = 0;
    resetGame();
  };

  const handleBackToMenu = useCallback(() => {
    console.log('GameController handleBackToMenu called');
    if (onBackToMenu) {
      onBackToMenu();
    }
  }, [onBackToMenu]);

  const keyboardControls = useKeyboardControls({
    gameSettings,
    gameOver: gameLogic.gameState.gameOver,
    paused: gameLogic.gameState.isPaused,
    onMoveLeft: () => gameLogic.movePiece(-1, 0),
    onMoveRight: () => gameLogic.movePiece(1, 0),
    onSoftDrop: () => {
      gameLogic.movePiece(0, 1);
    },
    onHardDrop: gameLogic.hardDrop,
    onRotateClockwise: () => gameLogic.rotatePiece('clockwise'),
    onRotateCounterclockwise: () => gameLogic.rotatePiece('counterclockwise'),
    onHold: gameLogic.holdPiece,
    onPause: togglePause,
    onBackToMenu: handleBackToMenu
  });

  const gameLoop = useCallback((timestamp: number) => {
    if (gameLogic.gameState.gameOver) return;

    if (!gameLogic.gameState.isPaused) {
      keyboardControls.processHeldKeys(timestamp);

      const dropSpeed = Math.max(50, 1000 - (gameLogic.gameState.level - 1) * 50);
      if (timestamp - lastDropTime.current > dropSpeed) {
        gameLogic.movePiece(0, 1);
        lastDropTime.current = timestamp;
      }
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [
    gameLogic.gameState.gameOver, gameLogic.gameState.isPaused, gameLogic.gameState.level,
    keyboardControls.processHeldKeys, gameLogic.movePiece
  ]);

  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameLoop]);

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
