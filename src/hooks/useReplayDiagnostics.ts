/**
 * Replay Diagnostics Hook
 * Records diagnostic snapshots during gameplay and compares them during replay
 */

import { useRef, useCallback } from 'react';
import type { DiagnosticSnapshot, DiagnosticDifference } from '@/utils/replayV4/diagnostics';
import { compareSnapshots, formatDifferences, analyzeDifferences } from '@/utils/replayV4/diagnostics';
import { getGravityInfo } from '@/utils/gravitySystem';

export function useReplayDiagnostics() {
  const diagnosticSnapshotsRef = useRef<DiagnosticSnapshot[]>([]);
  const isRecordingDiagnosticsRef = useRef(false);
  const lockIndexRef = useRef(0);
  
  /**
   * Start recording diagnostic snapshots
   */
  const startDiagnostics = useCallback(() => {
    console.log('[Diagnostics] 🔍 Starting diagnostic recording');
    diagnosticSnapshotsRef.current = [];
    lockIndexRef.current = 0;
    isRecordingDiagnosticsRef.current = true;
  }, []);
  
  /**
   * Record a snapshot at lock time
   */
  const recordSnapshot = useCallback((
    timestamp: number,
    currentPiece: {
      type: string;
      x: number;
      y: number;
      rotation: number;
    },
    board: number[][],
    nextPieces: string[],
    holdPiece: string | null,
    score: number,
    lines: number,
    level: number
  ) => {
    if (!isRecordingDiagnosticsRef.current) return;
    
    const gravityInfo = getGravityInfo(lines);
    
    const snapshot: DiagnosticSnapshot = {
      timestamp,
      lockIndex: lockIndexRef.current,
      currentPiece: {
        type: currentPiece.type,
        x: currentPiece.x,
        y: currentPiece.y,
        rotation: currentPiece.rotation
      },
      board: JSON.parse(JSON.stringify(board)), // Deep copy
      nextPieces: [...nextPieces],
      holdPiece,
      score,
      lines,
      level,
      gravityLevel: gravityInfo.level,
      dropSpeed: gravityInfo.dropSpeed
    };
    
    diagnosticSnapshotsRef.current.push(snapshot);
    lockIndexRef.current++;
    
    console.log(`[Diagnostics] 📸 Snapshot #${snapshot.lockIndex} @ ${timestamp}ms:`, {
      piece: `${currentPiece.type} at (${currentPiece.x}, ${currentPiece.y}) R${currentPiece.rotation}`,
      score,
      lines,
      level
    });
  }, []);
  
  /**
   * Stop recording diagnostics
   */
  const stopDiagnostics = useCallback(() => {
    console.log('[Diagnostics] ⏹️ Stopped diagnostic recording:', {
      totalSnapshots: diagnosticSnapshotsRef.current.length
    });
    isRecordingDiagnosticsRef.current = false;
  }, []);
  
  /**
   * Compare replay snapshots with recorded snapshots
   */
  const compareWithRecorded = useCallback((
    replaySnapshots: DiagnosticSnapshot[]
  ): DiagnosticDifference[] => {
    console.log('[Diagnostics] 🔬 Starting comparison:', {
      recordedSnapshots: diagnosticSnapshotsRef.current.length,
      replaySnapshots: replaySnapshots.length
    });
    
    const allDifferences: DiagnosticDifference[] = [];
    
    const minLength = Math.min(
      diagnosticSnapshotsRef.current.length,
      replaySnapshots.length
    );
    
    for (let i = 0; i < minLength; i++) {
      const recorded = diagnosticSnapshotsRef.current[i];
      const replayed = replaySnapshots[i];
      
      const differences = compareSnapshots(recorded, replayed);
      
      if (differences.length > 0) {
        console.warn(`[Diagnostics] ⚠️ Differences at Lock #${i}:`, differences);
        allDifferences.push(...differences);
        
        // Stop at first critical difference for detailed analysis
        const hasCritical = differences.some(d => d.severity === 'critical');
        if (hasCritical) {
          console.error('[Diagnostics] 🔴 First critical difference found at Lock #' + i);
          console.error('[Diagnostics] Recorded state:', recorded);
          console.error('[Diagnostics] Replayed state:', replayed);
          break;
        }
      }
    }
    
    // Check if snapshot counts differ
    if (diagnosticSnapshotsRef.current.length !== replaySnapshots.length) {
      console.warn('[Diagnostics] ⚠️ Snapshot count mismatch:', {
        recorded: diagnosticSnapshotsRef.current.length,
        replayed: replaySnapshots.length
      });
    }
    
    // Output results
    const report = formatDifferences(allDifferences);
    console.log('[Diagnostics] 📊 Comparison Report:', report);
    
    const suggestions = analyzeDifferences(allDifferences);
    console.log('[Diagnostics] 💡 Suggestions:');
    suggestions.forEach(s => console.log('  ' + s));
    
    return allDifferences;
  }, []);
  
  /**
   * Get all recorded snapshots
   */
  const getSnapshots = useCallback(() => {
    return diagnosticSnapshotsRef.current;
  }, []);
  
  /**
   * Clear all diagnostic data
   */
  const clearDiagnostics = useCallback(() => {
    diagnosticSnapshotsRef.current = [];
    lockIndexRef.current = 0;
    isRecordingDiagnosticsRef.current = false;
    console.log('[Diagnostics] 🗑️ Cleared all diagnostic data');
  }, []);
  
  return {
    startDiagnostics,
    recordSnapshot,
    stopDiagnostics,
    compareWithRecorded,
    getSnapshots,
    clearDiagnostics,
    isRecording: isRecordingDiagnosticsRef.current
  };
}
