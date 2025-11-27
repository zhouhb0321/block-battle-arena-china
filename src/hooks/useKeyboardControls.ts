
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
  onRotate180?: () => void;
  onHold: () => void;
  onPause: () => void;
  onBackToMenu?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
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
  onRotate180,
  onHold,
  onPause,
  onBackToMenu,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}: UseKeyboardControlsProps) => {
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const keyPressedTime = useRef<{[key: string]: number}>({});
  const lastMoveTime = useRef<{[key: string]: number}>({});
  const lastDirection = useRef<'left' | 'right' | null>(null);
  const dcdActiveUntil = useRef<number>(0);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 防止页面滚动等默认行为
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }

    // Handle Ctrl+Z (Undo) and Ctrl+Y (Redo) for single player practice
    if (event.ctrlKey && !gameOver) {
      if (event.code === 'KeyZ' && onUndo && canUndo) {
        event.preventDefault();
        onUndo();
        return;
      }
      if (event.code === 'KeyY' && onRedo && canRedo) {
        event.preventDefault();
        onRedo();
        return;
      }
    }

    const { controls } = gameSettings;
    console.log('useKeyboardControls: 当前按键设置', { 
      controls,
      pressedKey: event.code,
      moveLeft: controls.moveLeft,
      moveRight: controls.moveRight,
      softDrop: controls.softDrop,
      hardDrop: controls.hardDrop
    });
    const now = performance.now();
    
    // 记录按键时间
    if (!keyPressedTime.current[event.code]) {
      keyPressedTime.current[event.code] = now;
      
      // 立即响应的按键（旋转、硬降、暂存、暂停等）
      if (!gameOver && !paused) {
        if (event.code === controls.rotateClockwise) {
          console.log('顺时针旋转按键触发');
          onRotateClockwise();
        } else if (event.code === controls.rotateCounterclockwise) {
          console.log('逆时针旋转按键触发');
          onRotateCounterclockwise();
        } else if (event.code === controls.rotate180 && onRotate180) {
          console.log('180度旋转按键触发');
          onRotate180();
        } else if (event.code === controls.hardDrop) {
          console.log('硬降按键触发');
          onHardDrop();
        } else if (event.code === controls.hold) {
          console.log('暂存按键触发');
          onHold();
        }
      }
      
      // 暂停和退出不受游戏状态限制
      if (event.code === controls.pause) {
        console.log('暂停按键触发');
        onPause();
      } else if (event.code === controls.backToMenu && onBackToMenu) {
        console.log('返回菜单按键触发');
        onBackToMenu();
      }
      
      // 移动和软降的初始响应
      if (!gameOver && !paused) {
        if (event.code === controls.moveLeft) {
          console.log('useKeyboardControls: 左移按键触发', { 
            key: event.code, 
            expected: controls.moveLeft 
          });
          onMoveLeft();
          lastMoveTime.current[event.code] = now;
        } else if (event.code === controls.moveRight) {
          console.log('useKeyboardControls: 右移按键触发', { 
            key: event.code, 
            expected: controls.moveRight 
          });
          onMoveRight();
          lastMoveTime.current[event.code] = now;
        } else if (event.code === controls.softDrop) {
          console.log('useKeyboardControls: 软降按键触发', { 
            key: event.code, 
            expected: controls.softDrop 
          });
          onSoftDrop();
          lastMoveTime.current[event.code] = now;
        }
      }
    }
    
    setKeys(prev => new Set(prev).add(event.code));
  }, [gameSettings, gameOver, paused, onRotateClockwise, onRotateCounterclockwise, onRotate180, onHardDrop, onHold, onPause, onBackToMenu, onMoveLeft, onMoveRight, onSoftDrop, onUndo, onRedo, canUndo, canRedo]);

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
    
    // Detect current direction
    const currentDirection = keys.has(controls.moveLeft) ? 'left' : 
                            keys.has(controls.moveRight) ? 'right' : null;

    // Check for direction change and trigger DCD
    if (currentDirection && currentDirection !== lastDirection.current && lastDirection.current !== null) {
      if (gameSettings.dcd > 0) {
        dcdActiveUntil.current = timestamp + gameSettings.dcd;
        // Reset DAS timer on direction change
        if (currentDirection === 'left') {
          keyPressedTime.current[controls.moveLeft] = timestamp;
          lastMoveTime.current[controls.moveLeft] = timestamp;
        } else {
          keyPressedTime.current[controls.moveRight] = timestamp;
          lastMoveTime.current[controls.moveRight] = timestamp;
        }
      }
    }
    lastDirection.current = currentDirection;

    // Skip movement during DCD period
    if (timestamp < dcdActiveUntil.current) {
      return;
    }
    
    keys.forEach(key => {
      const pressTime = keyPressedTime.current[key] || 0;
      const lastMove = lastMoveTime.current[key] || 0;
      const heldTime = timestamp - pressTime;
      const timeSinceLastMove = timestamp - lastMove;
      
      // DAS (Delayed Auto Shift) 和 ARR (Auto Repeat Rate) 逻辑
      // 使用 performance.now() 提高精度
      if (heldTime > gameSettings.das) {
        const arrInterval = gameSettings.arr === 0 ? 0 : Math.max(gameSettings.arr, 1);
        
        if (key === controls.moveLeft && (arrInterval === 0 || timeSinceLastMove >= arrInterval)) {
          onMoveLeft();
          lastMoveTime.current[key] = timestamp;
        } else if (key === controls.moveRight && (arrInterval === 0 || timeSinceLastMove >= arrInterval)) {
          onMoveRight();
          lastMoveTime.current[key] = timestamp;
        } else if (key === controls.softDrop) {
          // 软降速度控制 - 优化计算使软降更快
          // SDF=0 表示瞬间下降，SDF越高下降越快
          if (gameSettings.sdf === 0 || gameSettings.sdf >= 100) {
            // 瞬间软降（每帧都执行）
            onSoftDrop();
            lastMoveTime.current[key] = timestamp;
          } else {
            // 正常软降速度：sdf 表示每秒下落格数
            // sdf=40 → 每秒40格 → 25ms/格
            const sdfInterval = Math.max(1, 1000 / Math.max(gameSettings.sdf, 1));
            if (timeSinceLastMove >= sdfInterval) {
              onSoftDrop();
              lastMoveTime.current[key] = timestamp;
            }
          }
        }
      }
    });
  }, [gameOver, paused, keys, gameSettings, onMoveLeft, onMoveRight, onSoftDrop]);

  // Enhanced useEffect with stable event handlers to prevent frequent re-binding
  useEffect(() => {
    console.log('useKeyboardControls: 重新绑定键盘事件监听器', { 
      controls: gameSettings.controls 
    });
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]); // Removed gameSettings.controls to reduce re-binding

  return {
    keys,
    processHeldKeys,
    keyPressedTime: keyPressedTime.current
  };
};
