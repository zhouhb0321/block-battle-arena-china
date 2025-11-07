import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { V4ReplayData, ReplayOpcode } from '@/utils/replayV4/types';
import { extractInputEvents, extractReplayMetadata } from '@/utils/replayV4/converter';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useGameRecording } from '@/contexts/GameRecordingContext'; // ✅ 新增
import EnhancedGameBoard from './EnhancedGameBoard';
import HoldPieceDisplay from './HoldPieceDisplay';
import NextPiecePreview from './NextPiecePreview';
import type { GameMode } from '@/utils/gameTypes';

interface ReplayPlayerV4UnifiedProps {
  replay: V4ReplayData;
  onClose: () => void;
  autoPlay?: boolean;
}

export const ReplayPlayerV4Unified: React.FC<ReplayPlayerV4UnifiedProps> = ({
  replay,
  onClose,
  autoPlay = false
}) => {
  // ✅ 获取 GameRecordingContext
  const gameRecording = useGameRecording();
  
  // 提取回放数据
  const inputEvents = useMemo(() => extractInputEvents(replay), [replay]);
  const metadata = useMemo(() => extractReplayMetadata(replay), [replay]);
  
  // 回放时钟状态
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showDetails, setShowDetails] = useState(false);
  
  // 执行索引追踪
  const executedIndexRef = useRef(0);
  const lastFrameTimeRef = useRef<number | null>(null);
  
  // ✅ 回放独立音乐系统
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // ✅ 初始化音乐播放
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/music/WotLK_main_title.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3;
    }
    
    // 开始播放
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn('[Replay] 音乐自动播放失败（浏览器策略限制）:', err);
      });
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);
  
  // ✅ 同步音乐播放状态与回放状态
  useEffect(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.play().catch(err => {
        console.warn('[Replay] 音乐播放失败:', err);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);
  
  // ✅ 标记回放状态，防止 session logout
  useEffect(() => {
    gameRecording.setReplaying(true);
    console.log('[ReplayV4Unified] Replay started, session timeout disabled');
    
    return () => {
      gameRecording.setReplaying(false);
      console.log('[ReplayV4Unified] Replay ended, session timeout re-enabled');
    };
  }, [gameRecording]);
  
  // 构建 GameMode 对象
  const gameMode = useMemo<GameMode>(() => ({
    id: metadata.gameMode,
    displayName: metadata.gameMode,
    description: '',
    isTimeAttack: false
  }), [metadata.gameMode]);
  
  // ✅ 核心：使用完整的游戏引擎（回放模式）
  const gameLogic = useGameLogic({
    gameMode,
    isReplay: true,
    replaySeed: metadata.seed,
    enableReplayGravity: true, // ✅ 启用重力系统，让回放完整模拟游戏逻辑
    replayClockControlled: false, // 通过执行 INPUT 事件控制，不需要虚拟时钟
  });
  
  // 初始化游戏
  useEffect(() => {
    if (!gameLogic.gameStarted) {
      console.log('[ReplayV4Unified] Starting game with seed:', metadata.seed);
      gameLogic.startGame();
    }
  }, [gameLogic, metadata.seed]);
  
  // 主回放循环：执行到 currentTime 的所有事件
  const processEventsToTime = useCallback((targetTime: number) => {
    while (executedIndexRef.current < inputEvents.length) {
      const event = inputEvents[executedIndexRef.current];
      
      if (event.timestamp > targetTime) {
        break; // 还未到达此事件的时间
      }
      
      // 执行事件
      if (event.success) { // 只执行成功的输入
        switch (event.action) {
          case 'moveLeft':
            gameLogic.movePiece(-1, 0);
            break;
          case 'moveRight':
            gameLogic.movePiece(1, 0);
            break;
          case 'softDrop':
            gameLogic.movePiece(0, 1);
            break;
          case 'hardDrop':
            gameLogic.hardDrop();
            break;
          case 'rotateClockwise':
            gameLogic.rotatePieceClockwise();
            break;
          case 'rotateCounterclockwise':
            gameLogic.rotatePieceCounterclockwise();
            break;
          case 'rotate180':
            gameLogic.rotatePiece180();
            break;
          case 'hold':
            gameLogic.holdCurrentPiece();
            break;
        }
      }
      
      executedIndexRef.current++;
    }
  }, [inputEvents, gameLogic]);
  
  // requestAnimationFrame 驱动的播放循环
  useEffect(() => {
    if (!isPlaying || !gameLogic.gameStarted) {
      lastFrameTimeRef.current = null;
      return;
    }
    
    let animationFrameId: number;
    
    const tick = (timestamp: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
      }
      
      const deltaMs = (timestamp - lastFrameTimeRef.current) * playbackSpeed;
      lastFrameTimeRef.current = timestamp;
      
      const newTime = currentTime + deltaMs;
      
      // 检查是否到达结尾
      if (executedIndexRef.current >= inputEvents.length) {
        setIsPlaying(false);
        return;
      }
      
      setCurrentTime(newTime);
      processEventsToTime(newTime);
      
      animationFrameId = requestAnimationFrame(tick);
    };
    
    animationFrameId = requestAnimationFrame(tick);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, playbackSpeed, currentTime, inputEvents.length, processEventsToTime, gameLogic.gameStarted]);
  
  // 控制函数
  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);
  
  const handleReset = useCallback(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    executedIndexRef.current = 0;
    lastFrameTimeRef.current = null;
    gameLogic.startGame(); // 重新初始化游戏
  }, [gameLogic]);
  
  const handleSeek = useCallback((newTime: number) => {
    if (newTime < currentTime) {
      // 向后跳转：重置并重新播放到目标时间
      executedIndexRef.current = 0;
      gameLogic.startGame();
      setCurrentTime(newTime);
      processEventsToTime(newTime);
    } else {
      // 向前跳转：直接处理到目标时间
      setCurrentTime(newTime);
      processEventsToTime(newTime);
    }
    lastFrameTimeRef.current = null;
  }, [currentTime, gameLogic, processEventsToTime]);
  
  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
  }, []);
  
  // 格式化时间
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor(ms % 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };
  
  const totalDuration = replay.stats.duration;
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
  
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-7xl bg-card rounded-lg shadow-2xl border border-border">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-xl font-bold">V4 回放播放器</h2>
            <p className="text-sm text-muted-foreground">
              {metadata.username} · {metadata.gameMode}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowDetails(!showDetails)}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* 主内容 */}
        <div className="flex flex-col lg:flex-row gap-4 p-4">
          {/* 左侧：Hold */}
          <div className="lg:w-32 flex-shrink-0">
            <HoldPieceDisplay 
              holdPiece={gameLogic.holdPiece}
              canHold={gameLogic.canHold}
            />
          </div>
          
          {/* 中间：游戏棋盘 */}
          <div className="flex-1 flex flex-col items-center gap-4">
            {/* 游戏统计 */}
            <div className="grid grid-cols-4 gap-4 w-full max-w-2xl">
              <Card className="p-3 text-center">
                <div className="text-sm text-muted-foreground">得分</div>
                <div className="text-2xl font-bold">{gameLogic.score}</div>
              </Card>
              <Card className="p-3 text-center">
                <div className="text-sm text-muted-foreground">行数</div>
                <div className="text-2xl font-bold">{gameLogic.lines}</div>
              </Card>
              <Card className="p-3 text-center">
                <div className="text-sm text-muted-foreground">等级</div>
                <div className="text-2xl font-bold">{gameLogic.level}</div>
              </Card>
              <Card className="p-3 text-center">
                <div className="text-sm text-muted-foreground">时间</div>
                <div className="text-lg font-bold">{formatTime(currentTime)}</div>
              </Card>
            </div>
            
            {/* 棋盘 */}
            <EnhancedGameBoard
              board={gameLogic.board}
              currentPiece={gameLogic.currentPiece}
              ghostPiece={gameLogic.ghostPiece}
              cellSize={24}
              showGrid={true}
              clearingLines={[]}
            />
            
            {/* 播放控制 */}
            <Card className="w-full max-w-2xl p-4 space-y-4">
              {/* 进度条 */}
              <div className="space-y-2">
                <Slider
                  value={[currentTime]}
                  max={totalDuration}
                  step={16}
                  onValueChange={(value) => handleSeek(value[0])}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(totalDuration)}</span>
                </div>
              </div>
              
              {/* 播放按钮 */}
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="icon" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleSeek(Math.max(0, currentTime - 1000))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button size="lg" onClick={handlePlayPause}>
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleSeek(Math.min(totalDuration, currentTime + 1000))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              {/* 速度控制 */}
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-muted-foreground">速度:</span>
                {[0.25, 0.5, 1, 2, 4].map(speed => (
                  <Badge
                    key={speed}
                    variant={playbackSpeed === speed ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => handleSpeedChange(speed)}
                  >
                    {speed}x
                  </Badge>
                ))}
              </div>
            </Card>
          </div>
          
          {/* 右侧：Next */}
          <div className="lg:w-32 flex-shrink-0">
            <NextPiecePreview 
              nextPieces={gameLogic.nextPieces}
              compact={false}
            />
          </div>
        </div>
        
        {/* 技术细节（可选显示） */}
        {showDetails && (
          <Card className="m-4 p-4 bg-muted/50 text-xs space-y-2">
            <div className="font-semibold">技术信息</div>
            <div className="space-y-1 text-muted-foreground">
              <div>Seed: {metadata.seed.slice(0, 16)}...</div>
              <div>总时长: {formatTime(replay.stats.duration)}</div>
              <div>输入事件: {inputEvents.length}</div>
              <div>已执行: {executedIndexRef.current}</div>
              <div>锁定次数: {replay.stats.lockCount}</div>
              <div>关键帧: {replay.stats.keyframeCount}</div>
              <div>DAS: {metadata.settings.das}ms</div>
              <div>ARR: {metadata.settings.arr}ms</div>
              <div>SDF: {metadata.settings.sdf}ms</div>
            </div>
            
            {/* ✅ P2：执行状态 */}
            <div className="border-t border-muted pt-2 mt-2">
              <div className="font-semibold text-foreground mb-1">执行进度</div>
              <div className="space-y-1">
                <div>已执行: {executedIndexRef.current} / {inputEvents.length}</div>
                <div>进度: {inputEvents.length > 0 ? ((executedIndexRef.current / inputEvents.length) * 100).toFixed(1) : 0}%</div>
                <div>当前时间: {formatTime(currentTime)}</div>
              </div>
            </div>
            
            {/* ✅ P2：游戏状态 */}
            <div className="border-t border-muted pt-2 mt-2">
              <div className="font-semibold text-foreground mb-1">实时状态</div>
              <div className="space-y-1">
                <div>得分: {gameLogic.score}</div>
                <div>行数: {gameLogic.lines}</div>
                <div>等级: {gameLogic.level}</div>
                <div>当前方块: {gameLogic.currentPiece?.type?.type || 'None'}</div>
                {gameLogic.currentPiece && (
                  <div>位置: ({gameLogic.currentPiece.x}, {gameLogic.currentPiece.y}) R{gameLogic.currentPiece.rotation}</div>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ReplayPlayerV4Unified;
