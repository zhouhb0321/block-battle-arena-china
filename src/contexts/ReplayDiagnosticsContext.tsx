/**
 * Replay Diagnostics Context
 * Global state for replay diagnostics
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useReplayDiagnostics } from '@/hooks/useReplayDiagnostics';
import type { DiagnosticSnapshot, DiagnosticDifference } from '@/utils/replayV4/diagnostics';

interface ReplayDiagnosticsContextType {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  
  // Recording
  startRecording: () => void;
  recordSnapshot: (
    timestamp: number,
    currentPiece: { type: string; x: number; y: number; rotation: number },
    board: number[][],
    nextPieces: string[],
    holdPiece: string | null,
    score: number,
    lines: number,
    level: number
  ) => void;
  stopRecording: () => void;
  
  // Comparison
  recordedSnapshots: DiagnosticSnapshot[];
  replayedSnapshots: DiagnosticSnapshot[];
  differences: DiagnosticDifference[];
  compareSnapshots: (replayed: DiagnosticSnapshot[]) => void;
  
  // State
  isRecording: boolean;
  hasComparison: boolean;
  
  // Clear
  clear: () => void;
}

const ReplayDiagnosticsContext = createContext<ReplayDiagnosticsContextType | null>(null);

export function ReplayDiagnosticsProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [replayedSnapshots, setReplayedSnapshots] = useState<DiagnosticSnapshot[]>([]);
  const [differences, setDifferences] = useState<DiagnosticDifference[]>([]);
  
  const diagnostics = useReplayDiagnostics();
  
  const startRecording = useCallback(() => {
    if (!enabled) return;
    diagnostics.startDiagnostics();
  }, [enabled, diagnostics]);
  
  const recordSnapshot = useCallback((
    timestamp: number,
    currentPiece: { type: string; x: number; y: number; rotation: number },
    board: number[][],
    nextPieces: string[],
    holdPiece: string | null,
    score: number,
    lines: number,
    level: number
  ) => {
    if (!enabled) return;
    diagnostics.recordSnapshot(
      timestamp,
      currentPiece,
      board,
      nextPieces,
      holdPiece,
      score,
      lines,
      level
    );
  }, [enabled, diagnostics]);
  
  const stopRecording = useCallback(() => {
    diagnostics.stopDiagnostics();
  }, [diagnostics]);
  
  const compareSnapshots = useCallback((replayed: DiagnosticSnapshot[]) => {
    setReplayedSnapshots(replayed);
    const diffs = diagnostics.compareWithRecorded(replayed);
    setDifferences(diffs);
  }, [diagnostics]);
  
  const clear = useCallback(() => {
    diagnostics.clearDiagnostics();
    setReplayedSnapshots([]);
    setDifferences([]);
  }, [diagnostics]);
  
  const recordedSnapshots = diagnostics.getSnapshots();
  const hasComparison = recordedSnapshots.length > 0 && replayedSnapshots.length > 0;
  
  return (
    <ReplayDiagnosticsContext.Provider
      value={{
        enabled,
        setEnabled,
        startRecording,
        recordSnapshot,
        stopRecording,
        recordedSnapshots,
        replayedSnapshots,
        differences,
        compareSnapshots,
        isRecording: diagnostics.isRecording,
        hasComparison,
        clear
      }}
    >
      {children}
    </ReplayDiagnosticsContext.Provider>
  );
}

export function useReplayDiagnosticsContext() {
  const context = useContext(ReplayDiagnosticsContext);
  if (!context) {
    throw new Error('useReplayDiagnosticsContext must be used within ReplayDiagnosticsProvider');
  }
  return context;
}
