
import React, { useEffect, useRef, useCallback } from 'react';
import { useGameState } from '@/hooks/useGameState';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useGameLogic } from '@/hooks/useGameLogic';
import type { GameSettings } from '@/utils/gameTypes';

interface GameControllerProps {
  gameSettings: GameSettings;
  mode: 'single' | 'multi';
  children: (props: {
    gameState: ReturnType<typeof useGameState>;
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
  children,
  onBackToMenu,
  resetGame,
  pauseGame,
  resumeGame
}) => {
  const gameLoopRef = useRef<number>();
  const lastDropTime = useRef<number>(0);
  const LOCK_DELAY_TIME = 500;
  
  const gameState = useGameState();
  
  const gameLogic = useGameLogic({
    ...gameState,
    mode
  });

  const togglePause = useCallback(() => {
    if (gameState.paused) {
      gameState.setPaused(false);
      resumeGame();
    } else {
      gameState.setPaused(true);
      pauseGame();
    }
  }, [gameState.paused, gameState.setPaused, pauseGame, resumeGame]);

  const handleReset = () => {
    gameState.resetGameState();
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

  const keyboardControls = useKeyboardControls({
    gameSettings,
    gameOver: gameState.gameOver,
    paused: gameState.paused,
    onMoveLeft: () => gameLogic.movePiece(-1, 0),
    onMoveRight: () => gameLogic.movePiece(1, 0),
    onSoftDrop: () => {
      const moved = gameLogic.movePiece(0, 1);
      if (moved) gameState.setScore(prev => prev + 1);
    },
    onHardDrop: gameLogic.hardDrop,
    onRotateClockwise: gameLogic.rotatePieceClockwise,
    onRotateCounterclockwise: gameLogic.rotatePieceCounterclockwise,
    onHold: gameLogic.holdCurrentPiece,
    onPause: togglePause,
    onBackToMenu: handleBackToMenu
  });

  const gameLoop = useCallback((timestamp: number) => {
    if (gameState.gameOver) return;

    if (!gameState.paused) {
      keyboardControls.processHeldKeys(timestamp);

      const dropSpeed = Math.max(50, 1000 - (gameState.level - 1) * 50);
      if (timestamp - lastDropTime.current > dropSpeed) {
        const moved = gameLogic.movePiece(0, 1);
        if (!moved && gameState.lockDelay) {
          if (timestamp - gameLogic.lockDelayTime > LOCK_DELAY_TIME) {
            gameLogic.lockPiece();
          }
        }
        lastDropTime.current = timestamp;
      } else if (gameState.lockDelay) {
        if (timestamp - gameLogic.lockDelayTime > LOCK_DELAY_TIME) {
          gameLogic.lockPiece();
        }
      }
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [
    gameState.gameOver, gameState.paused, gameState.level, gameState.lockDelay,
    keyboardControls.processHeldKeys, gameLogic.movePiece, gameLogic.lockPiece, gameLogic.lockDelayTime
  ]);

  useEffect(() => {
    if (!gameState.currentPiece && gameState.nextPieces.length > 0) {
      setTimeout(() => gameLogic.spawnNewPiece(), 100);
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameLoop, gameState.currentPiece, gameState.nextPieces, gameLogic.spawnNewPiece]);

  return (
    <>
      {children({
        gameState,
        gameLogic,
        onTogglePause: togglePause,
        onReset: handleReset
      })}
    </>
  );
};

export default GameController;
