
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
  const lastMoveTime = useRef<{[key: string]: number}>({});

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 防止页面滚动等默认行为
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }

    const { controls } = gameSettings;
    const now = Date.now();
    
    // 记录按键时间
    if (!keyPressedTime.current[event.code]) {
      keyPressedTime.current[event.code] = now;
      
      // 立即响应的按键（旋转、硬降、暂存、暂停等）
      if (event.code === controls.rotateClockwise && !gameOver && !paused) {
        onRotateClockwise();
      } else if (event.code === controls.rotateCounterclockwise && !gameOver && !paused) {
        onRotateCounterclockwise();
      } else if (event.code === controls.rotate180 && !gameOver && !paused) {
        // TODO: 实现180度旋转
        onRotateClockwise();
        setTimeout(() => onRotateClockwise(), 50);
      } else if (event.code === controls.hardDrop && !gameOver && !paused) {
        onHardDrop();
      } else if (event.code === controls.hold && !gameOver && !paused) {
        onHold();
      } else if (event.code === controls.pause) {
        onPause();
      } else if (event.code === controls.backToMenu && onBackToMenu) {
        onBackToMenu();
      }
      
      // 移动和软降的初始响应
      if (!gameOver && !paused) {
        if (event.code === controls.moveLeft) {
          onMoveLeft();
          lastMoveTime.current[event.code] = now;
        } else if (event.code === controls.moveRight) {
          onMoveRight();
          lastMoveTime.current[event.code] = now;
        } else if (event.code === controls.softDrop) {
          onSoftDrop();
          lastMoveTime.current[event.code] = now;
        }
      }
    }
    
    setKeys(prev => new Set(prev).add(event.code));
  }, [gameSettings, gameOver, paused, onRotateClockwise, onRotateCounterclockwise, onHardDrop, onHold, onPause, onBackToMenu, onMoveLeft, onMoveRight, onSoftDrop]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    delete keyPressedTime.current[event.code];
    delete lastMoveTime.current[event.code];
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
      const lastMove = lastMoveTime.current[key] || 0;
      const heldTime = timestamp - pressTime;
      const timeSinceLastMove = timestamp - lastMove;
      
      // DAS (Delayed Auto Shift) 和 ARR (Auto Repeat Rate) 逻辑
      if (heldTime > gameSettings.das) {
        const arrInterval = Math.max(gameSettings.arr, 16);
        
        if (key === controls.moveLeft && timeSinceLastMove >= arrInterval) {
          onMoveLeft();
          lastMoveTime.current[key] = timestamp;
        } else if (key === controls.moveRight && timeSinceLastMove >= arrInterval) {
          onMoveRight();
          lastMoveTime.current[key] = timestamp;
        } else if (key === controls.softDrop) {
          // 软降速度控制
          const sdfInterval = Math.max(16, 1000 / gameSettings.sdf);
          if (timeSinceLastMove >= sdfInterval) {
            onSoftDrop();
            lastMoveTime.current[key] = timestamp;
          }
        }
      }
    });
  }, [gameOver, paused, keys, gameSettings, onMoveLeft, onMoveRight, onSoftDrop]);

  useEffect(() => {
    const handleKeyDownEvent = (e: KeyboardEvent) => handleKeyDown(e);
    const handleKeyUpEvent = (e: KeyboardEvent) => handleKeyUp(e);

    window.addEventListener('keydown', handleKeyDownEvent);
    window.addEventListener('keyup', handleKeyUpEvent);

    return () => {
      window.removeEventListener('keydown', handleKeyDownEvent);
      window.removeEventListener('keyup', handleKeyUpEvent);
    };
  }, [handleKeyDown, handleKeyUp]);

  return {
    keys,
    processHeldKeys,
    keyPressedTime: keyPressedTime.current
  };
};
