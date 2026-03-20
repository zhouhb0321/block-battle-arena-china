
import React, { useEffect, useCallback } from 'react';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useTetrisGame } from './TetrisGameProvider';

interface GameKeyboardHandlerProps {
  gameStarted: boolean;
  onBackToMenu: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const GameKeyboardHandler: React.FC<GameKeyboardHandlerProps> = ({
  gameStarted,
  onBackToMenu,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}) => {
  const { gameLogic, gameSettings, keyboardLoopRef } = useTetrisGame();

  const rotate180 = useCallback(() => {
    if (gameLogic.rotatePiece180) {
      gameLogic.rotatePiece180();
    }
  }, [gameLogic]);

  const keyboardControls = useKeyboardControls({
    gameSettings,
    gameOver: gameLogic.gameOver,
    paused: gameLogic.isPaused,
    onMoveLeft: () => {
      if (!gameLogic.gameOver && !gameLogic.isPaused && gameLogic.currentPiece) {
        return gameLogic.movePiece(-1, 0);
      }
      return false;
    },
    onMoveRight: () => {
      if (!gameLogic.gameOver && !gameLogic.isPaused && gameLogic.currentPiece) {
        return gameLogic.movePiece(1, 0);
      }
      return false;
    },
    onSoftDrop: () => {
      if (!gameLogic.gameOver && !gameLogic.isPaused && gameLogic.currentPiece) {
        return gameLogic.movePiece(0, 1);
      }
      return false;
    },
    onHardDrop: () => {
      if (!gameLogic.gameOver && !gameLogic.isPaused && gameLogic.currentPiece) {
        gameLogic.hardDrop();
      }
    },
    onRotateClockwise: () => {
      if (!gameLogic.gameOver && !gameLogic.isPaused && gameLogic.currentPiece) {
        gameLogic.rotatePieceClockwise();
      }
    },
    onRotateCounterclockwise: () => {
      if (!gameLogic.gameOver && !gameLogic.isPaused && gameLogic.currentPiece) {
        gameLogic.rotatePieceCounterclockwise();
      }
    },
    onRotate180: rotate180,
    onHold: () => {
      gameLogic.holdCurrentPiece();
    },
    onPause: () => {
      if (gameLogic.isPaused) {
        gameLogic.resumeGame();
      } else {
        gameLogic.pauseGame();
      }
    },
    onBackToMenu: () => {
      onBackToMenu();
    },
    onUndo: onUndo ? () => { onUndo(); } : undefined,
    onRedo: onRedo ? () => { onRedo(); } : undefined,
    canUndo,
    canRedo,
    onInstantSoftDrop: () => {
      if (!gameLogic.gameOver && !gameLogic.isPaused && gameLogic.currentPiece && gameLogic.instantSoftDrop) {
        gameLogic.instantSoftDrop();
      }
    }
  });

  useEffect(() => {
    let isRunning = true;
    
    const keyboardLoop = (timestamp: number) => {
      if (!isRunning) return;
      
      if (!gameLogic.gameOver) {
        keyboardControls.processHeldKeys(timestamp);
      }
      
      keyboardLoopRef.current = requestAnimationFrame(keyboardLoop);
    };

    keyboardLoopRef.current = requestAnimationFrame(keyboardLoop);

    return () => {
      isRunning = false;
      if (keyboardLoopRef.current) {
        cancelAnimationFrame(keyboardLoopRef.current);
        keyboardLoopRef.current = null;
      }
    };
  }, [keyboardControls, keyboardLoopRef, gameLogic.gameOver]);

  return null;
};
