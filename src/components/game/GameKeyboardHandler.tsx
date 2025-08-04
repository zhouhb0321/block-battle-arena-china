
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
    if (gameLogic.rotatePiece180) {
      gameLogic.rotatePiece180();
    }
  }, [gameLogic]);

  const keyboardControls = useKeyboardControls({
    gameSettings,
    gameOver: gameLogic.gameOver,
    paused: gameLogic.isPaused,
    onMoveLeft: () => {
      debugLog.debug('Keyboard: Move left');
      return gameLogic.movePiece(-1, 0);
    },
    onMoveRight: () => {
      debugLog.debug('Keyboard: Move right');
      return gameLogic.movePiece(1, 0);
    },
    onSoftDrop: () => {
      debugLog.debug('Keyboard: Soft drop');
      const moved = gameLogic.movePiece(0, 1);
      if (moved) {
        // Add soft drop points if needed
      }
      return moved;
    },
    onHardDrop: () => {
      debugLog.debug('Keyboard: Hard drop');
      gameLogic.hardDrop();
    },
    onRotateClockwise: () => {
      debugLog.debug('Keyboard: Rotate clockwise');
      gameLogic.rotatePieceClockwise();
    },
    onRotateCounterclockwise: () => {
      debugLog.debug('Keyboard: Rotate counter-clockwise');
      gameLogic.rotatePieceCounterclockwise();
    },
    onRotate180: rotate180,
    onHold: () => {
      debugLog.debug('Keyboard: Hold piece');
      gameLogic.holdCurrentPiece();
    },
    onPause: () => {
      debugLog.debug('Keyboard: Pause/Resume');
      if (gameLogic.isPaused) {
        gameLogic.resumeGame();
      } else {
        gameLogic.pauseGame();
      }
    },
    onBackToMenu: () => {
      debugLog.debug('Keyboard: Back to menu');
      onBackToMenu();
    },
    onUndo: onUndo ? () => {
      debugLog.debug('Keyboard: Undo move', { canUndo });
      onUndo();
    } : undefined,
    onRedo: onRedo ? () => {
      debugLog.debug('Keyboard: Redo move', { canRedo });
      onRedo();
    } : undefined,
    canUndo,
    canRedo
  });

  // 添加键盘控制循环 - 只有在游戏结束时才停止
  useEffect(() => {
    if (gameLogic.gameOver) {
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
  }, [gameLogic.gameOver, keyboardControls, keyboardLoopRef]);

  return null; // This component only handles keyboard logic
};
