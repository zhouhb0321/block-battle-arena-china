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
import PiecePreview from '@/components/PiecePreview';
import HoldPieceDisplay from '@/components/HoldPieceDisplay';
import { ReplayCompressor, SeededRandom } from '@/utils/replayCompression';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipBack, 
  SkipForward, 
  Bookmark,
  TrendingUp,
  Trophy,
  Target,
  Clock,
  Zap
} from 'lucide-react';
import type { 
  CompressedReplay, 
  ReplayPlayerState, 
  ReplayPlayerConfig,
  CompressedAction
} from '@/utils/replayTypes';

interface EnhancedReplayPlayerProps {
  replay: CompressedReplay;
  isOpen: boolean;
  onClose: () => void;
  config?: Partial<ReplayPlayerConfig>;
}

export const EnhancedReplayPlayer: React.FC<EnhancedReplayPlayerProps> = ({
  replay,
  isOpen,
  onClose,
  config = {}
}) => {
  const [playerState, setPlayerState] = useState<ReplayPlayerState>({
    isPlaying: false,
    currentTime: 0,
    totalTime: 0,
    playbackSpeed: 1,
    currentActionIndex: 0,
    gameBoard: [],
    gameStats: {
      score: 0,
      lines: 0,
      level: 1,
      pps: 0,
      apm: 0,
      pieces: 0
    }
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const actionsRef = useRef<CompressedAction[]>([]);
  const gameEngineRef = useRef<any>(null);
  const pieceGeneratorRef = useRef<SeededRandom | null>(null);

  const playerConfig = {
    speedOptions: [0.25, 0.5, 1, 2, 4],
    enableBookmarks: true,
    showStatistics: true,
    autoMarkEvents: true,
    ...config
  };

  // 初始化回放数据
  useEffect(() => {
    if (!replay || !isOpen) return;

    try {
      // 解压缩动作数据
      const decompressedActions = ReplayCompressor.decodeFromBinary(replay.compressedActions);
      actionsRef.current = decompressedActions;

      // 创建方块生成器
      pieceGeneratorRef.current = new SeededRandom(replay.seed);

      // 设置总时长
      const totalTime = decompressedActions.length > 0 
        ? decompressedActions[decompressedActions.length - 1].t 
        : replay.durationSeconds * 1000;

      setPlayerState(prev => ({
        ...prev,
        totalTime,
        gameBoard: [...(replay.initialBoard || Array(20).fill(0).map(() => Array(10).fill(0)))],
        currentTime: 0,
        currentActionIndex: 0,
        gameStats: {
          score: 0,
          lines: 0,
          level: 1,
          pps: 0,
          apm: 0,
          pieces: 0
        }
      }));

      console.log('Replay loaded:', {
        actions: decompressedActions.length,
        totalTime,
        seed: replay.seed,
        compressionRatio: replay.compressionRatio
      });

    } catch (error) {
      console.error('Error loading replay:', error);
    }
  }, [replay, isOpen]);

  // 播放控制
  const togglePlayback = useCallback(() => {
    setPlayerState(prev => {
      const newIsPlaying = !prev.isPlaying;
      
      if (newIsPlaying) {
        // 开始播放
        intervalRef.current = setInterval(() => {
          setPlayerState(current => {
            const timeIncrement = 16 * current.playbackSpeed; // 16ms per frame
            const newTime = Math.min(current.currentTime + timeIncrement, current.totalTime);
            
            // 处理动作
            const newState = processActionsUntilTime(current, newTime);
            
            if (newTime >= current.totalTime) {
              // 播放结束
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              return { ...newState, isPlaying: false };
            }
            
            return { ...newState, currentTime: newTime };
          });
        }, 16); // 60fps
      } else {
        // 暂停播放
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
      
      return { ...prev, isPlaying: newIsPlaying };
    });
  }, []);

  // 重置回放
  const resetReplay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setPlayerState(prev => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
      currentActionIndex: 0,
      gameBoard: [...(replay.initialBoard || Array(20).fill(0).map(() => Array(10).fill(0)))],
      gameStats: {
        score: 0,
        lines: 0,
        level: 1,
        pps: 0,
        apm: 0,
        pieces: 0
      }
    }));
  }, [replay]);

  // 跳转到指定时间
  const seekTo = useCallback((time: number) => {
    const targetTime = Math.max(0, Math.min(time, playerState.totalTime));
    
    // 如果向前跳转，从头开始重建
    if (targetTime < playerState.currentTime) {
      const newState = rebuildStateFromStart(targetTime);
      setPlayerState(prev => ({ ...prev, ...newState, currentTime: targetTime }));
    } else {
      // 向后跳转，继续处理
      const newState = processActionsUntilTime(playerState, targetTime);
      setPlayerState(prev => ({ ...prev, ...newState, currentTime: targetTime }));
    }
  }, [playerState]);

  // 处理动作直到指定时间
  const processActionsUntilTime = (currentState: ReplayPlayerState, targetTime: number) => {
    let newState = { ...currentState };
    const actions = actionsRef.current;

    while (newState.currentActionIndex < actions.length) {
      const action = actions[newState.currentActionIndex];
      
      if (action.t > targetTime) break;

      // 处理动作
      newState = processAction(newState, action);
      newState.currentActionIndex++;
    }

    return newState;
  };

  // 从头重建状态
  const rebuildStateFromStart = (targetTime: number): Partial<ReplayPlayerState> => {
    let state: ReplayPlayerState = {
      isPlaying: false,
      currentTime: 0,
      totalTime: playerState.totalTime,
      playbackSpeed: playerState.playbackSpeed,
      currentActionIndex: 0,
      gameBoard: [...(replay.initialBoard || Array(20).fill(0).map(() => Array(10).fill(0)))],
      gameStats: {
        score: 0,
        lines: 0,
        level: 1,
        pps: 0,
        apm: 0,
        pieces: 0
      }
    };

    return processActionsUntilTime(state, targetTime);
  };

  // 处理单个动作
  const processAction = (state: ReplayPlayerState, action: CompressedAction): ReplayPlayerState => {
    const newState = { ...state };
    
    // 解压缩动作
    const decompressedAction = ReplayCompressor.decompressActions([action])[0];
    
    // 根据动作类型更新游戏状态
    switch (decompressedAction.action) {
      case 'place':
        // 方块放置 - 更新分数和统计
        newState.gameStats.pieces++;
        newState.gameStats.score += 100; // 简化计分
        
        // 检查行消除
        const linesCleared = checkLineClears(newState.gameBoard);
        if (linesCleared > 0) {
          newState.gameStats.lines += linesCleared;
          newState.gameStats.score += linesCleared * 400;
        }
        break;
        
      case 'move':
      case 'rotate':
      case 'drop':
        // 移动操作 - 更新APM
        const timeInMinutes = action.t / 60000;
        newState.gameStats.apm = timeInMinutes > 0 ? newState.gameStats.pieces / timeInMinutes : 0;
        break;
    }

    // 计算PPS
    const timeInSeconds = action.t / 1000;
    newState.gameStats.pps = timeInSeconds > 0 ? newState.gameStats.pieces / timeInSeconds : 0;

    return newState;
  };

  // 检查行消除（简化版）
  const checkLineClears = (board: number[][]): number => {
    let linesCleared = 0;
    for (let row = 0; row < board.length; row++) {
      if (board[row].every(cell => cell !== 0)) {
        linesCleared++;
      }
    }
    return linesCleared;
  };

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
                  <GameBoard
                    board={playerState.gameBoard}
                    currentPiece={null}
                    ghostPiece={null}
                    clearingLines={[]}
                    cellSize={24}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 播放控制 */}
            <Card>
              <CardContent className="p-4 space-y-4">
                {/* 进度条 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{formatTime(playerState.currentTime)}</span>
                    <span>{formatTime(playerState.totalTime)}</span>
                  </div>
                  <Slider
                    value={[playerState.currentTime]}
                    max={playerState.totalTime}
                    step={100}
                    onValueChange={(value) => seekTo(value[0])}
                    className="w-full"
                  />
                  <Progress 
                    value={(playerState.currentTime / playerState.totalTime) * 100} 
                    className="w-full"
                  />
                </div>

                {/* 控制按钮 */}
                <div className="flex items-center justify-center gap-4">
                  <Button variant="outline" size="icon" onClick={resetReplay}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  
                  <Button variant="outline" size="icon" onClick={() => seekTo(playerState.currentTime - 10000)}>
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  
                  <Button onClick={togglePlayback} size="lg">
                    {playerState.isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </Button>
                  
                  <Button variant="outline" size="icon" onClick={() => seekTo(playerState.currentTime + 10000)}>
                    <SkipForward className="w-4 h-4" />
                  </Button>
                  
                  {playerConfig.enableBookmarks && (
                    <Button variant="outline" size="icon">
                      <Bookmark className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* 播放速度 */}
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm font-medium">播放速度:</span>
                  <Select 
                    value={playerState.playbackSpeed.toString()} 
                    onValueChange={(value) => setPlayerState(prev => ({ ...prev, playbackSpeed: parseFloat(value) }))}
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
            {playerConfig.showStatistics && (
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
                    <span className="font-mono">{playerState.gameStats.score.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-primary/20 rounded" />
                      <span>行数:</span>
                    </div>
                    <span className="font-mono">{playerState.gameStats.lines}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>PPS:</span>
                    </div>
                    <span className="font-mono">{playerState.gameStats.pps.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      <span>APM:</span>
                    </div>
                    <span className="font-mono">{Math.round(playerState.gameStats.apm)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <span>方块数:</span>
                    <span className="font-mono">{playerState.gameStats.pieces}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>等级:</span>
                    <span className="font-mono">{playerState.gameStats.level}</span>
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