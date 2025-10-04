/**
 * Replay Player V4 - Keyframe-based playback
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import type { V4ReplayData, V4Event, V4LockEvent, V4KeyframeEvent } from '@/utils/replayV4/types';
import { ReplayOpcode } from '@/utils/replayV4/types';
import GameBoard from './GameBoard';

interface ReplayPlayerV4Props {
  replay: V4ReplayData;
  onClose?: () => void;
}

export default function ReplayPlayerV4({ replay, onClose }: ReplayPlayerV4Props) {
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
  const processedEventsRef = useRef<Set<number>>(new Set());

  const totalDuration = replay.stats.duration;

  // Initialize with first keyframe or empty board
  useEffect(() => {
    const firstKF = replay.events.find(e => e.type === ReplayOpcode.KF) as V4KeyframeEvent | undefined;
    
    if (firstKF) {
      setBoard(firstKF.board);
      setNextPieces(firstKF.nextPieces);
      setHoldPiece(firstKF.holdPiece);
      setScore(firstKF.score);
      setLines(firstKF.lines);
      setLevel(firstKF.level);
      console.log('[PlayerV4] Initialized from first keyframe');
    } else {
      // Fallback: empty board
      setBoard(Array(20).fill(null).map(() => Array(10).fill(0)));
      setNextPieces(replay.metadata.initialPieceSequence.slice(0, 5));
      console.log('[PlayerV4] Initialized with empty board');
    }
  }, [replay]);

  // Find the most recent keyframe before current time
  const findRelevantKeyframe = useCallback((timestamp: number): V4KeyframeEvent | null => {
    let mostRecent: V4KeyframeEvent | null = null;
    
    for (const event of replay.events) {
      if (event.type === ReplayOpcode.KF && event.timestamp <= timestamp) {
        mostRecent = event as V4KeyframeEvent;
      } else if (event.timestamp > timestamp) {
        break;
      }
    }
    
    return mostRecent;
  }, [replay.events]);

  // Apply events from keyframe to current time
  const reconstructState = useCallback((targetTime: number) => {
    // Find most recent keyframe
    const kf = findRelevantKeyframe(targetTime);
    
    if (kf) {
      // Start from keyframe
      setBoard(JSON.parse(JSON.stringify(kf.board)));
      setNextPieces([...kf.nextPieces]);
      setHoldPiece(kf.holdPiece);
      setScore(kf.score);
      setLines(kf.lines);
      setLevel(kf.level);
      
      // Apply LOCK events between keyframe and target
      let currentBoard = JSON.parse(JSON.stringify(kf.board));
      let currentScore = kf.score;
      let currentLines = kf.lines;
      let currentLevel = kf.level;
      
      for (const event of replay.events) {
        if (event.timestamp > kf.timestamp && event.timestamp <= targetTime) {
          if (event.type === ReplayOpcode.LOCK) {
            const lockEvent = event as V4LockEvent;
            
            // Apply lock to board (simplified - just mark cells)
            const pieceTypeMap: Record<string, number> = {
              'I': 1, 'O': 2, 'T': 3, 'S': 4, 'Z': 5, 'J': 6, 'L': 7
            };
            const cellValue = pieceTypeMap[lockEvent.pieceType] || 1;
            
            // Mark the lock position (simplified)
            if (lockEvent.y >= 0 && lockEvent.y < 20 && lockEvent.x >= 0 && lockEvent.x < 10) {
              currentBoard[lockEvent.y][lockEvent.x] = cellValue;
            }
            
            currentLines += lockEvent.linesCleared;
            
            // Simplified score calculation
            currentScore += lockEvent.linesCleared * 100 * (lockEvent.isTSpin ? 4 : 1);
          }
        }
      }
      
      setBoard(currentBoard);
      setScore(currentScore);
      setLines(currentLines);
      setLevel(currentLevel);
    }
  }, [replay.events, findRelevantKeyframe]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    lastUpdateRef.current = performance.now();

    const frame = (now: number) => {
      const delta = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      setCurrentTime(prev => {
        const next = prev + delta * playbackSpeed;
        if (next >= totalDuration) {
          setIsPlaying(false);
          return totalDuration;
        }
        return next;
      });

      animationFrameRef.current = requestAnimationFrame(frame);
    };

    animationFrameRef.current = requestAnimationFrame(frame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, totalDuration]);

  // Update state when time changes
  useEffect(() => {
    reconstructState(currentTime);
  }, [currentTime, reconstructState]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    processedEventsRef.current.clear();
  };

  const handleSeek = (value: number[]) => {
    setIsPlaying(false);
    setCurrentTime(value[0]);
    processedEventsRef.current.clear();
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

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
            <div className="font-semibold text-primary mb-1">🎬 V4 格式回放</div>
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
              <span className="text-sm font-medium min-w-16">
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
              <span className="text-sm text-muted-foreground min-w-16">
                {formatTime(totalDuration)}
              </span>
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
