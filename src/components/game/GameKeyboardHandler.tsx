
import React, { useEffect, useCallback } from 'react';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useTetrisGame } from './TetrisGameProvider';
import { debugLog } from '@/utils/debugLogger';

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
    gameLogic.rotatePiece('180');
  }, [gameLogic]);

  const keyboardControls = useKeyboardControls({
    gameSettings,
    gameOver: gameLogic.gameState.gameOver,
    paused: gameLogic.gameState.isPaused,
    onMoveLeft: () => {
      debugLog.debug('Keyboard: Move left');
      gameLogic.movePiece(-1, 0);
    },
    onMoveRight: () => {
      debugLog.debug('Keyboard: Move right');
      gameLogic.movePiece(1, 0);
    },
    onSoftDrop: () => {
      debugLog.debug('Keyboard: Soft drop');
      gameLogic.movePiece(0, 1);
    },
    onHardDrop: () => {
      debugLog.debug('Keyboard: Hard drop');
      gameLogic.hardDrop();
    },
    onRotateClockwise: () => {
      debugLog.debug('Keyboard: Rotate clockwise');
      gameLogic.rotatePiece('clockwise');
    },
    onRotateCounterclockwise: () => {
      debugLog.debug('Keyboard: Rotate counter-clockwise');
      gameLogic.rotatePiece('counterclockwise');
    },
    onHold: () => {
      debugLog.debug('Keyboard: Hold piece');
      gameLogic.holdPiece();
    },
    onPause: () => {
      debugLog.debug('Keyboard: Pause/Resume');
      gameLogic.pauseGame();
    },
    onBackToMenu: () => {
      debugLog.debug('Keyboard: Back to menu');
      onBackToMenu();
    },
    onUndo,
    onRedo,
    canUndo,
    canRedo
  });

  // 添加键盘控制循环
  useEffect(() => {
    if (!gameStarted || gameLogic.gameState.gameOver || gameLogic.gameState.isPaused) {
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
  }, [gameStarted, gameLogic.gameState.gameOver, gameLogic.gameState.isPaused, keyboardControls, keyboardLoopRef]);

  return null; // This component only handles keyboard logic
};
