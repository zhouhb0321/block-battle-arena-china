import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Play, Pause, RotateCcw, SkipForward, SkipBack, FastForward, Rewind, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { V4ReplayData } from '@/utils/replayV4/types';
import { extractInputEvents, extractReplayMetadata, extractLockEvents, extractKeyframeEvents } from '@/utils/replayV4/converter';
import { extractKeyMoments } from '@/utils/replayV4/eventExtractor';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useGameRecording } from '@/contexts/GameRecordingContext';
import { useMusicContext } from '@/contexts/MusicContext';
import UnifiedGameWindow from '@/components/game/UnifiedGameWindow';
import BackgroundWallpaper from '@/components/BackgroundWallpaper';
import type { GameMode } from '@/utils/gameTypes';

interface SimpleReplayPlayerProps {
  replay: V4ReplayData;
  onClose: () => void;
  autoPlay?: boolean;
}

export const SimpleReplayPlayer: React.FC<SimpleReplayPlayerProps> = ({
  replay,
  onClose,
  autoPlay = false
}) => {
  // ✅ 数据验证 - 防止崩溃
  if (!replay || !replay.events || !replay.stats || !replay.metadata) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">回放数据无效</h3>
          <p className="text-muted-foreground mb-6">
            无法加载此回放，数据可能已损坏或格式不兼容
          </p>
          <Button onClick={onClose} variant="default">
            返回
          </Button>
        </Card>
      </div>
    );
  }
  const gameRecording = useGameRecording();
  const { requestPlayback, releasePlayback } = useMusicContext();
  
  // 提取回放数据
  const inputEvents = useMemo(() => extractInputEvents(replay), [replay]);
  const lockEvents = useMemo(() => extractLockEvents(replay), [replay]);
  const keyframes = useMemo(() => extractKeyframeEvents(replay), [replay]);
  const metadata = useMemo(() => extractReplayMetadata(replay), [replay]);
  const keyMoments = useMemo(() => extractKeyMoments(replay), [replay]);
  
  // 清理并准备方块序列
  const preGeneratedPieces = useMemo(() => {
    const pieceSequence = metadata?.initialPieceSequence || [];
    const validTypes = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    const sanitized = pieceSequence
      .map((t: any) => {
        if (typeof t === 'string') {
          const cleaned = t.trim().charAt(0).toUpperCase();
          return validTypes.includes(cleaned) ? cleaned : null;
        }
        return null;
      })
      .filter(Boolean) as string[];
    
    return sanitized;
  }, [metadata]);
  
  // 回放状态
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // 执行索引追踪
  const executedIndexRef = useRef(0);
  const lastFrameTimeRef = useRef<number | null>(null);
  const lastKFTimeRef = useRef<number>(0);
  
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
  
  // 构建 GameMode
  const gameMode = useMemo<GameMode>(() => ({
    id: metadata.gameMode,
    displayName: metadata.gameMode,
    description: '',
    isTimeAttack: false
  }), [metadata.gameMode]);
  
  // 游戏逻辑
  const gameLogic = useGameLogic({
    gameMode,
    isReplay: true,
    replaySeed: metadata.seed,
    preGeneratedPieceTypes: preGeneratedPieces,
    enableReplayGravity: true,
    replayClockControlled: true,
  });
  
  // 初始化游戏
  useEffect(() => {
    if (!gameLogic.gameStarted) {
      gameLogic.startGame();
    }
  }, [gameLogic]);
  
  // 事件处理
  const processEventsToTime = useCallback((targetTime: number) => {
    if (!Array.isArray(inputEvents) || !Array.isArray(keyframes)) return;
    
    // KEYFRAME 校正
    const nextKF = keyframes.find(kf => 
      kf && kf.timestamp > lastKFTimeRef.current && 
      kf.timestamp <= targetTime
    );
    
    if (nextKF && gameLogic?.forceSetGameState && Array.isArray(nextKF.board)) {
      gameLogic.forceSetGameState({
        board: nextKF.board,
        score: nextKF.score || 0,
        lines: nextKF.lines || 0,
        level: nextKF.level || 1,
        nextPieces: Array.isArray(nextKF.nextPieces) ? nextKF.nextPieces : [],
        holdPiece: nextKF.holdPiece || null
      });
      
      lastKFTimeRef.current = nextKF.timestamp;
      
      while (executedIndexRef.current < inputEvents.length && 
             inputEvents[executedIndexRef.current].timestamp <= nextKF.timestamp) {
        executedIndexRef.current++;
      }
    }
    
    // 执行 INPUT 事件
    while (executedIndexRef.current < inputEvents.length) {
      const event = inputEvents[executedIndexRef.current];
      
      if (!event || typeof event.timestamp !== 'number') {
        executedIndexRef.current++;
        continue;
      }
      
      if (event.timestamp > targetTime) break;
      
      if (event.success && gameLogic?.movePiece) {
        try {
          switch (event.action) {
            case 'moveLeft': gameLogic.movePiece(-1, 0); break;
            case 'moveRight': gameLogic.movePiece(1, 0); break;
            case 'softDrop': gameLogic.movePiece(0, 1); break;
            case 'hardDrop': gameLogic.hardDrop(); break;
            case 'rotateClockwise': gameLogic.rotatePieceClockwise(); break;
            case 'rotateCounterclockwise': gameLogic.rotatePieceCounterclockwise(); break;
            case 'rotate180': gameLogic.rotatePiece180(); break;
            case 'hold': gameLogic.holdCurrentPiece(); break;
          }
        } catch (error) {
          console.error('[Replay] Error:', error);
        }
      }
      
      executedIndexRef.current++;
    }
  }, [inputEvents, keyframes, gameLogic]);
  
  // 播放循环
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
      
      if (gameLogic?.updateReplayTime) {
        gameLogic.updateReplayTime(deltaMs);
      }
      
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
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, playbackSpeed, currentTime, inputEvents.length, processEventsToTime, gameLogic]);
  
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
    gameLogic.startGame();
  }, [gameLogic]);
  
  const handleSeek = useCallback((newTime: number) => {
    if (newTime < currentTime) {
      executedIndexRef.current = 0;
      lastKFTimeRef.current = 0;
      gameLogic.startGame();
      setCurrentTime(newTime);
      processEventsToTime(newTime);
    } else {
      setCurrentTime(newTime);
      processEventsToTime(newTime);
    }
    lastFrameTimeRef.current = null;
  }, [currentTime, gameLogic, processEventsToTime]);
  
  const handleSkipForward = useCallback((seconds: number) => {
    const newTime = Math.min(currentTime + seconds * 1000, replay.stats.duration);
    handleSeek(newTime);
  }, [currentTime, replay.stats.duration, handleSeek]);
  
  const handleSkipBackward = useCallback((seconds: number) => {
    const newTime = Math.max(currentTime - seconds * 1000, 0);
    handleSeek(newTime);
  }, [currentTime, handleSeek]);
  
  const jumpToNextMoment = useCallback(() => {
    const nextMoment = keyMoments.find(m => m.timestamp > currentTime);
    if (nextMoment) handleSeek(nextMoment.timestamp);
  }, [keyMoments, currentTime, handleSeek]);
  
  const jumpToPreviousMoment = useCallback(() => {
    const previousMoments = keyMoments.filter(m => m.timestamp < currentTime);
    if (previousMoments.length > 0) {
      handleSeek(previousMoments[previousMoments.length - 1].timestamp);
    }
  }, [keyMoments, currentTime, handleSeek]);
  
  // 键盘快捷键
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key) {
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
        case 'n':
          jumpToNextMoment();
          break;
        case 'p':
          jumpToPreviousMoment();
          break;
        case 'Home':
          e.preventDefault();
          handleReset();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlePlayPause, handleSkipForward, handleSkipBackward, jumpToNextMoment, jumpToPreviousMoment, handleReset]);
  
  // 格式化时间
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const totalDuration = replay.stats.duration;
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BackgroundWallpaper>
        {/* 顶部标题栏 */}
        <div className="bg-background/80 backdrop-blur-sm border-b border-border p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4 mr-2" />
                关闭
              </Button>
              <div>
                <h2 className="text-xl font-bold">{metadata.username || 'Player'} 的回放</h2>
                <p className="text-sm text-muted-foreground">
                  {metadata.gameMode} - {formatTime(totalDuration)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">得分: {replay.stats.finalScore.toLocaleString()}</Badge>
              <Badge variant="outline">行数: {replay.stats.finalLines}</Badge>
              <Badge variant="outline">PPS: {replay.stats.pps.toFixed(2)}</Badge>
            </div>
          </div>
        </div>

        {/* 游戏窗口 */}
        <div className="flex justify-center items-center p-8">
          <UnifiedGameWindow
            board={gameLogic.board}
            currentPiece={gameLogic.currentPiece}
            ghostPiece={gameLogic.ghostPiece}
            nextPieces={gameLogic.nextPieces}
            holdPiece={gameLogic.holdPiece}
            canHold={gameLogic.canHold}
            score={gameLogic.score}
            lines={gameLogic.lines}
            level={gameLogic.level}
            pps={gameLogic.pps}
            apm={gameLogic.apm}
            time={gameLogic.time}
            username={metadata.username}
            mode="replay"
            enableGhost={true}
          />
        </div>

        {/* 播放控制条 */}
        <Card className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border rounded-none">
          <div className="p-4 space-y-3">
            {/* 进度条 */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-mono w-16 text-right">{formatTime(currentTime)}</span>
              <Slider
                value={[progress]}
                onValueChange={([value]) => {
                  const newTime = (value / 100) * totalDuration;
                  handleSeek(newTime);
                }}
                max={100}
                step={0.1}
                className="flex-1"
              />
              <span className="text-sm font-mono w-16">{formatTime(totalDuration)}</span>
            </div>

            {/* 控制按钮 */}
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="w-4 h-4" />
              </Button>
              
              <Button variant="outline" size="sm" onClick={jumpToPreviousMoment} title="上一个关键时刻 (P)">
                <SkipBack className="w-4 h-4" />
              </Button>
              
              <Button variant="outline" size="sm" onClick={() => handleSkipBackward(5)} title="快退5秒 (←)">
                <Rewind className="w-4 h-4" />
              </Button>
              
              <Button variant="default" size="lg" onClick={handlePlayPause} className="px-8">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              
              <Button variant="outline" size="sm" onClick={() => handleSkipForward(5)} title="快进5秒 (→)">
                <FastForward className="w-4 h-4" />
              </Button>
              
              <Button variant="outline" size="sm" onClick={jumpToNextMoment} title="下一个关键时刻 (N)">
                <SkipForward className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm">速度:</span>
                {[0.5, 1, 2, 4].map(speed => (
                  <Button
                    key={speed}
                    variant={playbackSpeed === speed ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPlaybackSpeed(speed)}
                  >
                    {speed}x
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </BackgroundWallpaper>
    </div>
  );
};
