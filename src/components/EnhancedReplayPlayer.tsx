// 增强的录像回放播放器 - 支持压缩格式和多倍速

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import EnhancedGameBoard from '@/components/EnhancedGameBoard';
import HoldPieceDisplay from '@/components/HoldPieceDisplay';
import NextPiecePreview from '@/components/NextPiecePreview';
import { useGameLogic } from '@/hooks/useGameLogic';
import { ReplayCompressor } from '@/utils/replayCompression';
import { 
  Play, Pause, RotateCcw, SkipBack, SkipForward, Bookmark,
  TrendingUp, Trophy, Target, Clock, Zap, AlertCircle
} from 'lucide-react';
import type { 
  CompressedReplay, 
  ReplayPlayerConfig
} from '@/utils/replayTypes';
import type { ReplayAction as DecompressedReplayAction } from '@/utils/gameTypes';
import { GameMode } from '@/utils/gameTypes';

interface EnhancedReplayPlayerProps {
  replay: CompressedReplay;
  isOpen: boolean;
  onClose: () => void;
  config?: Partial<ReplayPlayerConfig>;
}

const ReplayGame = ({ replay, onStateUpdate, onActionsReady, onError }) => {
  const gameLogic = useGameLogic({
    gameMode: { id: replay.gameMode } as GameMode,
    isReplay: true,
    replaySeed: replay.seed,
    enableReplayGravity: false, // Disable internal gravity
    replayClockControlled: true, // Enable controlled clock mode
  });

  useEffect(() => {
    if (!replay) return;
    
    console.log('[ReplayGame] Initializing with replay:', {
      hasReplay: !!replay,
      replayId: replay.id
    });

    const initializeReplay = async () => {
      try {
        console.log('[ReplayGame] Step 1: Decoding actions...');
        
        // Decode and validate actions FIRST (before starting game)
        let decompressedActions;
        
        if (replay.actions) {
          decompressedActions = replay.actions;
          console.log('[ReplayGame] Using pre-decoded actions:', decompressedActions.length);
        } else if (replay.compressedActions) {
          console.log('[ReplayGame] Decoding compressed actions...');
          try {
            decompressedActions = ReplayCompressor.decompressActions(
              ReplayCompressor.decodeFromBinary(replay.compressedActions)
            );
            console.log('[ReplayGame] Decoded actions:', decompressedActions.length);
          } catch (error) {
            console.error('[ReplayGame] Failed to decode compressed actions:', error);
            onError && onError('数据解码失败：压缩格式损坏');
            return;
          }
        } else {
          console.error('[ReplayGame] No replay actions available');
          onError && onError('录像数据缺失：无法找到动作数据');
          return;
        }
        
        // Validate actions array
        if (!Array.isArray(decompressedActions) || decompressedActions.length === 0) {
          console.error('[ReplayGame] Invalid or empty actions array');
          onError && onError('录像数据无效：动作数组为空');
          return;
        }
        
        // Log action statistics for debugging
        const actionCounts = decompressedActions.reduce((acc, action) => {
          acc[action.action] = (acc[action.action] || 0) + 1;
          return acc;
        }, {});
        console.log('[ReplayGame] Action statistics:', actionCounts);
        
        // Check for essential place actions
        const placeCount = actionCounts.place || 0;
        if (placeCount === 0) {
          console.warn('[ReplayGame] No place actions found - replay may be incomplete');
          onError && onError('录像数据不完整：缺少方块锁定动作，无法正常播放');
          return;
        }
        
        console.log('[ReplayGame] Step 2: Starting game initialization...');
        
        // Start game and wait for state to stabilize
        gameLogic.startGame();
        
        // Wait for next tick to ensure state updates are applied
        await new Promise(resolve => setTimeout(resolve, 0));
        
        console.log('[ReplayGame] Step 3: Verifying game state...');
        
        // Verify game state is properly initialized
        if (!gameLogic.currentPiece) {
          console.error('[ReplayGame] currentPiece is null after startGame');
          onError && onError('游戏状态初始化失败：当前方块为空');
          return;
        }
        
        console.log('[ReplayGame] Step 4: State verified, triggering initial update...');
        
        // Trigger first state update to populate HOLD/NEXT areas
        onStateUpdate(gameLogic);
        
        console.log('[ReplayGame] Step 5: Actions ready, currentPiece:', gameLogic.currentPiece?.type?.type);
        onActionsReady(decompressedActions, gameLogic);
        
        console.log('[ReplayGame] Initialization complete successfully');
      } catch (error) {
        console.error('[ReplayGame] Initialization error:', error);
        onError && onError('录像初始化失败：' + (error instanceof Error ? error.message : String(error)));
      }
    };
    
    initializeReplay();
  }, [replay?.id]);

  // Trigger state updates when key game properties change
  useEffect(() => {
    onStateUpdate(gameLogic);
  }, [
    gameLogic.board, 
    gameLogic.currentPiece, 
    gameLogic.score, 
    gameLogic.lines, 
    gameLogic.nextPieces, 
    gameLogic.holdPiece,
    gameLogic.canHold,
    onStateUpdate
  ]);

  return null;
};


export const EnhancedReplayPlayer: React.FC<EnhancedReplayPlayerProps> = ({
  replay,
  isOpen,
  onClose,
  config = {}
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [totalTime, setTotalTime] = useState(0);
  const [replayKey, setReplayKey] = useState(Date.now());
  const [piecesPlaced, setPiecesPlaced] = useState(0);
  const [actionsProcessed, setActionsProcessed] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isStaticMode, setIsStaticMode] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const actionsRef = useRef<DecompressedReplayAction[]>([]);
  const gameLogicRef = useRef<any>(null);
  const currentActionIndexRef = useRef(0);
  const timeScaleRef = useRef(1);
  const playerConfig = {
    speedOptions: [0.25, 0.5, 1, 2, 4],
    ...config
  };

  const handleActionsReady = useCallback((decompressedActions, logic) => {
    console.log('handleActionsReady: Processing actions...', {
      totalActions: decompressedActions.length,
      replayDuration: replay.durationSeconds
    });

    // Sort actions by timestamp to ensure proper playback order
    const sortedActions = [...decompressedActions].sort((a, b) => a.timestamp - b.timestamp);

    // Detect and normalize timestamp unit (seconds, ms, or micros)
    const firstTs = sortedActions[0]?.timestamp ?? 0;
    const lastTs = sortedActions[sortedActions.length - 1]?.timestamp ?? 0;
    const expectedMs = (replay.durationSeconds || 0) * 1000;

    let multiplier = 1; // default: already ms
    if (expectedMs > 0) {
      if (lastTs < expectedMs / 10) {
        // Looks like seconds → convert to ms
        multiplier = 1000;
      } else if (lastTs > expectedMs * 10) {
        // Looks like microseconds → convert to ms
        multiplier = 0.001;
      }
    }
    timeScaleRef.current = multiplier;

    const normalizedActions = multiplier !== 1
      ? sortedActions.map(a => ({ ...a, timestamp: Math.round(a.timestamp * multiplier) }))
      : sortedActions;

    actionsRef.current = normalizedActions;
    gameLogicRef.current = logic;
    
    // Calculate total time using normalized timestamps
    const normalizedLast = normalizedActions[normalizedActions.length - 1]?.timestamp ?? 0;
    const calculatedTotalTime = normalizedLast ? 
      Math.max(normalizedLast, expectedMs) : 
      expectedMs;
    
    console.log('handleActionsReady: Time normalization', {
      firstTs,
      lastTs,
      expectedMs,
      multiplier,
      normalizedLast,
      calculatedTotalTime
    });
    
    // Validate time values
    if (calculatedTotalTime > 86400000) { // > 24h seems wrong
      console.warn('handleActionsReady: Suspiciously large total time, falling back to replay duration');
      setTotalTime(expectedMs || normalizedLast);
    } else {
      setTotalTime(calculatedTotalTime || expectedMs || 0);
    }
    
    // Reset action pointer
    currentActionIndexRef.current = 0;
    
    // Log detailed action statistics for debugging
    const actionStats = normalizedActions.reduce((acc, action) => {
      acc[action.action] = (acc[action.action] || 0) + 1;
      return acc;
    }, {});
    
    console.log('handleActionsReady: Ready to play', {
      actionsCount: normalizedActions.length,
      actionStats,
      firstActionTime: normalizedActions[0]?.timestamp,
      lastActionTime: normalizedActions[normalizedActions.length - 1]?.timestamp,
      timeScaleApplied: multiplier !== 1 ? `×${multiplier}` : 'none',
      totalTime: calculatedTotalTime
    });
  }, [replay.durationSeconds]);

  const [gameLogicState, setGameLogicState] = useState(null);
  const handleStateUpdate = useCallback((newState) => {
    setGameLogicState(newState);
  }, []);

  const handleError = useCallback((message: string) => {
    console.error('ReplayPlayer Error:', message);
    setHasError(true);
    setErrorMessage(message);
    setIsPlaying(false);
    
    // Check if this is a "no place actions" error - enable static mode
    if (message.includes('缺少方块锁定动作') || message.includes('place')) {
      setIsStaticMode(true);
    }
  }, []);

  const processActionsUntilTime = useCallback((targetTime: number, fromTime: number = 0) => {
    if (!gameLogicRef.current) {
      console.warn('processActionsUntilTime: No game logic available');
      return;
    }

    const actions = actionsRef.current;
    const logic = gameLogicRef.current;
    let newPiecesPlaced = piecesPlaced;
    let newActionsProcessed = actionsProcessed;
    let lastActionTime = fromTime;
    let actionsExecuted = 0;

    console.log('processActionsUntilTime: Processing', {
      targetTime,
      fromTime,
      totalActions: actions.length,
      currentIndex: currentActionIndexRef.current
    });

    while (currentActionIndexRef.current < actions.length) {
      const action = actions[currentActionIndexRef.current];
      if (action.timestamp > targetTime) break;

      // Tick game physics from last action time to current action time
      if (action.timestamp > lastActionTime && logic.tickReplay) {
        const deltaMs = action.timestamp - lastActionTime;
        logic.tickReplay(deltaMs);
      }

      // Verify game state before executing action (except place which doesn't need currentPiece)
      if (!logic.currentPiece && action.action !== 'place' && action.action !== 'pause') {
        console.error('processActionsUntilTime: currentPiece is null, cannot process action:', action.action, {
          timestamp: action.timestamp,
          currentIndex: currentActionIndexRef.current
        });
        // Skip this action and continue
        currentActionIndexRef.current++;
        continue;
      }
      
      // Execute actions at their exact timestamp
      console.log('processActionsUntilTime: Executing action', {
        action: action.action,
        timestamp: action.timestamp,
        data: action.data,
        hasCurrentPiece: !!logic.currentPiece
      });

      try {
        switch (action.action) {
          case 'move':
            if (action.data?.direction === 'left') logic.movePiece(-1, 0);
            else if (action.data?.direction === 'right') logic.movePiece(1, 0);
            else if (action.data?.direction === 'down') logic.movePiece(0, 1); // Execute soft drop
            break;
          case 'rotate':
            if (action.data?.direction === 'clockwise') logic.rotatePiece(true);
            else if (action.data?.direction === 'counterclockwise') logic.rotatePiece(false);
            else if (action.data?.direction === '180') logic.rotatePiece180();
            break;
          case 'drop':
            if (action.data?.type === 'hard') logic.hardDrop();
            else if (action.data?.type === 'soft') logic.movePiece(0, 1); // Execute soft drop
            break;
          case 'hold':
            logic.holdCurrentPiece();
            break;
          case 'pause':
            // Handle pause/resume actions
            if (action.data?.paused && logic.pauseGame) {
              logic.pauseGame();
            } else if (!action.data?.paused && logic.resumeGame) {
              logic.resumeGame();
            }
            break;
          case 'place':
            // Use place as authoritative anchor for position correction
            if (action.data && logic.currentPiece && logic.forcePlace) {
              const expectedPiece = action.data;
              const actualPiece = logic.currentPiece;
              
              // Check for inconsistency and correct if needed
              if (expectedPiece.x !== actualPiece.x || expectedPiece.y !== actualPiece.y || 
                  expectedPiece.rotation !== actualPiece.rotation) {
                console.warn('processActionsUntilTime: Correcting position inconsistency', {
                  expected: expectedPiece,
                  actual: actualPiece,
                  timestamp: action.timestamp
                });
                // Force correct position and immediate lock
                logic.forcePlace(expectedPiece.x, expectedPiece.y, expectedPiece.rotation);
              }
              // Always lock the piece after place action
              logic.lockPiece();
            }
            newPiecesPlaced++;
            break;
          default:
            console.log('processActionsUntilTime: Unknown action type', action.action);
            break;
        }
      } catch (error) {
        console.error('processActionsUntilTime: Error executing action:', action.action, error);
        // Continue with next action rather than crashing
      }
      
      lastActionTime = action.timestamp;
      newActionsProcessed++;
      currentActionIndexRef.current++;
      actionsExecuted++;
    }

    // Tick any remaining time after last action
    if (targetTime > lastActionTime && logic.tickReplay) {
      const remainingDelta = targetTime - lastActionTime;
      logic.tickReplay(remainingDelta);
    }

    console.log('processActionsUntilTime: Completed', {
      actionsExecuted,
      newPiecesPlaced,
      finalTime: targetTime
    });

    // Runtime consistency check - warn if no actions were executed for extended time
    if (actionsExecuted === 0 && targetTime > 1000) {
      console.warn('processActionsUntilTime: No actions executed for 1+ seconds', {
        targetTime,
        totalActions: actions.length,
        currentIndex: currentActionIndexRef.current
      });
    }

    // Update statistics if changed
    if (newPiecesPlaced !== piecesPlaced) setPiecesPlaced(newPiecesPlaced);
    if (newActionsProcessed !== actionsProcessed) setActionsProcessed(newActionsProcessed);
    
    // Force state update to trigger re-render
    if (gameLogicRef.current) {
      setGameLogicState({...gameLogicRef.current});
    }
  }, [piecesPlaced, actionsProcessed]);

  const resetReplay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(false);
    setCurrentTime(0);
    setPiecesPlaced(0);
    setActionsProcessed(0);
    currentActionIndexRef.current = 0;
    setReplayKey(Date.now()); // 改变key来强制ReplayGame重新挂载和初始化
  }, []);

  const seekTo = useCallback((time: number) => {
    const targetTime = Math.max(0, Math.min(time, totalTime));
    
    console.log('seekTo: Seeking to time', { targetTime, totalTime });

    // Pause playback during seek
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsPlaying(false);

    // Reset completely and replay from start using "fast-forward replay"
    setReplayKey(Date.now());
    setCurrentTime(0);
    setPiecesPlaced(0);
    setActionsProcessed(0);
    currentActionIndexRef.current = 0;

    // Wait for new gameLogic instance to be ready, then fast-forward to target time
    setTimeout(() => {
      console.log('seekTo: Fast-forwarding to target time');
      // Fast-forward replay with physics simulation
      processActionsUntilTime(targetTime, 0);
      setCurrentTime(targetTime);
      console.log('seekTo: Seek completed');
    }, 150); // Slightly longer wait to ensure game is ready
  }, [totalTime, processActionsUntilTime]);

  const togglePlayback = useCallback(() => {
    setIsPlaying(p => !p);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = Math.min(prev + 16 * playbackSpeed, totalTime);
          if (newTime >= totalTime) {
            setIsPlaying(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            
            // Final consistency check
            if (gameLogicRef.current && replay.finalScore) {
              const currentScore = gameLogicRef.current.score;
              const currentLines = gameLogicRef.current.lines;
              if (Math.abs(currentScore - replay.finalScore) > 100 || 
                  Math.abs(currentLines - replay.finalLines) > 2) {
                console.warn('Replay ended with score/lines discrepancy:', {
                  expected: { score: replay.finalScore, lines: replay.finalLines },
                  actual: { score: currentScore, lines: currentLines }
                });
              }
            }
            
            return totalTime;
          }
          processActionsUntilTime(newTime, prev);
          return newTime;
        });
      }, 16);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, playbackSpeed, totalTime, processActionsUntilTime]);

  // 格式化时间 - 带输入验证
  const formatTime = (ms: number): string => {
    // Validate input
    if (!ms || ms < 0 || !isFinite(ms)) {
      return '0:00';
    }
    
    // Cap at reasonable maximum (1 hour)  
    const cappedMs = Math.min(ms, 3600000);
    
    const minutes = Math.floor(cappedMs / 60000);
    const seconds = Math.floor((cappedMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" aria-describedby="enhanced-replay-description">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                录像回放 - {replay.gameMode}
                <Badge variant="secondary">
                  压缩率: {Math.round((replay.compressionRatio || 0) * 100)}%
                </Badge>
                {replay.compressedActions && (
                  <Badge variant="outline">
                    大小: {(replay.compressedActions.length / 1024).toFixed(1)}KB
                  </Badge>
                )}
                <DialogDescription id="enhanced-replay-description" className="sr-only">
                  Enhanced replay player with multi-speed playback and seeking functionality
                </DialogDescription>
              </DialogTitle>
            </DialogHeader>

            {/* Error/Static Mode Banners */}
            {hasError && (
              <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">播放错误</span>
                </div>
                <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
                {isStaticMode && (
                  <p className="mt-2 text-xs text-red-600">
                    已切换到静态展示模式。您可以查看录像的基本信息，但无法播放回放。
                  </p>
                )}
              </div>
            )}

            {/* Mount ReplayGame to initialize game logic */}
            {!hasError && (
              <ReplayGame 
                key={replayKey}
                replay={replay}
                onStateUpdate={handleStateUpdate}
                onActionsReady={handleActionsReady}
                onError={handleError}
              />
            )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 游戏区域 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 游戏画面 */}
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-center items-start gap-6">
                  {/* Hold区域 */}
                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium text-center">HOLD</h3>
                    {(gameLogicState || isStaticMode) && (
                      <HoldPieceDisplay
                        holdPiece={gameLogicState?.holdPiece || null}
                        canHold={gameLogicState?.canHold ?? true}
                      />
                    )}
                  </div>

                  {/* 游戏板 */}
                  <div className="flex flex-col items-center">
                    {gameLogicState || isStaticMode ? (
                      <>
                        <EnhancedGameBoard
                          board={gameLogicState?.board || Array(20).fill(null).map(() => Array(10).fill(0))}
                          currentPiece={gameLogicState?.currentPiece || null}
                          ghostPiece={gameLogicState?.ghostPiece || null}
                          clearingLines={[]}
                          cellSize={24}
                          showGrid={true}
                          showHiddenRows={false}
                        />
                        {isStaticMode && (
                          <div className="mt-2 text-xs text-yellow-600 text-center">
                            静态展示模式
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-60 h-96 bg-muted/50 rounded border flex items-center justify-center">
                        <span className="text-muted-foreground">加载中...</span>
                      </div>
                    )}
                  </div>

                  {/* Next区域 */}
                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium text-center">NEXT</h3>
                    {(gameLogicState || isStaticMode) && (
                      <NextPiecePreview
                        nextPieces={gameLogicState?.nextPieces || []}
                        compact={false}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 播放控制 */}
            <Card>
              <CardContent className="p-4 space-y-4">
                {/* 进度条 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(totalTime)}</span>
                  </div>
                  <Slider
                    value={[currentTime]}
                    max={totalTime || 1}
                    step={Math.max(100, Math.floor((totalTime || 1) / 1000))}
                    disabled={hasError || isStaticMode}
                    onValueChange={(value) => {
                      const newTime = value[0];
                      console.log('Slider: Seeking to', newTime);
                      seekTo(newTime);
                    }}
                    className="w-full cursor-pointer"
                  />
                  {(hasError || isStaticMode) && (
                    <p className="text-xs text-muted-foreground text-center">
                      {isStaticMode ? '静态模式下无法播放' : '发生错误，无法控制播放'}
                    </p>
                  )}
                  <Progress 
                    value={(currentTime / totalTime) * 100}
                    className="w-full"
                  />
                </div>

                {/* 控制按钮 */}
                <div className="flex items-center justify-center gap-4">
                  <Button variant="outline" size="icon" onClick={resetReplay} disabled={hasError || isStaticMode}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  
                  <Button variant="outline" size="icon" onClick={() => seekTo(currentTime - 10000)} disabled={hasError || isStaticMode}>
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  
                  <Button onClick={togglePlayback} size="lg" disabled={hasError || isStaticMode}>
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </Button>
                  
                  <Button variant="outline" size="icon" onClick={() => seekTo(currentTime + 10000)} disabled={hasError || isStaticMode}>
                    <SkipForward className="w-4 h-4" />
                  </Button>
                  
                  <Button variant="outline" size="icon" disabled={hasError || isStaticMode}>
                    <Bookmark className="w-4 h-4" />
                  </Button>
                </div>

                {/* 播放速度 */}
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm font-medium">播放速度:</span>
                  <div className="flex gap-1">
                    {[0.5, 1, 1.5, 2, 3].map(speed => (
                      <Button
                        key={speed}
                        variant={playbackSpeed === speed ? "default" : "outline"}
                        size="sm"
                        disabled={hasError || isStaticMode}
                        onClick={() => setPlaybackSpeed(speed)}
                      >
                        {speed}x
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 统计面板 */}
          <div className="space-y-4">
            {/* 游戏信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">游戏信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>游戏模式:</span>
                  <Badge>{replay.gameMode}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>最终分数:</span>
                  <span className="font-mono">{replay.finalScore.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>消除行数:</span>
                  <span className="font-mono">{replay.finalLines}</span>
                </div>
                <div className="flex justify-between">
                  <span>游戏时长:</span>
                  <span className="font-mono">{formatTime(replay.durationSeconds * 1000)}</span>
                </div>
              </CardContent>
            </Card>

            {/* 实时统计 */}
            {gameLogicState && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    实时统计
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      <span>分数:</span>
                    </div>
                    <span className="font-mono">{gameLogicState.score.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-primary/20 rounded" />
                      <span>行数:</span>
                    </div>
                    <span className="font-mono">{gameLogicState.lines}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>PPS:</span>
                    </div>
                    <span className="font-mono">
                      {currentTime > 0 ? (piecesPlaced / (currentTime / 1000 / 60)).toFixed(2) : '0.00'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      <span>APM:</span>
                    </div>
                    <span className="font-mono">
                      {currentTime > 0 ? Math.round(actionsProcessed / (currentTime / 1000 / 60)) : 0}
                    </span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <span>等级:</span>
                    <span className="font-mono">{gameLogicState.level}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 技术信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">技术信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>动作数量:</span>
                  <span className="font-mono">{replay.actionsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>压缩大小:</span>
                  <span className="font-mono">
                    {(replay.compressedActions instanceof Uint8Array 
                      ? replay.compressedActions.length 
                      : new TextEncoder().encode(replay.compressedActions).length) / 1024 > 1 
                      ? `${((replay.compressedActions instanceof Uint8Array 
                          ? replay.compressedActions.length 
                          : new TextEncoder().encode(replay.compressedActions).length) / 1024).toFixed(1)} KB`
                      : `${(replay.compressedActions instanceof Uint8Array 
                          ? replay.compressedActions.length 
                          : new TextEncoder().encode(replay.compressedActions).length)} B`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>版本:</span>
                  <span className="font-mono">v{replay.version}</span>
                </div>
                <div className="flex justify-between">
                  <span>种子:</span>
                  <span className="font-mono text-xs">{replay.seed.slice(0, 12)}...</span>
                </div>
                {replay.isPersonalBest && (
                  <Badge className="w-full justify-center">个人最佳记录</Badge>
                )}
                {replay.isWorldRecord && (
                  <Badge variant="destructive" className="w-full justify-center">世界记录</Badge>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};