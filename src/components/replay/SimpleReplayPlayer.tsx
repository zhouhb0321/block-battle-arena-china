import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Play, Pause, RotateCcw, SkipForward, SkipBack, FastForward, Rewind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { V4ReplayData, V4KeyframeEvent, V4LockEvent, V4FrameEvent } from '@/utils/replayV4/types';
import { extractInputEvents, extractReplayMetadata, extractKeyframeEvents, extractSpawnEvents, extractLockEvents, extractFrameEvents } from '@/utils/replayV4/converter';
import { extractKeyMoments } from '@/utils/replayV4/eventExtractor';
import { useGameRecording } from '@/contexts/GameRecordingContext';
import { useMusicContext } from '@/contexts/MusicContext';
import ReplayGameBoard from './ReplayGameBoard';
import BackgroundWallpaper from '@/components/BackgroundWallpaper';
import { TETROMINO_TYPES, TETROMINO_TYPE_IDS } from '@/utils/pieceGeneration';
import { placePiece, clearLines } from '@/utils/tetrisCore';
import type { GamePiece } from '@/utils/gameTypes';

interface SimpleReplayPlayerProps {
  replay: V4ReplayData;
  onClose: () => void;
  autoPlay?: boolean;
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

// 计算消行分数
const calculateLineScore = (linesCleared: number, level: number, isTSpin: boolean, isMini: boolean): number => {
  const baseScores = [0, 100, 300, 500, 800];
  let score = baseScores[linesCleared] || 0;
  
  if (isTSpin) {
    score = isMini ? score * 1.5 : score * 2;
  }
  
  return score * level;
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
  const lockEvents = useMemo(() => extractLockEvents(replay), [replay]);
  const frameEvents = useMemo(() => extractFrameEvents(replay), [replay]);  // ✅ 方案B：帧级采样事件
  const metadata = useMemo(() => extractReplayMetadata(replay), [replay]);
  const keyMoments = useMemo(() => extractKeyMoments(replay), [replay]);
  
  // 帧事件是否可用
  const hasFrameData = useMemo(() => frameEvents.length > 10, [frameEvents]);
  
  // 回放状态
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [replayEnded, setReplayEnded] = useState(false);
  
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
  const lastLockIndexRef = useRef(0);
  const lastFrameIndexRef = useRef(0);  // ✅ 方案B：帧级采样索引
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSpawnTimeRef = useRef<number>(0);
  const boardRef = useRef<number[][]>(Array(23).fill(null).map(() => Array(10).fill(0)));
  
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
  
  // 清理自动关闭定时器
  useEffect(() => {
    return () => {
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current);
      }
    };
  }, []);
  
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
  
  // 应用 KEYFRAME 状态 - ✅ 增强棋盘数据验证
  const applyKeyframe = useCallback((kf: V4KeyframeEvent) => {
    if (!kf) return;
    
    // ✅ 安全解析棋盘数据
    let newBoard: number[][];
    
    if (Array.isArray(kf.board) && kf.board.length > 0) {
      newBoard = kf.board.map((row, idx) => {
        if (!row || !Array.isArray(row)) {
          console.warn(`[Replay] KF board row ${idx} invalid, using empty row`);
          return Array(10).fill(0);
        }
        // 确保每行恰好 10 个元素
        const fixedRow = [...row];
        while (fixedRow.length < 10) fixedRow.push(0);
        return fixedRow.slice(0, 10);
      });
      
      // 确保 23 行
      while (newBoard.length < 23) {
        newBoard.unshift(Array(10).fill(0));
      }
      newBoard = newBoard.slice(0, 23);
    } else {
      console.warn('[Replay] KF board is invalid, using empty board');
      newBoard = Array(23).fill(null).map(() => Array(10).fill(0));
    }
    
    setBoard(newBoard);
    boardRef.current = newBoard;
    setScore(kf.score || 0);
    setLines(kf.lines || 0);
    setLevel(kf.level || 1);
    
    // 设置 NEXT 队列
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
  
  // 处理 LOCK 事件 - 核心修复
  const processLockEvent = useCallback((lock: V4LockEvent) => {
    // 1. 创建锁定位置的方块
    const lockedPiece = createPieceFromType(lock.pieceType);
    if (!lockedPiece) return;
    
    lockedPiece.x = lock.x;
    lockedPiece.y = lock.y;
    lockedPiece.rotation = lock.rotation;
    
    // 2. 将方块放置到棋盘上
    let newBoard = placePiece(boardRef.current, lockedPiece);
    
    // 3. 消除完成的行
    if (lock.linesCleared > 0) {
      const result = clearLines(newBoard);
      newBoard = result.newBoard;
      setLines(prev => prev + lock.linesCleared);
      setScore(prev => prev + calculateLineScore(lock.linesCleared, level, lock.isTSpin, lock.isMini));
    }
    
    // 4. 更新棋盘状态
    setBoard(newBoard);
    boardRef.current = newBoard;
    
    // 5. 清除当前方块（已锁定）
    setCurrentPiece(null);
    setGhostPiece(null);
    
    // 6. 更新 NEXT 队列 - 移除第一个方块
    setNextPieces(prev => prev.slice(1));
  }, [level]);
  
  // 计算重力下落位置 - 实现自然下落动画
  const calculateGravityY = useCallback((spawnTime: number, spawnY: number, currentTimeMs: number): number => {
    const sdf = replay.metadata?.settings?.sdf || 40;
    const elapsedMs = currentTimeMs - spawnTime;
    // 使用 SDF 计算下落的格子数（SDF 单位是 cells/second）
    const cellsDropped = Math.floor((elapsedMs / 1000) * (sdf / 20)); // 降低重力速度
    return Math.min(spawnY + cellsDropped, 19);
  }, [replay.metadata?.settings?.sdf]);
  
  // 核心：处理事件到指定时间
  const processEventsToTime = useCallback((targetTime: number) => {
    if (!Array.isArray(keyframes)) return;
    
    // 1. 查找并应用最近的 KEYFRAME
    const nearestKF = findNearestKeyframe(targetTime);
    
    if (nearestKF && (!lastAppliedKFRef.current || 
        nearestKF.timestamp > lastAppliedKFRef.current.timestamp)) {
      applyKeyframe(nearestKF);
      
      // 同步所有事件索引到 KEYFRAME 之后
      while (lastInputIndexRef.current < inputEvents.length &&
             inputEvents[lastInputIndexRef.current].timestamp <= nearestKF.timestamp) {
        lastInputIndexRef.current++;
      }
      while (lastSpawnIndexRef.current < spawnEvents.length &&
             spawnEvents[lastSpawnIndexRef.current].timestamp <= nearestKF.timestamp) {
        lastSpawnIndexRef.current++;
      }
      while (lastLockIndexRef.current < lockEvents.length &&
             lockEvents[lastLockIndexRef.current].timestamp <= nearestKF.timestamp) {
        lastLockIndexRef.current++;
      }
      // ✅ 方案B：同步帧索引
      while (lastFrameIndexRef.current < frameEvents.length &&
             frameEvents[lastFrameIndexRef.current].timestamp <= nearestKF.timestamp) {
        lastFrameIndexRef.current++;
      }
    }
    
    // 2. 处理 LOCK 事件（逐个方块锁定更新棋盘）
    while (lastLockIndexRef.current < lockEvents.length) {
      const lock = lockEvents[lastLockIndexRef.current];
      if (!lock || lock.timestamp > targetTime) break;
      
      processLockEvent(lock);
      lastLockIndexRef.current++;
    }
    
    // 3. 处理 SPAWN 事件记录 spawn 时间
    while (lastSpawnIndexRef.current < spawnEvents.length) {
      const spawn = spawnEvents[lastSpawnIndexRef.current];
      if (!spawn || spawn.timestamp > targetTime) break;
      
      currentSpawnTimeRef.current = spawn.timestamp;
      lastSpawnIndexRef.current++;
    }
    
    // ✅ 方案B：优先使用帧级采样数据（关键修复：直接从 FRAME 创建方块）
    if (hasFrameData) {
      // 查找当前时间最接近的帧
      let prevFrame: typeof frameEvents[0] | null = null;
      let nextFrame: typeof frameEvents[0] | null = null;
      
      // 向前搜索到当前时间点
      for (let i = 0; i < frameEvents.length; i++) {
        const frame = frameEvents[i];
        if (frame.timestamp <= targetTime) {
          prevFrame = frame;
          lastFrameIndexRef.current = i;
        } else {
          nextFrame = frame;
          break;
        }
      }
      
      if (prevFrame) {
        let interpolatedX = prevFrame.x;
        let interpolatedY = prevFrame.y;
        let interpolatedRotation = prevFrame.rotation;
        let displayPieceType = prevFrame.pieceType;
        
        // 线性插值到下一帧
        if (nextFrame && nextFrame.timestamp > prevFrame.timestamp) {
          const t = (targetTime - prevFrame.timestamp) / (nextFrame.timestamp - prevFrame.timestamp);
          interpolatedX = prevFrame.x + (nextFrame.x - prevFrame.x) * t;
          interpolatedY = prevFrame.y + (nextFrame.y - prevFrame.y) * t;
          // 旋转不插值，使用离散值
          if (t > 0.5) {
            interpolatedRotation = nextFrame.rotation;
            displayPieceType = nextFrame.pieceType;
          }
        }
        
        // ✅ 关键修复：直接从 FRAME 事件创建方块（不依赖 SPAWN/currentPiece）
        const tetrominoType = TETROMINO_TYPES[displayPieceType];
        if (tetrominoType) {
          const framePiece: GamePiece = {
            type: tetrominoType,
            x: Math.round(interpolatedX),  // 位置取整
            y: interpolatedY,               // Y可以保持小数实现平滑下落
            rotation: interpolatedRotation
          };
          
          setCurrentPiece(framePiece);
          setGhostPiece(calculateGhostPiece({
            ...framePiece,
            y: Math.floor(framePiece.y)  // Ghost 计算时用整数
          }, boardRef.current));
        }
        return; // 使用帧数据时跳过后续处理
      }
    }
    
    // 4. 无帧数据时回退到 INPUT + SPAWN 事件处理
    // 首先检查是否有待处理的 SPAWN 事件来设置当前方块
    const lastSpawn = spawnEvents
      .filter(s => s.timestamp <= targetTime)
      .slice(-1)[0];
    
    if (lastSpawn) {
      // 检查这个 SPAWN 对应的 LOCK 是否已经发生
      const correspondingLock = lockEvents.find(l => 
        l.timestamp > lastSpawn.timestamp && 
        l.pieceType === lastSpawn.pieceType
      );
      
      const isLocked = correspondingLock && correspondingLock.timestamp <= targetTime;
      
      if (!isLocked) {
        // 方块还未锁定，显示它
        const newPiece = createPieceFromType(lastSpawn.pieceType);
        if (newPiece) {
          // 查找这个方块的最新位置（从 INPUT 事件）
          let latestPosition = { x: lastSpawn.x, y: lastSpawn.y, rotation: 0 };
          
          for (const input of inputEvents) {
            if (input.timestamp > lastSpawn.timestamp && 
                input.timestamp <= targetTime && 
                input.success && input.position) {
              latestPosition = {
                x: input.position.x,
                y: input.position.y,
                rotation: input.rotation ?? latestPosition.rotation
              };
            }
          }
          
          // 如果没有 INPUT 位置数据，应用重力
          if (latestPosition.x === lastSpawn.x && latestPosition.y === lastSpawn.y) {
            const gravityY = calculateGravityY(lastSpawn.timestamp, lastSpawn.y, targetTime);
            latestPosition.y = gravityY;
          }
          
          newPiece.x = latestPosition.x;
          newPiece.y = latestPosition.y;
          newPiece.rotation = latestPosition.rotation;
          
          setCurrentPiece(newPiece);
          setGhostPiece(calculateGhostPiece(newPiece, boardRef.current));
        }
      } else {
        // 方块已锁定，清除显示
        setCurrentPiece(null);
        setGhostPiece(null);
      }
    }
  }, [keyframes, inputEvents, spawnEvents, lockEvents, frameEvents, hasFrameData, findNearestKeyframe, applyKeyframe, processLockEvent, calculateGhostPiece, calculateGravityY]);
  
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
        setReplayEnded(true);
        
        // 2秒后自动返回播放库
        autoCloseTimeoutRef.current = setTimeout(() => {
          onClose();
        }, 2000);
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
  }, [isPlaying, playbackSpeed, currentTime, replay.stats.duration, processEventsToTime, onClose]);
  
  // 控制函数
  const handlePlayPause = useCallback(() => {
    // 取消自动关闭
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }
    setReplayEnded(false);
    setIsPlaying(prev => !prev);
    resetControlsTimeout();
  }, [resetControlsTimeout]);
  
  const handleReset = useCallback(() => {
    // 取消自动关闭
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }
    setReplayEnded(false);
    
    setCurrentTime(0);
    setIsPlaying(false);
    lastFrameTimeRef.current = null;
    lastAppliedKFRef.current = null;
    lastInputIndexRef.current = 0;
    lastSpawnIndexRef.current = 0;
    lastLockIndexRef.current = 0;
    lastFrameIndexRef.current = 0;  // ✅ 方案B：重置帧索引
    currentSpawnTimeRef.current = 0;
    
    // 重置游戏状态
    const emptyBoard = Array(23).fill(null).map(() => Array(10).fill(0));
    setBoard(emptyBoard);
    boardRef.current = emptyBoard;
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
    // 取消自动关闭
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }
    setReplayEnded(false);
    
    // 回退时需要重置状态
    if (newTime < currentTime) {
      lastAppliedKFRef.current = null;
      lastInputIndexRef.current = 0;
      lastSpawnIndexRef.current = 0;
      lastLockIndexRef.current = 0;
      lastFrameIndexRef.current = 0;  // ✅ 方案B：重置帧索引
      currentSpawnTimeRef.current = 0;
      
      const emptyBoard = Array(23).fill(null).map(() => Array(10).fill(0));
      setBoard(emptyBoard);
      boardRef.current = emptyBoard;
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
        
        {/* 回放结束提示 */}
        {replayEnded && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-black/80 backdrop-blur-md rounded-lg px-8 py-6 text-center">
            <div className="text-white text-xl font-bold mb-2">回放结束</div>
            <div className="text-gray-400 text-sm">2秒后自动返回...</div>
          </div>
        )}

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
