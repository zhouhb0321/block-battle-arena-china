import { useState, useCallback } from 'react';

export interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

export interface UndoRedoActions<T> {
  set: (newPresent: T) => void;
  reset: (newPresent: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const MAX_HISTORY_LENGTH = 50;

export function useUndoRedo<T>(initialPresent: T, gameMode: string = ''): [T, UndoRedoActions<T>] {
  const [state, setState] = useState<UndoRedoState<T>>({
    past: [],
    present: initialPresent,
    future: []
  });

  // 只有无尽模式和马拉松模式支持撤销重做
  const isEndlessMode = gameMode === 'endless' || gameMode === 'marathon';
  const canUndo = isEndlessMode && state.past.length > 0;
  const canRedo = isEndlessMode && state.future.length > 0;

  const undo = useCallback(() => {
    if (!isEndlessMode) return;
    
    setState((currentState) => {
      if (currentState.past.length === 0) return currentState;
      
      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, currentState.past.length - 1);
      
      return {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future]
      };
    });
  }, [isEndlessMode]);

  const redo = useCallback(() => {
    if (!isEndlessMode) return;
    
    setState((currentState) => {
      if (currentState.future.length === 0) return currentState;
      
      const next = currentState.future[0];
      const newFuture = currentState.future.slice(1);
      
      return {
        past: [...currentState.past, currentState.present],
        present: next,
        future: newFuture
      };
    });
  }, [isEndlessMode]);

  const set = useCallback((newPresent: T) => {
    if (!isEndlessMode) return;
    setState((currentState) => {
      if (currentState.present === newPresent) return currentState;
      
      // Limit history length
      let newPast = [...currentState.past, currentState.present];
      if (newPast.length > MAX_HISTORY_LENGTH) {
        newPast = newPast.slice(-MAX_HISTORY_LENGTH);
      }
      
      return {
        past: newPast,
        present: newPresent,
        future: []
      };
    });
  }, [isEndlessMode]);

  const reset = useCallback((newPresent: T) => {
    setState({
      past: [],
      present: newPresent,
      future: []
    });
  }, []);

  return [
    state.present,
    { set, reset, undo, redo, canUndo, canRedo }
  ];
}