// 增强的录像回放播放器 - 支持压缩格式和多倍速

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import GameBoard from '@/components/GameBoard';
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
    onGameEnd: () => {}, // 在回放中不处理游戏结束
    isReplay: true,
    replaySeed: replay.seed,
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

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const actionsRef = useRef<DecompressedReplayAction[]>([]);
  const gameLogicRef = useRef<any>(null);
  const currentActionIndexRef = useRef(0);

  const playerConfig = {
    speedOptions: [0.25, 0.5, 1, 2, 4],
    ...config
  };

  const handleActionsReady = useCallback((decompressedActions, logic) => {
    actionsRef.current = decompressedActions;
    gameLogicRef.current = logic;
    const lastAction = decompressedActions[decompressedActions.length - 1];
    setTotalTime(lastAction ? lastAction.timestamp : replay.durationSeconds * 1000);
    // 准备好后，将指针重置为0
    currentActionIndexRef.current = 0;
  }, [replay.durationSeconds]);

  const [gameLogicState, setGameLogicState] = useState(null);
  const handleStateUpdate = useCallback((newState) => {
    setGameLogicState(newState);
  }, []);

  const processActionsUntilTime = useCallback((targetTime: number) => {
    if (!gameLogicRef.current) return;

    const actions = actionsRef.current;
    const logic = gameLogicRef.current;

    while (currentActionIndexRef.current < actions.length) {
      const action = actions[currentActionIndexRef.current];
      if (action.timestamp > targetTime) break;

      // 执行动作
      switch (action.action) {
        case 'move':
          logic.movePiece(action.data.direction === 'left' ? -1 : 1, 0);
          break;
        case 'rotate':
          if (action.data.direction === 'clockwise') logic.rotatePieceClockwise();
          else if (action.data.direction === 'counterclockwise') logic.rotatePieceCounterclockwise();
          else if (action.data.direction === '180') logic.rotatePiece180();
          break;
        case 'drop':
          if (action.data.type === 'hard') logic.hardDrop();
          else logic.movePiece(0, 1); // Soft drop
          break;
        case 'hold':
          logic.holdCurrentPiece();
          break;
        case 'place':
          // 'place' is a result of hardDrop or lockDelay, not a direct action to call.
          // The game logic handles placing pieces automatically.
          break;
      }
      currentActionIndexRef.current++;
    }
  }, []);

  const resetReplay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(false);
    setCurrentTime(0);
    setReplayKey(Date.now()); // 改变key来强制ReplayGame重新挂载和初始化
  }, []);

  const seekTo = useCallback((time: number) => {
     const targetTime = Math.max(0, Math.min(time, totalTime));

     // 通过重置key和时间来从头开始
     setReplayKey(Date.now());
     setCurrentTime(targetTime);
     setIsPlaying(false); // 寻址后暂停

     // 我们需要等待新的 gameLogic 实例准备好
     // 这里用一个短暂的延迟来等待ReplayGame重新初始化
     setTimeout(() => {
       processActionsUntilTime(targetTime);
     }, 50);
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
            return totalTime;
          }
          processActionsUntilTime(newTime);
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <ReplayGame
          key={replayKey}
          replay={replay}
          onStateUpdate={handleStateUpdate}
          onActionsReady={handleActionsReady}
        />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            录像回放 - {replay.gameMode}
            <Badge variant="secondary">
              压缩率: {Math.round(replay.compressionRatio * 100)}%
            </Badge>
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
                    <GameBoard
                      board={gameLogicState.board}
                      currentPiece={gameLogicState.currentPiece}
                      ghostPiece={gameLogicState.ghostPiece}
                      clearingLines={[]}
                      cellSize={24}
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
                  <Select 
                    value={playbackSpeed.toString()}
                    onValueChange={(value) => setPlaybackSpeed(parseFloat(value))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {playerConfig.speedOptions.map(speed => (
                        <SelectItem key={speed} value={speed.toString()}>
                          {speed}x
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <span className="font-mono">{gameLogicState.pps.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      <span>APM:</span>
                    </div>
                    <span className="font-mono">{Math.round(gameLogicState.apm)}</span>
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
                  <span className="font-mono">{(replay.compressedActions.length / 1024).toFixed(1)} KB</span>
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