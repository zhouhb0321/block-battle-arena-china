/**
 * Replay Player V4 - Keyframe-based playback with auto-play and enhanced feedback
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import type { V4ReplayData, V4Event, V4LockEvent, V4KeyframeEvent } from '@/utils/replayV4/types';
import { ReplayOpcode } from '@/utils/replayV4/types';
import GameBoard from './GameBoard';
import { TETROMINO_TYPES, rotatePiece } from '@/utils/pieceGeneration';
import { placePiece, clearLines } from '@/utils/tetrisCore';
import { calculateScore } from '@/utils/scoringSystem';
import type { GamePiece } from '@/utils/gameTypes';

interface ReplayPlayerV4Props {
  replay: V4ReplayData;
  onClose?: () => void;
  autoPlay?: boolean;
}

export default function ReplayPlayerV4({ replay, onClose, autoPlay = true }: ReplayPlayerV4Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // Game state
  const [board, setBoard] = useState<number[][]>([]);
  const [nextPieces, setNextPieces] = useState<string[]>([]);
  const [holdPiece, setHoldPiece] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);
  const lastLogTimeRef = useRef<number>(0);

  // Sorted events for efficient processing
  const sortedEventsRef = useRef<V4Event[]>([]);
  const sortedKeyframesRef = useRef<V4KeyframeEvent[]>([]);
  const sortedLocksRef = useRef<V4LockEvent[]>([]);

  const totalDuration = replay.stats.duration;

  // Initialize sorted events and game state
  useEffect(() => {
    // Sort events by timestamp
    sortedEventsRef.current = [...replay.events].sort((a, b) => a.timestamp - b.timestamp);
    sortedKeyframesRef.current = sortedEventsRef.current.filter(e => e.type === ReplayOpcode.KF) as V4KeyframeEvent[];
    sortedLocksRef.current = sortedEventsRef.current.filter(e => e.type === ReplayOpcode.LOCK) as V4LockEvent[];

    const firstKF = sortedKeyframesRef.current[0];
    const firstLock = sortedLocksRef.current[0];
    
    console.info('[PlayerV4] Replay initialized', {
      totalDuration: replay.stats.duration,
      keyframes: sortedKeyframesRef.current.length,
      locks: sortedLocksRef.current.length,
      firstKFTime: firstKF?.timestamp ?? 'none',
      firstLockTime: firstLock?.timestamp ?? 'none'
    });
    
    if (firstKF) {
      setBoard(JSON.parse(JSON.stringify(firstKF.board)));
      setNextPieces([...firstKF.nextPieces]);
      setHoldPiece(firstKF.holdPiece);
      setScore(firstKF.score);
      setLines(firstKF.lines);
      setLevel(firstKF.level);
      console.log('[PlayerV4] Initialized from first keyframe at', firstKF.timestamp, 'ms');
    } else {
      // Fallback: empty board with initial sequence
      const emptyBoard = Array(23).fill(null).map(() => Array(10).fill(0));
      setBoard(emptyBoard);
      setNextPieces(replay.metadata.initialPieceSequence.slice(0, 5));
      setScore(0);
      setLines(0);
      setLevel(1);
      setHoldPiece(null);
      console.warn('[PlayerV4] No keyframes found, using empty initial state');
    }
  }, [replay]);

  // Auto-play on mount if enabled
  useEffect(() => {
    if (autoPlay) {
      console.info('[PlayerV4] Auto-start playback at t=0ms');
      setIsPlaying(true);
    }
  }, [autoPlay]);

  // Find the most recent keyframe before or at current time
  const findRelevantKeyframe = useCallback((timestamp: number): V4KeyframeEvent | null => {
    const keyframes = sortedKeyframesRef.current;
    
    if (keyframes.length === 0) {
      const emptyBoard = Array(23).fill(null).map(() => Array(10).fill(0));
      return {
        type: ReplayOpcode.KF,
        timestamp: 0,
        board: emptyBoard,
        nextPieces: replay.metadata.initialPieceSequence.slice(0, 7),
        holdPiece: null,
        score: 0,
        lines: 0,
        level: 1
      } as V4KeyframeEvent;
    }

    const firstKF = keyframes[0];
    
    // If before first keyframe, create virtual initial state at timestamp 0
    if (timestamp < firstKF.timestamp) {
      const emptyBoard = Array(23).fill(null).map(() => Array(10).fill(0));
      return {
        type: ReplayOpcode.KF,
        timestamp: 0,
        board: emptyBoard,
        nextPieces: replay.metadata.initialPieceSequence.slice(0, 7),
        holdPiece: null,
        score: 0,
        lines: 0,
        level: 1
      } as V4KeyframeEvent;
    }
    
    // Find latest keyframe <= timestamp
    let mostRecent = firstKF;
    for (const kf of keyframes) {
      if (kf.timestamp <= timestamp) {
        mostRecent = kf;
      } else {
        break; // Sorted, so we can break early
      }
    }
    
    return mostRecent;
  }, [replay.metadata.initialPieceSequence]);

  // Reconstruct game state at target time using keyframe-based approach
  const reconstructState = useCallback((targetTime: number) => {
    const kf = findRelevantKeyframe(targetTime);
    
    if (!kf) {
      console.warn('[PlayerV4] No keyframe found for time:', targetTime);
      return;
    }
    
    // Start from keyframe snapshot
    let workingBoard: number[][] = JSON.parse(JSON.stringify(kf.board));
    let workingLines = kf.lines;
    let workingScore = kf.score;
    let workingLevel = kf.level;
    let combo = 0;
    let b2b = false;

    let locksApplied = 0;

    // Apply LOCK events between keyframe and target time
    const locks = sortedLocksRef.current;
    for (const le of locks) {
      if (le.timestamp <= kf.timestamp) continue;
      if (le.timestamp > targetTime) break;

      const base = TETROMINO_TYPES[le.pieceType];
      if (!base) continue;

      // Rotate base tetromino to the event's rotation index
      const rotCount = ((le.rotation % 4) + 4) % 4;
      let rotated = base;
      for (let i = 0; i < rotCount; i++) rotated = rotatePiece(rotated, true);

      const piece: GamePiece = {
        type: rotated,
        x: le.x,
        y: le.y,
        rotation: rotCount
      };

      // Place the piece and clear lines
      workingBoard = placePiece(workingBoard, piece);
      const cleared = clearLines(workingBoard);
      workingBoard = cleared.newBoard;
      const linesCleared = typeof le.linesCleared === 'number' ? le.linesCleared : cleared.linesCleared;
      workingLines += linesCleared;

      // Calculate score dynamically
      if (linesCleared > 0) {
        const tSpin = (le.isTSpin && le.isMini) ? 'mini' : (le.isTSpin ? 'normal' : 'none');
        const isPerfectClear = workingBoard.every(row => row.every(cell => cell === 0));
        
        const scoreResult = calculateScore({
          linesCleared,
          tSpin,
          isB2B: b2b,
          combo,
          isPerfectClear
        });

        workingScore += scoreResult.score;

        // Update B2B and combo state
        if (scoreResult.isDifficult) {
          b2b = true;
        } else {
          b2b = false;
        }
        combo++;
      } else {
        combo = 0;
      }

      locksApplied++;
    }

    // Commit reconstructed state
    setBoard(workingBoard);
    setNextPieces([...kf.nextPieces]);
    setHoldPiece(kf.holdPiece);
    setScore(workingScore);
    setLines(workingLines);
    setLevel(workingLevel);
    
    console.debug('[PlayerV4] Reconstructed state', {
      kfTime: kf.timestamp,
      targetTime,
      locksApplied
    });
  }, [findRelevantKeyframe]);

  // Playback loop with throttled logging
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
        console.info('[PlayerV4] Playback paused at', currentTime.toFixed(0), 'ms');
      }
      return;
    }

    console.info('[PlayerV4] Playback started/resumed at', currentTime.toFixed(0), 'ms, speed', playbackSpeed, 'x');

    lastUpdateRef.current = performance.now();

    const frame = (now: number) => {
      const delta = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      setCurrentTime(prev => {
        const next = prev + delta * playbackSpeed;
        if (next >= totalDuration) {
          setIsPlaying(false);
          console.info('[PlayerV4] Playback finished at', totalDuration, 'ms');
          return totalDuration;
        }

        // Throttled logging every ~1000ms
        if (next - lastLogTimeRef.current > 1000) {
          const locksAppliedSoFar = sortedLocksRef.current.filter(l => l.timestamp <= next).length;
          const nextLock = sortedLocksRef.current.find(l => l.timestamp > next);
          console.debug('[PlayerV4] RAF tick', {
            t: next.toFixed(0) + 'ms',
            locksApplied: locksAppliedSoFar,
            nextLockAt: nextLock ? nextLock.timestamp.toFixed(0) + 'ms' : 'none'
          });
          lastLogTimeRef.current = next;
        }

        return next;
      });

      animationFrameRef.current = requestAnimationFrame(frame);
    };

    animationFrameRef.current = requestAnimationFrame(frame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };
  }, [isPlaying, playbackSpeed, totalDuration]);

  // Update state when time changes
  useEffect(() => {
    reconstructState(currentTime);
  }, [currentTime, reconstructState]);

  const handlePlayPause = () => {
    const newState = !isPlaying;
    console.info('[PlayerV4] User toggled playback', { 
      from: isPlaying ? 'playing' : 'paused',
      to: newState ? 'playing' : 'paused',
      currentTime: currentTime.toFixed(0) + 'ms',
      speed: playbackSpeed
    });
    setIsPlaying(newState);
  };

  const handleReset = () => {
    console.info('[PlayerV4] Reset to t=0');
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    console.info('[PlayerV4] User seeked to', newTime.toFixed(0), 'ms');
    setIsPlaying(false);
    setCurrentTime(newTime);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Find next lock event for visual feedback
  const getNextLockInfo = (): string => {
    const nextLock = sortedLocksRef.current.find(l => l.timestamp > currentTime);
    if (!nextLock) return '—';
    const deltaMs = nextLock.timestamp - currentTime;
    return (deltaMs / 1000).toFixed(1) + 's';
  };

  // Spacebar to play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>录像回放 V4 - {replay.metadata.gameMode}</span>
            <Button variant="ghost" size="sm" onClick={onClose}>关闭</Button>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Info banner */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm">
            <div className="font-semibold text-primary mb-1">🎬 V4 格式回放 (已自动播放，Space 暂停/播放)</div>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <div>玩家: {replay.metadata.username}</div>
              <div>模式: {replay.metadata.gameMode}</div>
              <div>锁定数: {replay.stats.lockCount}</div>
              <div>关键帧: {replay.stats.keyframeCount}</div>
              <div>总事件: {replay.events.length}</div>
              <div>校验和: {replay.checksum.slice(0, 8)}...</div>
            </div>
          </div>

          {/* Game display */}
          <div className="flex gap-6 justify-center items-start">
            <div>
              <GameBoard 
                board={board}
                currentPiece={null}
                ghostPiece={null}
                enableGhost={false}
              />
            </div>
            
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-2">
                  <div className="text-2xl font-bold">{score.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">得分</div>
                  <div className="text-lg">{lines} 行</div>
                  <div className="text-sm text-muted-foreground">等级 {level}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm font-medium mb-2">Next</div>
                  <div className="space-y-1">
                    {nextPieces.slice(0, 3).map((piece, i) => (
                      <div key={i} className="text-xs text-muted-foreground">
                        {piece}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {holdPiece && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium mb-2">Hold</div>
                    <div className="text-xs text-muted-foreground">{holdPiece}</div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium min-w-20">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                min={0}
                max={totalDuration}
                step={100}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground min-w-20">
                {formatTime(totalDuration)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>状态: <span className="text-foreground font-medium">{isPlaying ? '播放中' : '已暂停'}</span></div>
              <div>锁定: <span className="text-foreground font-medium">
                {sortedLocksRef.current.filter(e => e.timestamp <= currentTime).length} / {replay.stats.lockCount}
              </span></div>
              <div>下次锁定: <span className="text-foreground font-medium">{getNextLockInfo()}</span></div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePlayPause}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <FastForward className="h-4 w-4" />
                <Slider
                  value={[playbackSpeed]}
                  min={0.25}
                  max={2}
                  step={0.25}
                  onValueChange={(v) => setPlaybackSpeed(v[0])}
                  className="w-32"
                />
                <span className="text-sm min-w-8">{playbackSpeed}x</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">PPS:</span>{' '}
              <span className="font-medium">{replay.stats.pps.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">APM:</span>{' '}
              <span className="font-medium">{replay.stats.apm.toFixed(0)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">时长:</span>{' '}
              <span className="font-medium">{formatTime(replay.stats.duration)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">最终分数:</span>{' '}
              <span className="font-medium">{replay.stats.finalScore.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}