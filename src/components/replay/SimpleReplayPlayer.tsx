import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Play, Pause, RotateCcw, SkipForward, SkipBack, FastForward, Rewind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { V4ReplayData, V4KeyframeEvent } from '@/utils/replayV4/types';
import { extractInputEvents, extractReplayMetadata, extractKeyframeEvents, extractSpawnEvents } from '@/utils/replayV4/converter';
import { extractKeyMoments } from '@/utils/replayV4/eventExtractor';
import { useGameRecording } from '@/contexts/GameRecordingContext';
import { useMusicContext } from '@/contexts/MusicContext';
import ReplayGameBoard from './ReplayGameBoard';
import BackgroundWallpaper from '@/components/BackgroundWallpaper';
import { TETROMINO_TYPES } from '@/utils/pieceGeneration';
import type { GamePiece } from '@/utils/gameTypes';

interface SimpleReplayPlayerProps {
  replay: V4ReplayData;
  onClose: () => void;
  autoPlay?: boolean;
}

// 定义输入事件类型
interface ExtractedInputEvent {
  timestamp: number;
  action: string;
  success: boolean;
  position?: { x: number; y: number };
  rotation?: number;
}

// 从类型字符串创建 GamePiece
const createPieceFromType = (typeStr: string): GamePiece | null => {
  const tetrominoType = TETROMINO_TYPES[typeStr];
  if (!tetrominoType) return null;
  
  return {
    type: tetrominoType,
    x: 3, y: 0, rotation: 0
  };
};

export const SimpleReplayPlayer: React.FC<SimpleReplayPlayerProps> = ({
  replay,
  onClose,
  autoPlay = false
}) => {
  // 数据验证
  if (!replay || !replay.events || !replay.stats || !replay.metadata) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center p-8">
          <h3 className="text-xl font-bold mb-4">回放数据无效</h3>
          <Button onClick={onClose}>返回</Button>
        </div>
      </div>
    );
  }

  const gameRecording = useGameRecording();
  const { requestPlayback, releasePlayback } = useMusicContext();
  
  // 提取回放数据
  const inputEvents = useMemo(() => extractInputEvents(replay), [replay]);
  const keyframes = useMemo(() => extractKeyframeEvents(replay), [replay]);
  const spawnEvents = useMemo(() => extractSpawnEvents(replay), [replay]);
  const metadata = useMemo(() => extractReplayMetadata(replay), [replay]);
  const keyMoments = useMemo(() => extractKeyMoments(replay), [replay]);
  
  // 回放状态
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  
  // 游戏状态（直接由回放数据驱动）
  const [board, setBoard] = useState<number[][]>(() => 
    Array(23).fill(null).map(() => Array(10).fill(0))
  );
  const [currentPiece, setCurrentPiece] = useState<GamePiece | null>(null);
  const [ghostPiece, setGhostPiece] = useState<GamePiece | null>(null);
  const [nextPieces, setNextPieces] = useState<GamePiece[]>([]);
  const [holdPiece, setHoldPiece] = useState<GamePiece | null>(null);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  
  // 追踪状态
  const lastFrameTimeRef = useRef<number | null>(null);
  const lastAppliedKFRef = useRef<V4KeyframeEvent | null>(null);
  const lastInputIndexRef = useRef(0);
  const lastSpawnIndexRef = useRef(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 音乐管理
  useEffect(() => {
    requestPlayback('replay', {
      id: 'replay-music',
      url: '/music/WotLK_main_title.mp3',
      title: 'Replay Music'
    });
    return () => releasePlayback('replay');
  }, [requestPlayback, releasePlayback]);
  
  // 标记回放状态
  useEffect(() => {
    gameRecording.setReplaying(true);
    return () => gameRecording.setReplaying(false);
  }, [gameRecording]);
  
  // 控制条自动隐藏
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);
  
  useEffect(() => {
    const handleMouseMove = () => resetControlsTimeout();
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [resetControlsTimeout]);
  
  // 查找最近的 KEYFRAME
  const findNearestKeyframe = useCallback((time: number): V4KeyframeEvent | null => {
    if (!keyframes || keyframes.length === 0) return null;
    
    let nearest: V4KeyframeEvent | null = null;
    for (const kf of keyframes) {
      if (kf.timestamp <= time) {
        nearest = kf;
      } else {
        break;
      }
    }
    return nearest;
  }, [keyframes]);
  
  // 计算幽灵方块位置
  const calculateGhostPiece = useCallback((piece: GamePiece, boardState: number[][]): GamePiece | null => {
    if (!piece || !piece.type || !piece.type.shape) return null;
    
    const shape = piece.type.shape;
    let ghostY = piece.y;
    
    // 向下查找最低可放置位置
    while (true) {
      let canMove = true;
      for (let row = 0; row < shape.length && canMove; row++) {
        for (let col = 0; col < shape[row].length && canMove; col++) {
          if (shape[row][col] !== 0) {
            const newY = ghostY + 1 + row;
            const newX = piece.x + col;
            if (newY >= boardState.length || newX < 0 || newX >= 10 || 
                (boardState[newY] && boardState[newY][newX] !== 0)) {
              canMove = false;
            }
          }
        }
      }
      if (!canMove) break;
      ghostY++;
    }
    
    return { ...piece, y: ghostY };
  }, []);
  
  // 应用 KEYFRAME 状态
  const applyKeyframe = useCallback((kf: V4KeyframeEvent) => {
    if (!kf) return;
    
    // 设置棋盘
    if (Array.isArray(kf.board) && kf.board.length > 0) {
      setBoard(kf.board.map(row => [...row]));
    }
    
    // 设置统计数据
    setScore(kf.score || 0);
    setLines(kf.lines || 0);
    setLevel(kf.level || 1);
    
    // 设置 NEXT 队列（核心修复）
    if (Array.isArray(kf.nextPieces)) {
      const pieces = kf.nextPieces
        .slice(0, 6)
        .map(type => createPieceFromType(type))
        .filter(Boolean) as GamePiece[];
      setNextPieces(pieces);
    }
    
    // 设置 HOLD
    if (kf.holdPiece) {
      setHoldPiece(createPieceFromType(kf.holdPiece));
    } else {
      setHoldPiece(null);
    }
    
    lastAppliedKFRef.current = kf;
  }, []);
  
  // 处理 INPUT 事件更新当前方块位置
  const processInputEvent = useCallback((event: ExtractedInputEvent, boardState: number[][]) => {
    // 如果事件包含位置信息，直接使用（核心优化）
    if (event.position && event.success) {
      const currentType = currentPiece?.type;
      if (currentType) {
        const updatedPiece: GamePiece = {
          type: currentType,
          x: event.position.x,
          y: event.position.y,
          rotation: event.rotation ?? currentPiece?.rotation ?? 0
        };
        setCurrentPiece(updatedPiece);
        setGhostPiece(calculateGhostPiece(updatedPiece, boardState));
      }
    }
  }, [currentPiece, calculateGhostPiece]);
  
  // 核心：处理事件到指定时间
  const processEventsToTime = useCallback((targetTime: number) => {
    if (!Array.isArray(keyframes)) return;
    
    // 1. 查找并应用最近的 KEYFRAME
    const nearestKF = findNearestKeyframe(targetTime);
    
    if (nearestKF && (!lastAppliedKFRef.current || 
        nearestKF.timestamp > lastAppliedKFRef.current.timestamp)) {
      applyKeyframe(nearestKF);
      
      // 同步事件索引到 KEYFRAME 之后
      while (lastInputIndexRef.current < inputEvents.length &&
             inputEvents[lastInputIndexRef.current].timestamp <= nearestKF.timestamp) {
        lastInputIndexRef.current++;
      }
      while (lastSpawnIndexRef.current < spawnEvents.length &&
             spawnEvents[lastSpawnIndexRef.current].timestamp <= nearestKF.timestamp) {
        lastSpawnIndexRef.current++;
      }
    }
    
    // 2. 处理 SPAWN 事件设置当前方块
    while (lastSpawnIndexRef.current < spawnEvents.length) {
      const spawn = spawnEvents[lastSpawnIndexRef.current];
      if (!spawn || spawn.timestamp > targetTime) break;
      
      const newPiece = createPieceFromType(spawn.pieceType);
      if (newPiece) {
        newPiece.x = spawn.x;
        newPiece.y = spawn.y;
        setCurrentPiece(newPiece);
        setGhostPiece(calculateGhostPiece(newPiece, board));
      }
      lastSpawnIndexRef.current++;
    }
    
    // 3. 处理 INPUT 事件更新方块位置
    const currentBoard = board;
    while (lastInputIndexRef.current < inputEvents.length) {
      const event = inputEvents[lastInputIndexRef.current];
      if (!event || event.timestamp > targetTime) break;
      
      if (event.success && event.position) {
        processInputEvent(event, currentBoard);
      }
      
      lastInputIndexRef.current++;
    }
  }, [keyframes, inputEvents, spawnEvents, board, findNearestKeyframe, applyKeyframe, processInputEvent, calculateGhostPiece]);
  
  // 播放循环
  useEffect(() => {
    if (!isPlaying) {
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
      
      // 检查是否播放结束
      if (newTime >= replay.stats.duration) {
        setCurrentTime(replay.stats.duration);
        setIsPlaying(false);
        return;
      }
      
      setCurrentTime(newTime);
      processEventsToTime(newTime);
      
      animationFrameId = requestAnimationFrame(tick);
    };
    
    animationFrameId = requestAnimationFrame(tick);
    
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, playbackSpeed, currentTime, replay.stats.duration, processEventsToTime]);
  
  // 控制函数
  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
    resetControlsTimeout();
  }, [resetControlsTimeout]);
  
  const handleReset = useCallback(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    lastFrameTimeRef.current = null;
    lastAppliedKFRef.current = null;
    lastInputIndexRef.current = 0;
    lastSpawnIndexRef.current = 0;
    
    // 重置游戏状态
    setBoard(Array(23).fill(null).map(() => Array(10).fill(0)));
    setCurrentPiece(null);
    setGhostPiece(null);
    setNextPieces([]);
    setHoldPiece(null);
    setScore(0);
    setLines(0);
    setLevel(1);
    
    // 应用第一个 KEYFRAME
    if (keyframes && keyframes.length > 0) {
      applyKeyframe(keyframes[0]);
    }
  }, [keyframes, applyKeyframe]);
  
  const handleSeek = useCallback((newTime: number) => {
    // 回退时需要重置状态
    if (newTime < currentTime) {
      lastAppliedKFRef.current = null;
      lastInputIndexRef.current = 0;
      lastSpawnIndexRef.current = 0;
      setBoard(Array(23).fill(null).map(() => Array(10).fill(0)));
      setCurrentPiece(null);
      setGhostPiece(null);
    }
    
    setCurrentTime(newTime);
    processEventsToTime(newTime);
    lastFrameTimeRef.current = null;
    resetControlsTimeout();
  }, [currentTime, processEventsToTime, resetControlsTimeout]);
  
  const handleSkip = useCallback((seconds: number) => {
    const newTime = Math.max(0, Math.min(currentTime + seconds * 1000, replay.stats.duration));
    handleSeek(newTime);
  }, [currentTime, replay.stats.duration, handleSeek]);
  
  const jumpToMoment = useCallback((direction: 'next' | 'prev') => {
    if (direction === 'next') {
      const next = keyMoments.find(m => m.timestamp > currentTime);
      if (next) handleSeek(next.timestamp);
    } else {
      const prev = keyMoments.filter(m => m.timestamp < currentTime - 500);
      if (prev.length > 0) handleSeek(prev[prev.length - 1].timestamp);
    }
  }, [keyMoments, currentTime, handleSeek]);
  
  // 键盘快捷键
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSkip(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSkip(5);
          break;
        case 'n':
          jumpToMoment('next');
          break;
        case 'p':
          jumpToMoment('prev');
          break;
        case 'Home':
          e.preventDefault();
          handleReset();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlePlayPause, handleSkip, jumpToMoment, handleReset, onClose]);
  
  // 格式化时间
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const totalDuration = replay.stats.duration;
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  // 计算统计数据
  const currentPPS = currentTime > 0 
    ? (lines / (currentTime / 1000)).toFixed(2) 
    : '0.00';
  const currentAPM = currentTime > 0 
    ? ((score / (currentTime / 60000)) || 0).toFixed(1) 
    : '0.0';

  return (
    <div className="fixed inset-0 bg-black z-50">
      <BackgroundWallpaper>
        {/* 关闭按钮 - 右上角悬浮 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="fixed top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10"
        >
          <X className="w-5 h-5" />
        </Button>
        
        {/* 游戏信息 - 左上角悬浮 */}
        <div className="fixed top-4 left-4 z-40 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2">
          <div className="text-white font-bold">{metadata.username || 'Player'}</div>
          <div className="text-sm text-gray-400">{metadata.gameMode}</div>
        </div>

        {/* 游戏窗口 - 居中全屏 */}
        <div className="absolute inset-0 flex items-center justify-center pb-24">
          <ReplayGameBoard
            board={board}
            currentPiece={currentPiece}
            ghostPiece={ghostPiece}
            nextPieces={nextPieces}
            holdPiece={holdPiece}
            score={score}
            lines={lines}
            level={level}
            pps={parseFloat(currentPPS)}
            apm={parseFloat(currentAPM)}
            time={currentTime / 1000}
          />
        </div>

        {/* 悬浮控制条 - 底部 */}
        <div 
          className={`fixed bottom-0 left-0 right-0 transition-all duration-300 ${
            showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          }`}
          onMouseEnter={() => setShowControls(true)}
        >
          <div className="bg-black/80 backdrop-blur-md border-t border-white/10 p-4">
            {/* 进度条 */}
            <div className="flex items-center gap-4 mb-3">
              <span className="text-sm font-mono text-white/80 w-14 text-right">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[progress]}
                onValueChange={([value]) => {
                  handleSeek((value / 100) * totalDuration);
                }}
                max={100}
                step={0.1}
                className="flex-1"
              />
              <span className="text-sm font-mono text-white/80 w-14">
                {formatTime(totalDuration)}
              </span>
            </div>

            {/* 控制按钮 */}
            <div className="flex items-center justify-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleReset}
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => jumpToMoment('prev')}
                className="text-white/80 hover:text-white hover:bg-white/10"
                title="上一个关键时刻 (P)"
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleSkip(-5)}
                className="text-white/80 hover:text-white hover:bg-white/10"
                title="快退5秒 (←)"
              >
                <Rewind className="w-4 h-4" />
              </Button>
              
              <Button 
                variant="default" 
                size="lg"
                onClick={handlePlayPause}
                className="px-8 bg-white text-black hover:bg-white/90"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleSkip(5)}
                className="text-white/80 hover:text-white hover:bg-white/10"
                title="快进5秒 (→)"
              >
                <FastForward className="w-4 h-4" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => jumpToMoment('next')}
                className="text-white/80 hover:text-white hover:bg-white/10"
                title="下一个关键时刻 (N)"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
              
              {/* 速度选择 */}
              <div className="flex items-center gap-1 ml-4 border-l border-white/20 pl-4">
                {[0.5, 1, 2, 4].map(speed => (
                  <Button
                    key={speed}
                    variant="ghost"
                    size="sm"
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`text-xs px-2 ${
                      playbackSpeed === speed 
                        ? 'bg-white text-black' 
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {speed}x
                  </Button>
                ))}
              </div>
              
              {/* 统计信息 */}
              <div className="flex items-center gap-4 ml-4 border-l border-white/20 pl-4 text-sm text-white/60">
                <span>得分: <span className="text-white font-mono">{score.toLocaleString()}</span></span>
                <span>行数: <span className="text-white font-mono">{lines}</span></span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 鼠标移动探测区（触发控制条显示） */}
        <div 
          className="fixed bottom-0 left-0 right-0 h-20 z-40"
          onMouseEnter={() => setShowControls(true)}
        />
      </BackgroundWallpaper>
    </div>
  );
};
