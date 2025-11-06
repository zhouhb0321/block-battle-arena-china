import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { V4ReplayData } from '@/utils/replayV4/types';
import { extractInputEvents, extractReplayMetadata } from '@/utils/replayV4/converter';
import { useGameLogic } from '@/hooks/useGameLogic';
import EnhancedGameBoard from './EnhancedGameBoard';
import HoldPieceDisplay from './HoldPieceDisplay';
import NextPiecePreview from './NextPiecePreview';
import type { GameMode } from '@/utils/gameTypes';

interface DualReplayComparisonProps {
  replay1: V4ReplayData;
  replay2: V4ReplayData;
  onClose: () => void;
}

export const DualReplayComparison: React.FC<DualReplayComparisonProps> = ({
  replay1,
  replay2,
  onClose
}) => {
  // 提取两个回放的数据
  const inputEvents1 = useMemo(() => extractInputEvents(replay1), [replay1]);
  const metadata1 = useMemo(() => extractReplayMetadata(replay1), [replay1]);
  const inputEvents2 = useMemo(() => extractInputEvents(replay2), [replay2]);
  const metadata2 = useMemo(() => extractReplayMetadata(replay2), [replay2]);
  
  // 共享播放控制状态
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // 执行索引追踪
  const executedIndex1Ref = useRef(0);
  const executedIndex2Ref = useRef(0);
  const lastFrameTimeRef = useRef<number | null>(null);
  
  // 构建 GameMode 对象
  const gameMode1 = useMemo<GameMode>(() => ({
    id: metadata1.gameMode,
    displayName: metadata1.gameMode,
    description: '',
    isTimeAttack: false
  }), [metadata1.gameMode]);
  
  const gameMode2 = useMemo<GameMode>(() => ({
    id: metadata2.gameMode,
    displayName: metadata2.gameMode,
    description: '',
    isTimeAttack: false
  }), [metadata2.gameMode]);
  
  // 两个独立的游戏引擎实例
  const gameLogic1 = useGameLogic({
    gameMode: gameMode1,
    isReplay: true,
    replaySeed: metadata1.seed,
    enableReplayGravity: false,
    replayClockControlled: false,
  });
  
  const gameLogic2 = useGameLogic({
    gameMode: gameMode2,
    isReplay: true,
    replaySeed: metadata2.seed,
    enableReplayGravity: false,
    replayClockControlled: false,
  });
  
  // 初始化两个游戏
  useEffect(() => {
    if (!gameLogic1.gameStarted) {
      gameLogic1.startGame();
    }
    if (!gameLogic2.gameStarted) {
      gameLogic2.startGame();
    }
  }, [gameLogic1, gameLogic2]);
  
  // 处理事件到指定时间
  const processEventsToTime = useCallback((targetTime: number) => {
    // 处理回放1的事件
    while (executedIndex1Ref.current < inputEvents1.length) {
      const event = inputEvents1[executedIndex1Ref.current];
      if (event.timestamp > targetTime) break;
      
      if (event.success) {
        switch (event.action) {
          case 'moveLeft': gameLogic1.movePiece(-1, 0); break;
          case 'moveRight': gameLogic1.movePiece(1, 0); break;
          case 'softDrop': gameLogic1.movePiece(0, 1); break;
          case 'hardDrop': gameLogic1.hardDrop(); break;
          case 'rotateClockwise': gameLogic1.rotatePieceClockwise(); break;
          case 'rotateCounterclockwise': gameLogic1.rotatePieceCounterclockwise(); break;
          case 'rotate180': gameLogic1.rotatePiece180(); break;
          case 'hold': gameLogic1.holdCurrentPiece(); break;
        }
      }
      executedIndex1Ref.current++;
    }
    
    // 处理回放2的事件
    while (executedIndex2Ref.current < inputEvents2.length) {
      const event = inputEvents2[executedIndex2Ref.current];
      if (event.timestamp > targetTime) break;
      
      if (event.success) {
        switch (event.action) {
          case 'moveLeft': gameLogic2.movePiece(-1, 0); break;
          case 'moveRight': gameLogic2.movePiece(1, 0); break;
          case 'softDrop': gameLogic2.movePiece(0, 1); break;
          case 'hardDrop': gameLogic2.hardDrop(); break;
          case 'rotateClockwise': gameLogic2.rotatePieceClockwise(); break;
          case 'rotateCounterclockwise': gameLogic2.rotatePieceCounterclockwise(); break;
          case 'rotate180': gameLogic2.rotatePiece180(); break;
          case 'hold': gameLogic2.holdCurrentPiece(); break;
        }
      }
      executedIndex2Ref.current++;
    }
  }, [inputEvents1, inputEvents2, gameLogic1, gameLogic2]);
  
  // 播放循环
  useEffect(() => {
    if (!isPlaying || !gameLogic1.gameStarted || !gameLogic2.gameStarted) {
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
      const maxDuration = Math.max(replay1.stats.duration, replay2.stats.duration);
      if (newTime >= maxDuration) {
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
  }, [isPlaying, playbackSpeed, currentTime, processEventsToTime, gameLogic1.gameStarted, gameLogic2.gameStarted, replay1.stats.duration, replay2.stats.duration]);
  
  // 控制函数
  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);
  
  const handleReset = useCallback(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    executedIndex1Ref.current = 0;
    executedIndex2Ref.current = 0;
    lastFrameTimeRef.current = null;
    gameLogic1.startGame();
    gameLogic2.startGame();
  }, [gameLogic1, gameLogic2]);
  
  const handleSeek = useCallback((newTime: number) => {
    if (newTime < currentTime) {
      // 向后跳转：重置并重新播放
      executedIndex1Ref.current = 0;
      executedIndex2Ref.current = 0;
      gameLogic1.startGame();
      gameLogic2.startGame();
      setCurrentTime(newTime);
      processEventsToTime(newTime);
    } else {
      // 向前跳转
      setCurrentTime(newTime);
      processEventsToTime(newTime);
    }
    lastFrameTimeRef.current = null;
  }, [currentTime, gameLogic1, gameLogic2, processEventsToTime]);
  
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
  
  const maxDuration = Math.max(replay1.stats.duration, replay2.stats.duration);
  const progress = maxDuration > 0 ? (currentTime / maxDuration) * 100 : 0;
  
  // 单个回放面板组件
  const ReplayPanel = ({ 
    gameLogic, 
    metadata, 
    label 
  }: { 
    gameLogic: ReturnType<typeof useGameLogic>; 
    metadata: ReturnType<typeof extractReplayMetadata>;
    label: string;
  }) => (
    <div className="flex flex-col gap-3">
      {/* 玩家信息 */}
      <Card className="p-3">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{metadata.username}</div>
      </Card>
      
      {/* 游戏区域 */}
      <div className="flex gap-2">
        {/* Hold */}
        <div className="w-20 flex-shrink-0">
          <HoldPieceDisplay 
            holdPiece={gameLogic.holdPiece}
            canHold={gameLogic.canHold}
          />
        </div>
        
        {/* 棋盘 */}
        <div className="flex-1 flex justify-center">
          <EnhancedGameBoard
            board={gameLogic.board}
            currentPiece={gameLogic.currentPiece}
            ghostPiece={gameLogic.ghostPiece}
            cellSize={20}
            showGrid={true}
            clearingLines={[]}
          />
        </div>
        
        {/* Next */}
        <div className="w-20 flex-shrink-0">
          <NextPiecePreview 
            nextPieces={gameLogic.nextPieces}
            compact={true}
          />
        </div>
      </div>
      
      {/* 统计信息 */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="p-2 text-center">
          <div className="text-xs text-muted-foreground">得分</div>
          <div className="text-lg font-bold">{gameLogic.score}</div>
        </Card>
        <Card className="p-2 text-center">
          <div className="text-xs text-muted-foreground">行数</div>
          <div className="text-lg font-bold">{gameLogic.lines}</div>
        </Card>
        <Card className="p-2 text-center">
          <div className="text-xs text-muted-foreground">等级</div>
          <div className="text-lg font-bold">{gameLogic.level}</div>
        </Card>
        <Card className="p-2 text-center">
          <div className="text-xs text-muted-foreground">时间</div>
          <div className="text-lg font-bold">{formatTime(currentTime)}</div>
        </Card>
      </div>
    </div>
  );
  
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-7xl bg-card rounded-lg shadow-2xl border border-border">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-xl font-bold">回放对比分析</h2>
            <p className="text-sm text-muted-foreground">
              同时播放两个回放进行对比
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* 主内容 - 两个回放面板 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
          <ReplayPanel 
            gameLogic={gameLogic1} 
            metadata={metadata1}
            label="回放 1"
          />
          <ReplayPanel 
            gameLogic={gameLogic2} 
            metadata={metadata2}
            label="回放 2"
          />
        </div>
        
        {/* 播放控制 */}
        <Card className="m-4 p-4 space-y-4">
          {/* 进度条 */}
          <div className="space-y-2">
            <Slider
              value={[currentTime]}
              max={maxDuration}
              step={16}
              onValueChange={(value) => handleSeek(value[0])}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(maxDuration)}</span>
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
            <Button variant="outline" size="icon" onClick={() => handleSeek(Math.min(maxDuration, currentTime + 1000))}>
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
    </div>
  );
};

export default DualReplayComparison;
