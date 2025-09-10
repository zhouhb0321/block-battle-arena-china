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
import { useGameLogic } from '@/hooks/useGameLogic';
import { ReplayCompressor } from '@/utils/replayCompression';
import { 
  Play, Pause, RotateCcw, SkipBack, SkipForward, Bookmark,
  TrendingUp, Trophy, Target, Clock, Zap
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

const ReplayGame = ({ replay, onStateUpdate, onActionsReady }) => {
  const gameLogic = useGameLogic({
    gameMode: { id: replay.gameMode } as GameMode,
    isReplay: true,
    replaySeed: replay.seed,
    enableReplayGravity: false, // Disable internal gravity
    replayClockControlled: true, // Enable controlled clock mode
  });

  useEffect(() => {
    gameLogic.initializeForCountdown();
    gameLogic.startGame();

    const decompressedActions = ReplayCompressor.decompressActions(
      ReplayCompressor.decodeFromBinary(replay.compressedActions)
    );
    onActionsReady(decompressedActions, gameLogic);
  }, [replay.id]);

  useEffect(() => {
    onStateUpdate(gameLogic);
  }, [gameLogic, onStateUpdate]);

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

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const actionsRef = useRef<DecompressedReplayAction[]>([]);
  const gameLogicRef = useRef<any>(null);
  const currentActionIndexRef = useRef(0);

  const playerConfig = {
    speedOptions: [0.25, 0.5, 1, 2, 4],
    ...config
  };

  const handleActionsReady = useCallback((decompressedActions, logic) => {
    // Sort actions by timestamp to ensure proper playback order
    const sortedActions = [...decompressedActions].sort((a, b) => a.timestamp - b.timestamp);
    actionsRef.current = sortedActions;
    gameLogicRef.current = logic;
    const lastAction = sortedActions[sortedActions.length - 1];
    setTotalTime(lastAction ? lastAction.timestamp : replay.durationSeconds * 1000);
    // 准备好后，将指针重置为0
    currentActionIndexRef.current = 0;
  }, [replay.durationSeconds]);

  const [gameLogicState, setGameLogicState] = useState(null);
  const handleStateUpdate = useCallback((newState) => {
    setGameLogicState(newState);
  }, []);

  const processActionsUntilTime = useCallback((targetTime: number, fromTime: number = 0) => {
    if (!gameLogicRef.current) return;

    const actions = actionsRef.current;
    const logic = gameLogicRef.current;
    let newPiecesPlaced = piecesPlaced;
    let newActionsProcessed = actionsProcessed;
    let lastActionTime = fromTime;

    while (currentActionIndexRef.current < actions.length) {
      const action = actions[currentActionIndexRef.current];
      if (action.timestamp > targetTime) break;

      // Tick game physics from last action time to current action time
      if (action.timestamp > lastActionTime && logic.tickReplay) {
        const deltaMs = action.timestamp - lastActionTime;
        logic.tickReplay(deltaMs);
      }

      // Execute actions at their exact timestamp
      switch (action.action) {
        case 'move':
          if (action.data.direction === 'left') logic.movePiece(-1, 0);
          else if (action.data.direction === 'right') logic.movePiece(1, 0);
          // Ignore 'down' moves - let gravity handle falling
          break;
        case 'rotate':
          if (action.data.direction === 'clockwise') logic.rotatePieceClockwise();
          else if (action.data.direction === 'counterclockwise') logic.rotatePieceCounterclockwise();
          else if (action.data.direction === '180') logic.rotatePiece180();
          break;
        case 'drop':
          if (action.data.type === 'hard') logic.hardDrop();
          // Ignore soft drops - let gravity handle falling
          break;
        case 'hold':
          logic.holdCurrentPiece();
          break;
        case 'place':
          // Use place as authoritative anchor for position correction
          if (action.data && logic.currentPiece && logic.forcePlace) {
            const expectedPiece = action.data;
            const actualPiece = logic.currentPiece;
            
            // Check for inconsistency and correct if needed
            if (expectedPiece.x !== actualPiece.x || expectedPiece.y !== actualPiece.y || 
                expectedPiece.rotation !== actualPiece.rotation) {
              console.warn('Replay inconsistency detected - correcting position:', {
                expected: expectedPiece,
                actual: actualPiece,
                timestamp: action.timestamp
              });
              // Force correct position and immediate lock
              logic.forcePlace(expectedPiece.x, expectedPiece.y, expectedPiece.rotation);
            }
          }
          newPiecesPlaced++;
          break;
      }
      
      lastActionTime = action.timestamp;
      newActionsProcessed++;
      currentActionIndexRef.current++;
    }

    // Tick any remaining time after last action
    if (targetTime > lastActionTime && logic.tickReplay) {
      logic.tickReplay(targetTime - lastActionTime);
    }

    // Update statistics if changed
    if (newPiecesPlaced !== piecesPlaced) setPiecesPlaced(newPiecesPlaced);
    if (newActionsProcessed !== actionsProcessed) setActionsProcessed(newActionsProcessed);
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

    // Reset completely and replay from start using "fast-forward replay"
    setReplayKey(Date.now());
    setCurrentTime(0);
    setIsPlaying(false);
    setPiecesPlaced(0);
    setActionsProcessed(0);
    currentActionIndexRef.current = 0;

    // Wait for new gameLogic instance to be ready, then fast-forward to target time
    setTimeout(() => {
      // Fast-forward replay with physics simulation
      processActionsUntilTime(targetTime, 0);
      setCurrentTime(targetTime);
    }, 100);
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

  // 格式化时间
  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
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
                  压缩率: {Math.round(replay.compressionRatio * 100)}%
                </Badge>
                <DialogDescription id="enhanced-replay-description" className="sr-only">
                  Enhanced replay player with multi-speed playback and seeking functionality
                </DialogDescription>
              </DialogTitle>
            </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 游戏区域 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 游戏画面 */}
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-center">
                  {gameLogicState && (
                    <EnhancedGameBoard
                      board={gameLogicState.board}
                      currentPiece={gameLogicState.currentPiece}
                      ghostPiece={gameLogicState.ghostPiece}
                      clearingLines={[]}
                      cellSize={24}
                      showGrid={true}
                      showHiddenRows={false}
                    />
                  )}
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
                    max={totalTime}
                    step={100}
                    onValueChange={(value) => seekTo(value[0])}
                    className="w-full"
                  />
                  <Progress 
                    value={(currentTime / totalTime) * 100}
                    className="w-full"
                  />
                </div>

                {/* 控制按钮 */}
                <div className="flex items-center justify-center gap-4">
                  <Button variant="outline" size="icon" onClick={resetReplay}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  
                  <Button variant="outline" size="icon" onClick={() => seekTo(currentTime - 10000)}>
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  
                  <Button onClick={togglePlayback} size="lg">
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </Button>
                  
                  <Button variant="outline" size="icon" onClick={() => seekTo(currentTime + 10000)}>
                    <SkipForward className="w-4 h-4" />
                  </Button>
                  
                  <Button variant="outline" size="icon">
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