import { useCallback, useEffect, useState, useRef } from 'react';
import type { GameSettings } from '@/utils/gameTypes';

interface UseKeyboardControlsProps {
  gameSettings: GameSettings;
  gameOver: boolean;
  paused: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onSoftDrop: () => void;
  onHardDrop: () => void;
  onRotateClockwise: () => void;
  onRotateCounterclockwise: () => void;
  onHold: () => void;
  onPause: () => void;
  onBackToMenu?: () => void;
}

export const useKeyboardControls = ({
  gameSettings,
  gameOver,
  paused,
  onMoveLeft,
  onMoveRight,
  onSoftDrop,
  onHardDrop,
  onRotateClockwise,
  onRotateCounterclockwise,
  onHold,
  onPause,
  onBackToMenu
}: UseKeyboardControlsProps) => {
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const keyPressedTime = useRef<{[key: string]: number}>({});

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (gameOver || paused) return;
    
    const { controls } = gameSettings;
    const now = Date.now();
    
    if (!keyPressedTime.current[event.code]) {
      keyPressedTime.current[event.code] = now;
      
      if (event.code === controls.rotateClockwise) {
        event.preventDefault();
        onRotateClockwise();
      } else if (event.code === controls.rotateCounterclockwise) {
        event.preventDefault();
        onRotateCounterclockwise();
      } else if (event.code === controls.hardDrop) {
        event.preventDefault();
        onHardDrop();
      } else if (event.code === controls.hold) {
        event.preventDefault();
        onHold();
      } else if (event.code === controls.pause) {
        event.preventDefault();
        onPause();
      } else if (event.code === controls.backToMenu && onBackToMenu) {
        event.preventDefault();
        onBackToMenu();
      }
    }
    
    setKeys(prev => new Set(prev).add(event.code));
  }, [gameSettings, gameOver, paused, onRotateClockwise, onRotateCounterclockwise, onHardDrop, onHold, onPause, onBackToMenu]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    delete keyPressedTime.current[event.code];
    setKeys(prev => {
      const newKeys = new Set(prev);
      newKeys.delete(event.code);
      return newKeys;
    });
  }, []);

  const processHeldKeys = useCallback((timestamp: number) => {
    if (gameOver || paused) return;

    const { controls } = gameSettings;
    
    keys.forEach(key => {
      const pressTime = keyPressedTime.current[key] || 0;
      const heldTime = timestamp - pressTime;
      
      if (heldTime > gameSettings.das) {
        if (key === controls.moveLeft) {
          if (heldTime % Math.max(gameSettings.arr, 16) < 16) {
            onMoveLeft();
          }
        } else if (key === controls.moveRight) {
          if (heldTime % Math.max(gameSettings.arr, 16) < 16) {
            onMoveRight();
          }
        } else if (key === controls.softDrop) {
          if (heldTime % Math.max(16, 1000 / gameSettings.sdf) < 16) {
            onSoftDrop();
          }
        }
      } else if (heldTime < 16) {
        if (key === controls.moveLeft) {
          onMoveLeft();
        } else if (key === controls.moveRight) {
          onMoveRight();
        } else if (key === controls.softDrop) {
          onSoftDrop();
        }
      }
    });
  }, [gameOver, paused, keys, gameSettings, onMoveLeft, onMoveRight, onSoftDrop]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return {
    keys,
    processHeldKeys,
    keyPressedTime: keyPressedTime.current
  };
};
