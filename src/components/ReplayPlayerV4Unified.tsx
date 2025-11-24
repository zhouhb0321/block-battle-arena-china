import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Settings, Volume2, VolumeX, Zap, Target, Flame, FastForward, Rewind, SkipForward, SkipBack, Info, PictureInPicture } from 'lucide-react';
import { useMusicContext } from '@/contexts/MusicContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { V4ReplayData, ReplayOpcode, V4LockEvent, V4KeyframeEvent } from '@/utils/replayV4/types';
import { extractInputEvents, extractReplayMetadata, extractLockEvents, extractKeyframeEvents } from '@/utils/replayV4/converter';
import { extractKeyMoments, calculateReplayStats } from '@/utils/replayV4/eventExtractor';
import { ReplayConsistencyDashboard } from './ReplayConsistencyDashboard';
import { ReplaySequenceValidator } from './ReplaySequenceValidator';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useGameRecording } from '@/contexts/GameRecordingContext';
import { useReplayDiagnosticsContext } from '@/contexts/ReplayDiagnosticsContext';
import EnhancedGameBoard from './EnhancedGameBoard';
import HoldPieceDisplay from './HoldPieceDisplay';
import NextPiecePreview from './NextPiecePreview';
import { PictureInPictureReplay } from './PictureInPictureReplay';
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
  const diagnostics = useReplayDiagnosticsContext();
  
  // 提取回放数据
  const inputEvents = useMemo(() => extractInputEvents(replay), [replay]);
  const lockEvents = useMemo(() => extractLockEvents(replay), [replay]);
  const keyframes = useMemo(() => extractKeyframeEvents(replay), [replay]);
  const metadata = useMemo(() => extractReplayMetadata(replay), [replay]);
  const keyMoments = useMemo(() => extractKeyMoments(replay), [replay]);
  const replayStats = useMemo(() => calculateReplayStats(replay), [replay]);
  
  // ✅ Extract and prepare pre-generated pieces from recorded sequence
  const preGeneratedPieces = useMemo(() => {
    const pieceSequence = metadata?.initialPieceSequence || [];
    if (!Array.isArray(pieceSequence) || pieceSequence.length === 0) {
      console.warn('[ReplayV4Unified] ⚠️ No piece sequence found in metadata');
      return [];
    }
    
    // ✅ 增强容错：过滤并验证方块类型
    const validTypes = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    const sanitized = pieceSequence
      .map((t: any) => {
        if (typeof t === 'string') {
          const cleaned = t.trim().charAt(0).toUpperCase();
          return validTypes.includes(cleaned) ? cleaned : null;
        } else if (t && typeof t === 'object') {
          // 尝试提取对象中的 type 或 name
          const type = t.type || t.name;
          if (typeof type === 'string') {
            const cleaned = type.charAt(0).toUpperCase();
            return validTypes.includes(cleaned) ? cleaned : null;
          }
        }
        return null;
      })
      .filter(Boolean) as string[];
    
    console.log('[ReplayV4Unified] ✅ Piece sequence sanitized:', {
      originalLength: pieceSequence.length,
      sanitizedLength: sanitized.length,
      invalidCount: pieceSequence.length - sanitized.length,
      first20: sanitized.slice(0, 20).join(''),
      last20: sanitized.slice(-20).join('')
    });
    
    if (sanitized.length < 50) {
      console.error('[ReplayV4Unified] ⚠️ Insufficient valid pieces:', sanitized.length);
    }
    
    return sanitized;
  }, [metadata]);
  
  // Track actually spawned pieces during replay for validation
  const [spawnedPieces, setSpawnedPieces] = useState<string[]>([]);
  
  // 回放时钟状态
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showDetails, setShowDetails] = useState(false);
  const [currentMomentIndex, setCurrentMomentIndex] = useState(-1);
  const [isPipMode, setIsPipMode] = useState(false);
  
  // 执行索引追踪
  const executedIndexRef = useRef(0);
  const lastFrameTimeRef = useRef<number | null>(null);
  const lastKFTimeRef = useRef<number>(0);
  const currentLockIndexRef = useRef<number>(0);
  
  // ✅ 使用统一音乐管理
  const { requestPlayback, releasePlayback } = useMusicContext();
  
  useEffect(() => {
    requestPlayback('replay', {
      id: 'replay-music',
      url: '/music/WotLK_main_title.mp3',
      title: 'Replay Music'
    });
    
    return () => {
      releasePlayback('replay');
    };
  }, [requestPlayback, releasePlayback]);
  
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
    preGeneratedPieceTypes: preGeneratedPieces, // ✅ Pass recorded piece sequence
    enableReplayGravity: true, // ✅ 启用重力系统，让回放完整模拟游戏逻辑
    replayClockControlled: true, // ✅ 启用虚拟时钟控制，确保时间同步
  });
  
  // 初始化游戏
  useEffect(() => {
    if (!gameLogic.gameStarted) {
      console.log('[ReplayV4Unified] Starting game with seed:', metadata.seed);
      gameLogic.startGame();
    }
  }, [gameLogic, metadata.seed]);
  
  // Track spawned pieces for validation
  useEffect(() => {
    if (gameLogic.currentPiece?.type?.type) {
      setSpawnedPieces(prev => {
        const pieceType = gameLogic.currentPiece.type.type;
        // Only add if it's a new piece (not duplicate)
        if (prev.length === 0 || prev[prev.length - 1] !== pieceType) {
          console.log(`[ReplayV4Unified] 🔍 Tracked spawn: ${pieceType} (total: ${prev.length + 1})`);
          return [...prev, pieceType];
        }
        return prev;
      });
    }
  }, [gameLogic.currentPiece]);
  
  // ✅ P0: 主回放循环 - INPUT驱动 + KEYFRAME校正
  const processEventsToTime = useCallback((targetTime: number) => {
    // 安全检查
    if (!Array.isArray(inputEvents) || !Array.isArray(keyframes)) {
      console.warn('[Replay] ⚠️ Missing events arrays');
      return;
    }
    
    // 1. 检查是否需要 KEYFRAME 校正
    const nextKF = keyframes.find(kf => 
      kf && kf.timestamp > lastKFTimeRef.current && 
      kf.timestamp <= targetTime
    );
    
    if (nextKF) {
      console.log(`[Replay] 🔄 KEYFRAME 校正 @ ${nextKF.timestamp}ms`, {
        board: Array.isArray(nextKF.board) ? nextKF.board.flat().filter(c => c !== 0).length + ' cells' : 'invalid',
        score: nextKF.score,
        lines: nextKF.lines,
        level: nextKF.level,
        next: Array.isArray(nextKF.nextPieces) ? nextKF.nextPieces.slice(0, 3) : [],
        hold: nextKF.holdPiece
      });
      
      // 强制同步状态到 KEYFRAME - 添加安全检查
      if (gameLogic?.forceSetGameState && Array.isArray(nextKF.board)) {
        gameLogic.forceSetGameState({
          board: nextKF.board,
          score: nextKF.score || 0,
          lines: nextKF.lines || 0,
          level: nextKF.level || 1,
          nextPieces: Array.isArray(nextKF.nextPieces) ? nextKF.nextPieces : [],
          holdPiece: nextKF.holdPiece || null
        });
      }
      
      lastKFTimeRef.current = nextKF.timestamp;
      
      // 跳过已处理的输入事件到 KEYFRAME 之后
      while (executedIndexRef.current < inputEvents.length && 
             inputEvents[executedIndexRef.current].timestamp <= nextKF.timestamp) {
        executedIndexRef.current++;
      }
    }
    
    // 2. 执行 INPUT 事件（从上次停止的地方继续）
    while (executedIndexRef.current < inputEvents.length) {
      const event = inputEvents[executedIndexRef.current];
      
      if (!event || typeof event.timestamp !== 'number') {
        console.warn('[Replay] ⚠️ Invalid event at index', executedIndexRef.current);
        executedIndexRef.current++;
        continue;
      }
      
      if (event.timestamp > targetTime) {
        break; // 还未到达此事件的时间
      }
      
      // 执行事件 - 添加安全检查
      if (event.success && gameLogic?.movePiece) { // 只执行成功的输入且游戏逻辑可用
        try {
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
        } catch (error) {
          console.error('[Replay] Error executing action:', event.action, error);
        }
      }
      
      executedIndexRef.current++;
    }
    
    // 3. ✅ 验证 LOCK 事件（诊断模式）
    if (diagnostics.enabled && gameLogic.currentPiece) {
      // 查找当前时间附近的 LOCK 事件
      const recentLock = lockEvents.find(lock => 
        lock.timestamp >= targetTime - 50 && 
        lock.timestamp <= targetTime + 50
      );
      
      if (recentLock && gameLogic.currentPiece) {
        const currentPos = gameLogic.currentPiece;
        if (
          recentLock.x !== currentPos.x ||
          recentLock.y !== currentPos.y ||
          recentLock.rotation !== currentPos.rotation
        ) {
          console.warn('[Replay] ⚠️ LOCK 位置不匹配！', {
            timestamp: recentLock.timestamp,
            expected: { x: recentLock.x, y: recentLock.y, rotation: recentLock.rotation },
            actual: { x: currentPos.x, y: currentPos.y, rotation: currentPos.rotation }
          });
        }
      }
    }
  }, [inputEvents, keyframes, lockEvents, gameLogic, diagnostics.enabled]);
  
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
      
      // ✅ 驱动游戏逻辑的虚拟时钟（重力和锁定延迟）
      if (gameLogic?.updateReplayTime) {
        gameLogic.updateReplayTime(deltaMs);
      }
      
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
    lastKFTimeRef.current = 0;
    currentLockIndexRef.current = 0;
    gameLogic.startGame(); // 重新初始化游戏
  }, [gameLogic]);
  
  const handleSeek = useCallback((newTime: number) => {
    if (newTime < currentTime) {
      // 向后跳转：重置并重新播放到目标时间
      executedIndexRef.current = 0;
      lastKFTimeRef.current = 0;
      currentLockIndexRef.current = 0;
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
  
  // 计算总时长
  const totalDuration = replay.stats.duration;
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
  
  // 快进/快退功能（5秒、10秒）
  const handleSkipForward = useCallback((seconds: number) => {
    const newTime = Math.min(currentTime + seconds * 1000, totalDuration);
    handleSeek(newTime);
  }, [currentTime, totalDuration, handleSeek]);
  
  const handleSkipBackward = useCallback((seconds: number) => {
    const newTime = Math.max(currentTime - seconds * 1000, 0);
    handleSeek(newTime);
  }, [currentTime, handleSeek]);
  
  // ✅ 快速跳转到关键时刻
  const jumpToNextMoment = useCallback(() => {
    const nextMoment = keyMoments.find(m => m.timestamp > currentTime);
    if (nextMoment) {
      handleSeek(nextMoment.timestamp);
      setCurrentMomentIndex(keyMoments.indexOf(nextMoment));
    }
  }, [keyMoments, currentTime, handleSeek]);
  
  const jumpToPreviousMoment = useCallback(() => {
    const previousMoments = keyMoments.filter(m => m.timestamp < currentTime);
    if (previousMoments.length > 0) {
      const prevMoment = previousMoments[previousMoments.length - 1];
      handleSeek(prevMoment.timestamp);
      setCurrentMomentIndex(keyMoments.indexOf(prevMoment));
    }
  }, [keyMoments, currentTime, handleSeek]);
  
  // ✅ 增强的键盘快捷键
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // 防止在输入框中触发
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key) {
        case 'n':
          jumpToNextMoment();
          break;
        case 'p':
          jumpToPreviousMoment();
          break;
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSkipBackward(5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSkipForward(5);
          break;
        case '[':
          e.preventDefault();
          setPlaybackSpeed(prev => Math.max(0.25, prev - 0.25));
          break;
        case ']':
          e.preventDefault();
          setPlaybackSpeed(prev => Math.min(4, prev + 0.25));
          break;
        case 'Home':
          e.preventDefault();
          handleReset();
          break;
        case 'End':
          e.preventDefault();
          handleSeek(totalDuration);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [jumpToNextMoment, jumpToPreviousMoment, handlePlayPause, handleSkipForward, handleSkipBackward, handleReset, handleSeek, totalDuration]);
  
  // 格式化时间
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor(ms % 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };
  
  // 画中画模式切换
  const handleTogglePip = useCallback(() => {
    setIsPipMode(prev => !prev);
  }, []);
  
  const handlePipClose = useCallback(() => {
    setIsPipMode(false);
  }, []);
  
  const handlePipMaximize = useCallback(() => {
    setIsPipMode(false);
  }, []);
  
  // 渲染画中画模式
  if (isPipMode) {
    return (
      <PictureInPictureReplay
        board={gameLogic.board}
        currentPiece={gameLogic.currentPiece}
        ghostPiece={gameLogic.ghostPiece}
        score={gameLogic.score}
        lines={gameLogic.lines}
        level={gameLogic.level}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        currentTime={currentTime}
        onClose={handlePipClose}
        onMaximize={handlePipMaximize}
      />
    );
  }
  
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
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleTogglePip}
              title="画中画模式"
            >
              <PictureInPicture className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowDetails(!showDetails)}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* ✅ 等待游戏初始化 */}
        {!gameLogic.gameInitialized ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">正在初始化回放...</p>
            </div>
          </div>
        ) : (
          <>
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
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(totalDuration)}</span>
                </div>
                <div className="relative">
                  <Slider
                    value={[currentTime]}
                    max={totalDuration}
                    step={16}
                    onValueChange={(value) => handleSeek(value[0])}
                    className="w-full"
                  />
                  {/* ✅ 关键时刻标记 */}
                  <div className="absolute top-0 left-0 right-0 h-2 pointer-events-none">
                    {keyMoments.map((moment, idx) => {
                      const position = (moment.timestamp / totalDuration) * 100;
                      const Icon = moment.type === 'tetris' ? Zap : 
                                   moment.type === 'tspin' ? Target : 
                                   moment.type === 'combo' ? Flame : null;
                      return (
                        <div
                          key={idx}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                          style={{ left: `${position}%` }}
                          title={moment.label}
                        >
                          {Icon && <Icon className="w-3 h-3 text-primary" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(totalDuration)}</span>
                </div>
              </div>
              
              {/* 播放按钮 */}
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="icon" onClick={handleReset} title="重置 (Home)">
                  <RotateCcw className="w-4 h-4" />
                </Button>
                
                {/* 快退10秒 */}
                <Button variant="outline" size="icon" onClick={() => handleSkipBackward(10)} title="后退10秒">
                  <Rewind className="w-4 h-4" />
                </Button>
                
                {/* 上一个关键时刻 */}
                <Button variant="outline" size="icon" onClick={jumpToPreviousMoment} title="上一个关键时刻 (P)">
                  <SkipBack className="w-4 h-4" />
                </Button>
                
                {/* 播放/暂停 */}
                <Button size="lg" onClick={handlePlayPause} title="播放/暂停 (Space)">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                
                {/* 下一个关键时刻 */}
                <Button variant="outline" size="icon" onClick={jumpToNextMoment} title="下一个关键时刻 (N)">
                  <SkipForward className="w-4 h-4" />
                </Button>
                
                {/* 快进10秒 */}
                <Button variant="outline" size="icon" onClick={() => handleSkipForward(10)} title="前进10秒">
                  <FastForward className="w-4 h-4" />
                </Button>
              </div>
              
              {/* 速度控制 - 增强显示 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">播放速度:</span>
                  <span className="text-sm font-medium">{playbackSpeed}x</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[0.25, 0.5, 1, 2, 4].map(speed => (
                    <Button
                      key={speed}
                      variant={playbackSpeed === speed ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSpeedChange(speed)}
                      className="w-full"
                    >
                      {speed < 1 ? '🐌' : speed > 1 ? '⚡' : ''} {speed}x
                    </Button>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  使用 [ 和 ] 键调整速度
                </div>
              </div>
              
              {/* 快捷键说明 */}
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground flex items-center gap-2">
                  <Info className="w-3 h-3" />
                  键盘快捷键
                </summary>
                <div className="mt-2 space-y-1 pl-5">
                  <div>• <kbd className="px-1.5 py-0.5 bg-muted rounded">空格</kbd> - 播放/暂停</div>
                  <div>• <kbd className="px-1.5 py-0.5 bg-muted rounded">←</kbd> / <kbd className="px-1.5 py-0.5 bg-muted rounded">→</kbd> - 后退/前进 5秒</div>
                  <div>• <kbd className="px-1.5 py-0.5 bg-muted rounded">P</kbd> / <kbd className="px-1.5 py-0.5 bg-muted rounded">N</kbd> - 上一个/下一个关键时刻</div>
                  <div>• <kbd className="px-1.5 py-0.5 bg-muted rounded">[</kbd> / <kbd className="px-1.5 py-0.5 bg-muted rounded">]</kbd> - 减速/加速</div>
                  <div>• <kbd className="px-1.5 py-0.5 bg-muted rounded">Home</kbd> / <kbd className="px-1.5 py-0.5 bg-muted rounded">End</kbd> - 跳转到开始/结束</div>
                </div>
              </details>
            </Card>
          </div>
          
          {/* 右侧：Next / 关键时刻 / 诊断 */}
          <div className="lg:w-64 flex-shrink-0">
            <Tabs defaultValue="next" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="next">Next</TabsTrigger>
                <TabsTrigger value="moments">关键</TabsTrigger>
                <TabsTrigger value="diagnostics">诊断</TabsTrigger>
              </TabsList>
              
              <TabsContent value="next" className="mt-2">
                <NextPiecePreview 
                  nextPieces={gameLogic.nextPieces}
                  compact={false}
                />
              </TabsContent>
              
              <TabsContent value="moments" className="mt-2 space-y-2">
                <div className="text-sm font-medium mb-2">关键时刻</div>
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {keyMoments.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      暂无关键时刻
                    </div>
                  ) : (
                    keyMoments.map((moment, idx) => {
                      const Icon = moment.type === 'tetris' ? Zap : 
                                   moment.type === 'tspin' ? Target : 
                                   moment.type === 'combo' ? Flame : null;
                      const isActive = Math.abs(currentTime - moment.timestamp) < 500;
                      
                      return (
                        <Button
                          key={idx}
                          variant={isActive ? 'default' : 'outline'}
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={() => handleSeek(moment.timestamp)}
                        >
                          {Icon && <Icon className="w-3 h-3" />}
                          <span className="flex-1 text-left truncate">{moment.label}</span>
                          <span className="text-xs opacity-70">{formatTime(moment.timestamp)}</span>
                        </Button>
                      );
                    })
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="diagnostics" className="mt-2">
                {/* Piece Sequence Validation */}
                <div className="mb-4">
                  <ReplaySequenceValidator
                    recordedSequence={preGeneratedPieces}
                    playedSequence={spawnedPieces}
                  />
                </div>
                
                {/* Consistency Dashboard */}
                <ReplayConsistencyDashboard
                  enabled={diagnostics.enabled}
                  isRecording={diagnostics.isRecording}
                  recordedCount={diagnostics.recordedSnapshots.length}
                  replayedCount={diagnostics.replayedSnapshots.length}
                  differences={diagnostics.differences}
                  currentTime={currentTime}
                  totalDuration={totalDuration}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        {/* 技术细节（可选显示） */}
        {showDetails && (
          <Card className="m-4 p-4 bg-muted/50 text-xs space-y-2">
            <Tabs defaultValue="technical" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="technical">技术信息</TabsTrigger>
                <TabsTrigger value="stats">统计数据</TabsTrigger>
              </TabsList>
              
              <TabsContent value="technical" className="space-y-2">
                <div className="font-semibold">技术信息</div>
                <div className="space-y-1 text-muted-foreground">
                  <div>Seed: {metadata.seed.slice(0, 16)}...</div>
                  <div>总时长: {formatTime(replay.stats.duration)}</div>
                  <div>输入事件: {inputEvents.length}</div>
                  <div>锁定事件: {lockEvents.length}</div>
                  <div>关键帧: {keyframes.length}</div>
                  <div>关键时刻: {keyMoments.length}</div>
                  <div>已执行输入: {executedIndexRef.current}</div>
                  <div>最后校正: {lastKFTimeRef.current > 0 ? formatTime(lastKFTimeRef.current) : '未校正'}</div>
                  <div>DAS: {metadata.settings.das}ms</div>
                  <div>ARR: {metadata.settings.arr}ms</div>
                  <div>SDF: {metadata.settings.sdf}ms</div>
                </div>
              </TabsContent>
              
              <TabsContent value="stats" className="space-y-2">
                <div className="font-semibold">游戏统计</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-background rounded">
                    <div className="text-muted-foreground">总Locks</div>
                    <div className="text-lg font-bold">{replayStats.totalLocks}</div>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <div className="text-muted-foreground">PPS</div>
                    <div className="text-lg font-bold">{replayStats.pps}</div>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <div className="text-muted-foreground">Tetris</div>
                    <div className="text-lg font-bold">{replayStats.tetrisCount}</div>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <div className="text-muted-foreground">T-Spin</div>
                    <div className="text-lg font-bold">{replayStats.tspinCount}</div>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <div className="text-muted-foreground">最大Combo</div>
                    <div className="text-lg font-bold">{replayStats.maxCombo}</div>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <div className="text-muted-foreground">总行数</div>
                    <div className="text-lg font-bold">{replayStats.totalLines}</div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReplayPlayerV4Unified;
