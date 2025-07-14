
import { useState, useCallback } from 'react';
import type { GameState } from '@/utils/gameTypes';

interface GameHistoryState {
  gameState: GameState;
  timestamp: number;
}

export const useGameHistory = (maxSteps: number = 50) => {
  const [history, setHistory] = useState<GameHistoryState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const saveState = useCallback((gameState: GameState) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push({
        gameState: JSON.parse(JSON.stringify(gameState)),
        timestamp: Date.now()
      });
      
      // Limit history size
      if (newHistory.length > maxSteps) {
        newHistory.shift();
        return newHistory;
      }
      
      return newHistory;
    });
    
    setCurrentIndex(prev => Math.min(prev + 1, maxSteps - 1));
  }, [currentIndex, maxSteps]);

  const undo = useCallback((): GameState | null => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return history[currentIndex - 1]?.gameState || null;
    }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback((): GameState | null => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return history[currentIndex + 1]?.gameState || null;
    }
    return null;
  }, [currentIndex, history]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  return {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    historyLength: history.length
  };
};
