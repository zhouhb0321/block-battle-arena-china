
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
  onInstantSoftDrop?: () => void;
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
  canRedo = false,
  onInstantSoftDrop
}: UseKeyboardControlsProps) => {
  const [keys, setKeys] = useState<Set<string>>(new Set());
  // Mirror keys to a ref so processHeldKeys can read the latest set
  // without waiting for a React re-render (eliminates ~16ms input lag).
  const keysRef = useRef<Set<string>>(new Set());
  const keyPressedTime = useRef<{[key: string]: number}>({});
  const lastMoveTime = useRef<{[key: string]: number}>({});
  const lastDirection = useRef<'left' | 'right' | null>(null);
  const dcdActiveUntil = useRef<number>(0);

  // Use refs for all action callbacks to prevent handleKeyDown recreation
  const actionsRef = useRef({
    onMoveLeft, onMoveRight, onSoftDrop, onHardDrop,
    onRotateClockwise, onRotateCounterclockwise, onRotate180,
    onHold, onPause, onBackToMenu, onUndo, onRedo,
    onInstantSoftDrop
  });
  useEffect(() => {
    actionsRef.current = {
      onMoveLeft, onMoveRight, onSoftDrop, onHardDrop,
      onRotateClockwise, onRotateCounterclockwise, onRotate180,
      onHold, onPause, onBackToMenu, onUndo, onRedo,
      onInstantSoftDrop
    };
  });

  const gameStateRef = useRef({ gameOver, paused, canUndo, canRedo });
  useEffect(() => {
    gameStateRef.current = { gameOver, paused, canUndo, canRedo };
  });

  const settingsRef = useRef(gameSettings);
  useEffect(() => {
    settingsRef.current = gameSettings;
  });

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }

    const { gameOver: go, paused: p, canUndo: cu, canRedo: cr } = gameStateRef.current;
    const actions = actionsRef.current;

    // Ctrl+Z / Ctrl+Y
    if (event.ctrlKey && !go) {
      if (event.code === 'KeyZ' && actions.onUndo && cu) {
        event.preventDefault();
        actions.onUndo();
        return;
      }
      if (event.code === 'KeyY' && actions.onRedo && cr) {
        event.preventDefault();
        actions.onRedo();
        return;
      }
    }

    const { controls } = settingsRef.current;
    const now = performance.now();
    
    if (!keyPressedTime.current[event.code]) {
      keyPressedTime.current[event.code] = now;
      
      if (!go && !p) {
        if (event.code === controls.rotateClockwise) {
          actions.onRotateClockwise();
        } else if (event.code === controls.rotateCounterclockwise) {
          actions.onRotateCounterclockwise();
        } else if (event.code === controls.rotate180 && actions.onRotate180) {
          actions.onRotate180();
        } else if (event.code === controls.hardDrop) {
          actions.onHardDrop();
        } else if (event.code === controls.hold) {
          actions.onHold();
        }
      }
      
      if (event.code === controls.pause) {
        actions.onPause();
      } else if (event.code === controls.backToMenu && actions.onBackToMenu) {
        actions.onBackToMenu();
      }
      
      if (!go && !p) {
        if (event.code === controls.moveLeft) {
          actions.onMoveLeft();
          lastMoveTime.current[event.code] = now;
        } else if (event.code === controls.moveRight) {
          actions.onMoveRight();
          lastMoveTime.current[event.code] = now;
        } else if (event.code === controls.softDrop) {
          actions.onSoftDrop();
          lastMoveTime.current[event.code] = now;
        }
      }
    }
    
    keysRef.current.add(event.code);
    setKeys(prev => {
      if (prev.has(event.code)) return prev;
      const next = new Set(prev);
      next.add(event.code);
      return next;
    });
  }, []); // No dependencies — reads from refs

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    delete keyPressedTime.current[event.code];
    delete lastMoveTime.current[event.code];
    keysRef.current.delete(event.code);
    setKeys(prev => {
      if (!prev.has(event.code)) return prev;
      const newKeys = new Set(prev);
      newKeys.delete(event.code);
      return newKeys;
    });
  }, []);

  const processHeldKeys = useCallback((timestamp: number) => {
    const { gameOver: go, paused: p } = gameStateRef.current;
    if (go || p) return;

    const gs = settingsRef.current;
    const { controls } = gs;
    const actions = actionsRef.current;
    
    const liveKeys = keysRef.current;
    const currentDirection = liveKeys.has(controls.moveLeft) ? 'left' : 
                            liveKeys.has(controls.moveRight) ? 'right' : null;

    if (currentDirection && currentDirection !== lastDirection.current && lastDirection.current !== null) {
      if (gs.dcd > 0) {
        dcdActiveUntil.current = timestamp + gs.dcd;
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

    if (timestamp < dcdActiveUntil.current) {
      return;
    }
    
    liveKeys.forEach(key => {
      const pressTime = keyPressedTime.current[key] || 0;
      const lastMove = lastMoveTime.current[key] || 0;
      const heldTime = timestamp - pressTime;
      const timeSinceLastMove = timestamp - lastMove;
      
      if (key === controls.softDrop) {
        if (gs.sdf >= 999 && actions.onInstantSoftDrop) {
          if (timeSinceLastMove >= 50) {
            actions.onInstantSoftDrop();
            lastMoveTime.current[key] = timestamp;
          }
        } else if (gs.sdf >= 60) {
          const fastInterval = Math.max(8, 1000 / gs.sdf);
          if (timeSinceLastMove >= fastInterval) {
            actions.onSoftDrop();
            lastMoveTime.current[key] = timestamp;
          }
        } else if (gs.sdf > 0) {
          const sdfInterval = Math.max(10, 1000 / gs.sdf);
          if (timeSinceLastMove >= sdfInterval) {
            actions.onSoftDrop();
            lastMoveTime.current[key] = timestamp;
          }
        }
        return;
      }
      
      if (heldTime > gs.das) {
        const arrInterval = gs.arr === 0 ? 0 : Math.max(gs.arr, 1);
        
        if (key === controls.moveLeft) {
          if (arrInterval === 0) {
            actions.onMoveLeft();
            lastMoveTime.current[key] = timestamp;
          } else if (timeSinceLastMove >= arrInterval) {
            actions.onMoveLeft();
            lastMoveTime.current[key] = timestamp;
          }
        } else if (key === controls.moveRight) {
          if (arrInterval === 0) {
            actions.onMoveRight();
            lastMoveTime.current[key] = timestamp;
          } else if (timeSinceLastMove >= arrInterval) {
            actions.onMoveRight();
            lastMoveTime.current[key] = timestamp;
          }
        }
      }
    });
  }, []); // Reads from keysRef — no re-renders needed

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
