import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, X, Zap, Trophy, Award } from 'lucide-react';
import { V4ReplayData, V4KeyframeEvent, V4LockEvent, V4InputEvent, ReplayOpcode } from '@/utils/replayV4/types';
import { getPieceShape } from '@/utils/tetrominoShapes';
import { getTetrominoColor } from '@/utils/blockColors';
import GameBoard from './GameBoard';
import NextPiecePreview from './NextPiecePreview';
import HoldPieceDisplay from './HoldPieceDisplay';

interface ReplayPlayerV4OptimizedProps {
  replay: V4ReplayData;
  onClose?: () => void;
  autoPlay?: boolean;
}

interface AchievementNotification {
  type: 'tetris' | 'tspin' | 'combo' | 'perfect-clear';
  text: string;
  timestamp: number;
}

export const ReplayPlayerV4Optimized: React.FC<ReplayPlayerV4OptimizedProps> = ({
  replay,
  onClose,
  autoPlay = true
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showDetails, setShowDetails] = useState(false);
  const lastFrameTime = useRef<number>(Date.now());
  const [recentAchievement, setRecentAchievement] = useState<AchievementNotification | null>(null);
  
  // State cache for performance
  const stateCache = useRef<Map<number, any>>(new Map());

  // Sort and separate events
  const { keyframes, lockEvents, sortedEvents, duration } = useMemo(() => {
    const sorted = [...replay.events].sort((a, b) => a.timestamp - b.timestamp);
    const kfs = sorted.filter(e => e.type === ReplayOpcode.KF) as V4KeyframeEvent[];
    const locks = sorted.filter(e => e.type === ReplayOpcode.LOCK) as V4LockEvent[];
    const dur = sorted.length > 0 ? sorted[sorted.length - 1].timestamp : 0;
    return { keyframes: kfs, lockEvents: locks, sortedEvents: sorted, duration: dur };
  }, [replay.events]);

  // Find relevant keyframe with binary search
  const findRelevantKeyframe = useCallback((targetTime: number): V4KeyframeEvent | null => {
    if (keyframes.length === 0) return null;
    if (targetTime < keyframes[0].timestamp) return null;

    let left = 0;
    let right = keyframes.length - 1;
    let result = keyframes[0];

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (keyframes[mid].timestamp <= targetTime) {
        result = keyframes[mid];
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return result;
  }, [keyframes]);

  // ✅ P0 新增：帧间插值动画系统
  const getAnimatedPieceState = useCallback((targetTime: number) => {
    // 1. 找到最后一个 SPAWN 事件
    const spawnEvents = sortedEvents.filter(
      e => e.type === ReplayOpcode.SPAWN && e.timestamp <= targetTime
    );
    const lastSpawn = spawnEvents[spawnEvents.length - 1];
    
    if (!lastSpawn || lastSpawn.type !== ReplayOpcode.SPAWN) return null;
    
    // 2. 检查该方块是否已经锁定
    const hasLocked = lockEvents.some(
      lock => lock.timestamp > lastSpawn.timestamp && lock.timestamp <= targetTime
    );
    
    if (hasLocked) return null;
    
    // 3. 查找该方块相关的所有 INPUT 事件
    const inputEvents = sortedEvents.filter(
      e => e.type === ReplayOpcode.INPUT && 
           e.timestamp > lastSpawn.timestamp && 
           e.timestamp <= targetTime + 50 // 50ms lookahead
    ) as V4InputEvent[];
    
    if (inputEvents.length === 0) {
      // 使用 SPAWN 初始位置
      return {
        type: lastSpawn.pieceType,
        position: { x: lastSpawn.x, y: lastSpawn.y },
        rotation: 0
      };
    }
    
    // 4. 找到当前时间前后的两个 INPUT 事件（用于插值）
    const currentInputIdx = inputEvents.findIndex(e => e.timestamp > targetTime);
    const prevInput = inputEvents[currentInputIdx - 1];
    const nextInput = inputEvents[currentInputIdx];
    
    if (!prevInput) {
      // 在第一个 INPUT 之前，使用 SPAWN 位置
      return {
        type: lastSpawn.pieceType,
        position: { x: lastSpawn.x, y: lastSpawn.y },
        rotation: 0
      };
    }
    
    if (!nextInput || !prevInput.position || !nextInput.position) {
      // 使用最后一个 INPUT 的位置
      return {
        type: lastSpawn.pieceType,
        position: prevInput.position || { x: lastSpawn.x, y: lastSpawn.y },
        rotation: prevInput.rotation || 0
      };
    }
    
    // 5. 线性插值计算当前位置
    const timeDelta = nextInput.timestamp - prevInput.timestamp;
    const progress = Math.min(1, (targetTime - prevInput.timestamp) / timeDelta);
    
    // 位置插值（只在Y轴方向插值，X轴保持离散以避免视觉模糊）
    const interpolatedY = prevInput.position.y + (nextInput.position.y - prevInput.position.y) * progress;
    
    return {
      type: lastSpawn.pieceType,
      position: {
        x: nextInput.position.x, // X轴不插值，保持清晰
        y: interpolatedY
      },
      rotation: nextInput.rotation || prevInput.rotation || 0
    };
  }, [sortedEvents, lockEvents]);

  // Reconstruct state with caching and currentPiece support
  const reconstructState = useCallback((targetTime: number) => {
    // Check cache first
    const cachedState = stateCache.current.get(Math.floor(targetTime / 100) * 100);
    if (cachedState && Math.abs(cachedState.time - targetTime) < 100) {
      return cachedState.state;
    }

    const kf = findRelevantKeyframe(targetTime);
    if (!kf) {
      return {
        board: Array(20).fill(null).map(() => Array(10).fill(0)),
        nextPieces: replay.metadata.initialPieceSequence.slice(0, 5),
        holdPiece: null,
        score: 0,
        lines: 0,
        level: 1,
        combo: 0,
        currentPiece: null
      };
    }

    // ✅ P0 修复：确保棋盘数据使用数字 ID (1-7)
    const normalizedBoard = kf.board.map(row => row.map(cell => {
      if (typeof cell === 'string') {
        const typeMap: Record<string, number> = {
          'I': 1, 'O': 2, 'T': 3, 'S': 4, 'Z': 5, 'J': 6, 'L': 7
        };
        return typeMap[cell] || 0;
      }
      return cell;
    }));

    let state = {
      board: normalizedBoard,
      nextPieces: [...kf.nextPieces],
      holdPiece: kf.holdPiece,
      score: kf.score,
      lines: kf.lines,
      level: kf.level,
      combo: 0,
      currentPiece: null as any
    };

    // Apply locks after keyframe
    const relevantLocks = lockEvents.filter(
      lock => lock.timestamp > kf.timestamp && lock.timestamp <= targetTime
    );

    for (const lock of relevantLocks) {
      if (lock.linesCleared > 0) {
        state.lines += lock.linesCleared;
        state.combo++;
        
        // Calculate score
        const lineScores = [0, 100, 300, 500, 800];
        let score = lineScores[lock.linesCleared] * state.level;
        
        if (lock.isTSpin && !lock.isMini) {
          const tSpinScores = [0, 800, 1200, 1600, 2000];
          score = tSpinScores[lock.linesCleared] * state.level;
        }
        
        state.score += score;
      } else {
        state.combo = 0;
      }
    }

    // ✅ P0 修改：使用插值动画系统获取 currentPiece
    const animatedPiece = getAnimatedPieceState(targetTime);
    if (animatedPiece) {
      state.currentPiece = animatedPiece;
    }

    // Cache the state
    const cacheKey = Math.floor(targetTime / 100) * 100;
    stateCache.current.set(cacheKey, { time: targetTime, state });

    return state;
  }, [findRelevantKeyframe, lockEvents, sortedEvents, replay.metadata.initialPieceSequence, getAnimatedPieceState]);

  // Current game state
  const currentState = useMemo(() => reconstructState(currentTime), [currentTime, reconstructState]);

  // Detect achievements
  useEffect(() => {
    const lock = lockEvents.find(l => Math.abs(l.timestamp - currentTime) < 50);
    if (lock && lock.linesCleared > 0) {
      let achievement: AchievementNotification | null = null;

      if (lock.linesCleared === 4) {
        achievement = { type: 'tetris', text: 'TETRIS!', timestamp: currentTime };
      } else if (lock.isTSpin && !lock.isMini) {
        achievement = { 
          type: 'tspin', 
          text: `T-SPIN ${['', 'SINGLE', 'DOUBLE', 'TRIPLE'][lock.linesCleared]}!`,
          timestamp: currentTime 
        };
      }

      if (achievement) {
        setRecentAchievement(achievement);
        setTimeout(() => setRecentAchievement(null), 2000);
      }
    }
  }, [currentTime, lockEvents]);

  // Calculate real-time stats
  const currentPPS = useMemo(() => {
    if (currentTime === 0) return 0;
    const piecesPlaced = lockEvents.filter(l => l.timestamp <= currentTime).length;
    return piecesPlaced / (currentTime / 1000);
  }, [currentTime, lockEvents]);

  const currentAPM = useMemo(() => {
    return currentPPS * 60;
  }, [currentPPS]);

  const piecesPlaced = useMemo(() => {
    return lockEvents.filter(l => l.timestamp <= currentTime).length;
  }, [currentTime, lockEvents]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) return;

    let animationFrameId: number;
    const animate = () => {
      const now = Date.now();
      const delta = (now - lastFrameTime.current) * playbackSpeed;
      lastFrameTime.current = now;

      setCurrentTime(prev => {
        const next = prev + delta;
        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return next;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, playbackSpeed, duration]);

  // Controls
  const handlePlayPause = () => {
    if (!isPlaying) lastFrameTime.current = Date.now();
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentTime(0);
    setIsPlaying(false);
    stateCache.current.clear();
  };

  const handleSeek = (value: number[]) => {
    setCurrentTime(value[0]);
    lastFrameTime.current = Date.now();
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Jump to keyframes
  const jumpToPreviousKeyframe = useCallback(() => {
    const prevKf = [...keyframes].reverse().find(kf => kf.timestamp < currentTime - 100);
    if (prevKf) {
      setCurrentTime(prevKf.timestamp);
    } else {
      setCurrentTime(0);
    }
  }, [currentTime, keyframes]);

  const jumpToNextKeyframe = useCallback(() => {
    const nextKf = keyframes.find(kf => kf.timestamp > currentTime + 100);
    if (nextKf) {
      setCurrentTime(nextKf.timestamp);
    } else {
      setCurrentTime(duration);
    }
  }, [currentTime, keyframes, duration]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent keyboard shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handlePlayPause();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            // Shift + ← : Previous keyframe
            jumpToPreviousKeyframe();
          } else {
            // ← : Back 1 frame (16ms ≈ 60fps)
            setCurrentTime(Math.max(0, currentTime - 16));
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            // Shift + → : Next keyframe
            jumpToNextKeyframe();
          } else {
            // → : Forward 1 frame (16ms)
            setCurrentTime(Math.min(duration, currentTime + 16));
          }
          break;

        case 'BracketLeft': // [
          e.preventDefault();
          // Decrease speed
          setPlaybackSpeed(prev => Math.max(0.25, prev - 0.25));
          break;

        case 'BracketRight': // ]
          e.preventDefault();
          // Increase speed
          setPlaybackSpeed(prev => Math.min(4, prev + 0.25));
          break;

        case 'Home':
          e.preventDefault();
          handleReset();
          break;

        case 'End':
          e.preventDefault();
          setCurrentTime(duration);
          setIsPlaying(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, duration, handlePlayPause, jumpToPreviousKeyframe, jumpToNextKeyframe]);

  const speedOptions = [0.25, 0.5, 1, 2, 4];

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-7xl h-[90vh] flex flex-col bg-card border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-foreground">{replay.metadata.username}</h2>
            <Badge variant="secondary">{replay.metadata.gameMode}</Badge>
            {replay.stats.finalScore >= 100000 && (
              <Badge variant="default" className="gap-1">
                <Trophy className="w-3 h-3" /> High Score
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-[1fr_auto_1fr] gap-6 p-6 overflow-hidden">
          {/* Left Stats */}
          <div className="flex flex-col gap-4">
            <Card className="p-6 bg-muted/50">
              <div className="text-sm text-muted-foreground mb-1">Score</div>
              <div className="text-6xl font-bold text-foreground tracking-tight">{currentState.score.toLocaleString()}</div>
            </Card>
            
            <Card className="p-6 bg-muted/50">
              <div className="text-sm text-muted-foreground mb-1">Lines</div>
              <div className="text-5xl font-bold text-foreground">{currentState.lines}</div>
            </Card>

            <Card className="p-4 bg-muted/50">
              <div className="text-sm text-muted-foreground mb-1">Level</div>
              <div className="text-4xl font-bold text-foreground">{currentState.level}</div>
            </Card>

            <Card className="p-4 bg-muted/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">PPS</div>
                  <div className="text-2xl font-bold text-primary">{currentPPS.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">APM</div>
                  <div className="text-2xl font-bold text-primary">{Math.round(currentAPM)}</div>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-muted/50">
              <div className="text-sm text-muted-foreground">Pieces</div>
              <div className="text-2xl font-bold text-foreground">
                {piecesPlaced} / {replay.stats.lockCount}
              </div>
            </Card>
          </div>

          {/* Center - Game Board */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <GameBoard 
                board={currentState.board} 
                currentPiece={currentState.currentPiece ? {
                  type: {
                    type: currentState.currentPiece.type,
                    shape: getPieceShape(currentState.currentPiece.type, currentState.currentPiece.rotation),
                    color: getTetrominoColor(currentState.currentPiece.type), // ✅ P1 修复：使用正确颜色
                    name: currentState.currentPiece.type
                  },
                  x: Math.floor(currentState.currentPiece.position.x),
                  y: Math.floor(currentState.currentPiece.position.y),
                  rotation: currentState.currentPiece.rotation
                } : null}
              />
              
              {/* Achievement Overlay */}
              {recentAchievement && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="bg-primary/95 text-primary-foreground px-8 py-4 rounded-xl text-3xl font-bold animate-fade-in shadow-2xl backdrop-blur-sm border-2 border-primary-foreground/20">
                    {recentAchievement.type === 'tetris' && <Zap className="inline w-8 h-8 mr-2" />}
                    {recentAchievement.type === 'tspin' && <Award className="inline w-8 h-8 mr-2" />}
                    {recentAchievement.text}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Info */}
          <div className="flex flex-col gap-4">
            {/* ✅ P0 修复：使用游戏组件显示 NEXT */}
            <NextPiecePreview
              nextPieces={currentState.nextPieces.slice(0, 5).map((pieceType) => ({
                type: {
                  type: pieceType,
                  shape: getPieceShape(pieceType, 0),
                  color: getTetrominoColor(pieceType),
                  name: pieceType
                }
              }))}
              compact={false}
            />

            {/* ✅ P0 修复：使用游戏组件显示 HOLD */}
            {currentState.holdPiece && (
              <HoldPieceDisplay
                holdPiece={{
                  type: {
                    type: currentState.holdPiece,
                    shape: getPieceShape(currentState.holdPiece, 0),
                    color: getTetrominoColor(currentState.holdPiece),
                    name: currentState.holdPiece
                  },
                  x: 0,
                  y: 0,
                  rotation: 0
                }}
                canHold={false}
              />
            )}

            {showDetails && (
              <Card className="p-4 bg-muted/50 text-xs space-y-2">
                <div className="space-y-1 text-muted-foreground">
                  <div>Seed: {replay.metadata.seed}</div>
                  <div>Duration: {formatTime(replay.stats.duration)}</div>
                  <div>Events: {sortedEvents.length}</div>
                  <div>Keyframes: {keyframes.length}</div>
                  <div>DAS: {replay.metadata.settings.das}ms</div>
                  <div>ARR: {replay.metadata.settings.arr}ms</div>
                  <div>SDF: {replay.metadata.settings.sdf}ms</div>
                </div>
              </Card>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {showDetails ? 'Hide' : 'Show'} Technical Info
            </Button>

            {/* Keyboard Shortcuts */}
            <Card className="p-3 bg-muted/30 text-xs">
              <div className="font-semibold text-foreground mb-2">⌨️ Keyboard Shortcuts</div>
              <div className="space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Space</span>
                  <span className="text-foreground">Play/Pause</span>
                </div>
                <div className="flex justify-between">
                  <span>← / →</span>
                  <span className="text-foreground">Frame Step</span>
                </div>
                <div className="flex justify-between">
                  <span>⇧ ← / ⇧ →</span>
                  <span className="text-foreground">Keyframe</span>
                </div>
                <div className="flex justify-between">
                  <span>[ / ]</span>
                  <span className="text-foreground">Speed</span>
                </div>
                <div className="flex justify-between">
                  <span>Home / End</span>
                  <span className="text-foreground">Jump</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Controls */}
        <div className="border-t border-border p-4 space-y-3">
          {/* Progress Bar */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-14">{formatTime(currentTime)}</span>
            <Slider
              value={[currentTime]}
              min={0}
              max={duration}
              step={10}
              onValueChange={handleSeek}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-14">{formatTime(duration)}</span>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={handlePlayPause} className="w-24">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <Button size="lg" variant="outline" onClick={handleReset}>
              <RotateCcw className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-muted-foreground">Speed:</span>
              {speedOptions.map(speed => (
                <Button
                  key={speed}
                  size="sm"
                  variant={playbackSpeed === speed ? 'default' : 'outline'}
                  onClick={() => setPlaybackSpeed(speed)}
                >
                  {speed}x
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
