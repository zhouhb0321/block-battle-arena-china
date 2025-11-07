import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useReplayRecorderV4 } from '@/hooks/useReplayRecorderV4';

interface GameStats {
  score: number;
  lines: number;
  level: number;
  duration: number;
  pps: number;
  apm: number;
}

interface GameRecordingContextType {
  isActive: boolean;
  isRecording: boolean;
  isReplaying: boolean; // ✅ 新增
  setGameActive: (active: boolean) => void;
  setReplaying: (replaying: boolean) => void; // ✅ 新增
  saveAndQuit: () => Promise<boolean>;
  registerRecorder: (recorder: ReturnType<typeof useReplayRecorderV4>) => void;
  registerStatsGetter: (getter: () => GameStats) => void;
  registerGameModeGetter: (getter: () => string) => void;
}

const GameRecordingContext = createContext<GameRecordingContextType | undefined>(undefined);

export const useGameRecording = () => {
  const context = useContext(GameRecordingContext);
  if (context === undefined) {
    throw new Error('useGameRecording must be used within a GameRecordingProvider');
  }
  return context;
};

export const GameRecordingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false); // ✅ 新增
  const recorderRef = useRef<ReturnType<typeof useReplayRecorderV4> | null>(null);
  const statsGetterRef = useRef<(() => GameStats) | null>(null);
  const gameModeGetterRef = useRef<(() => string) | null>(null);

  const setGameActive = useCallback((active: boolean) => {
    console.log('[GameRecording] Game active state changed:', active);
    setIsActive(active);
  }, []);

  const registerRecorder = useCallback((recorder: ReturnType<typeof useReplayRecorderV4>) => {
    console.log('[GameRecording] Recorder registered');
    recorderRef.current = recorder;
  }, []);

  const registerStatsGetter = useCallback((getter: () => GameStats) => {
    statsGetterRef.current = getter;
  }, []);

  const registerGameModeGetter = useCallback((getter: () => string) => {
    gameModeGetterRef.current = getter;
  }, []);

  const saveAndQuit = useCallback(async (): Promise<boolean> => {
    console.log('[GameRecording] saveAndQuit called', {
      hasRecorder: !!recorderRef.current,
      isRecording: recorderRef.current?.isRecording,
      hasStatsGetter: !!statsGetterRef.current,
      hasGameModeGetter: !!gameModeGetterRef.current
    });

    if (!recorderRef.current || !recorderRef.current.isRecording) {
      console.log('[GameRecording] No active recording to save');
      return true;
    }

    if (!statsGetterRef.current || !gameModeGetterRef.current) {
      console.error('[GameRecording] Missing stats or game mode getter');
      return false;
    }

    try {
      const stats = statsGetterRef.current();
      const gameMode = gameModeGetterRef.current();
      
      console.log('[GameRecording] Saving replay before quit', { stats, gameMode });
      
      const result = await recorderRef.current.stopRecording(stats, gameMode, 'quit');
      
      if (result.saved) {
        console.log('[GameRecording] Replay saved successfully');
        setIsActive(false);
        return true;
      } else {
        console.error('[GameRecording] Failed to save replay');
        return false;
      }
    } catch (error) {
      console.error('[GameRecording] Error saving replay:', error);
      return false;
    }
  }, []);

  const value: GameRecordingContextType = {
    isActive,
    isRecording: recorderRef.current?.isRecording || false,
    isReplaying, // ✅ 新增
    setGameActive,
    setReplaying: setIsReplaying, // ✅ 新增
    saveAndQuit,
    registerRecorder,
    registerStatsGetter,
    registerGameModeGetter
  };

  return (
    <GameRecordingContext.Provider value={value}>
      {children}
    </GameRecordingContext.Provider>
  );
};
