
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

  // 180度旋转功能
  const rotate180 = useCallback(() => {
    if (gameLogic.rotatePiece180) {
      gameLogic.rotatePiece180();
    }
  }, [gameLogic]);

  const keyboardControls = useKeyboardControls({
    gameSettings,
    gameOver: gameLogic.gameState.gameOver,
    paused: gameLogic.gameState.paused,
    onMoveLeft: () => gameLogic.movePiece(-1, 0),
    onMoveRight: () => gameLogic.movePiece(1, 0),
    onSoftDrop: () => {
      const moved = gameLogic.movePiece(0, 1);
      if (moved) {
        // Add soft drop points
      }
    },
    onHardDrop: gameLogic.hardDrop,
    onRotateClockwise: gameLogic.rotatePieceClockwise,
    onRotateCounterclockwise: gameLogic.rotatePieceCounterclockwise,
    onHold: gameLogic.holdCurrentPiece,
    onPause: gameLogic.pauseGame,
    onBackToMenu: onBackToMenu,
    onUndo,
    onRedo,
    canUndo,
    canRedo
  });

  // 添加键盘控制循环
  useEffect(() => {
    if (!gameStarted || gameLogic.gameState.gameOver || gameLogic.gameState.paused) {
      if (keyboardLoopRef.current) {
        cancelAnimationFrame(keyboardLoopRef.current);
        keyboardLoopRef.current = null;
      }
      return;
    }

    const keyboardLoop = (timestamp: number) => {
      keyboardControls.processHeldKeys(timestamp);
      keyboardLoopRef.current = requestAnimationFrame(keyboardLoop);
    };

    keyboardLoopRef.current = requestAnimationFrame(keyboardLoop);

    return () => {
      if (keyboardLoopRef.current) {
        cancelAnimationFrame(keyboardLoopRef.current);
        keyboardLoopRef.current = null;
      }
    };
  }, [gameStarted, gameLogic.gameState.gameOver, gameLogic.gameState.paused, keyboardControls, keyboardLoopRef]);

  return null; // This component only handles keyboard logic
};
