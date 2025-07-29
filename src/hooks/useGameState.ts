import { useState, useCallback } from 'react';
import type { Board, GamePiece } from '@/utils/gameTypes';

interface GameStateSnapshot {
  board: Board;
  currentPiece: GamePiece | null;
  score: number;
  lines: number;
  level: number;
  timestamp: number;
}

interface UseGameStateProps {
  maxHistorySize?: number;
  enabled?: boolean;
}

export const useGameState = ({ maxHistorySize = 100, enabled = true }: UseGameStateProps = {}) => {
  const [history, setHistory] = useState<GameStateSnapshot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const saveState = useCallback((
    board: Board,
    currentPiece: GamePiece | null,
    score: number,
    lines: number,
    level: number
  ) => {
    if (!enabled) return;

    const snapshot: GameStateSnapshot = {
      board: board.map(row => [...row]),
      currentPiece: currentPiece ? { ...currentPiece } : null,
      score,
      lines,
      level,
      timestamp: Date.now()
    };

    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(snapshot);
      
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        return newHistory;
      }
      
      return newHistory;
    });

    setCurrentIndex(prev => Math.min(prev + 1, maxHistorySize - 1));
  }, [enabled, maxHistorySize, currentIndex]);

  const undo = useCallback((): GameStateSnapshot | null => {
    if (!enabled || currentIndex <= 0) return null;

    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    return history[newIndex];
  }, [enabled, currentIndex, history]);

  const redo = useCallback((): GameStateSnapshot | null => {
    if (!enabled || currentIndex >= history.length - 1) return null;

    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    return history[newIndex];
  }, [enabled, currentIndex, history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  const canUndo = enabled && currentIndex > 0;
  const canRedo = enabled && currentIndex < history.length - 1;

  return {
    saveState,
    undo,
    redo,
    clearHistory,
    canUndo,
    canRedo,
    historySize: history.length,
    currentIndex
  };
};