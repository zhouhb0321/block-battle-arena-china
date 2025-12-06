/**
 * 悬浮音乐控制面板
 * 支持全局滚轮调节音量、自动隐藏、上下曲切换
 * 游戏中保护模式：只显示音量和切歌，隐藏暂停按钮
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music, Shuffle, Repeat, Repeat1 } from 'lucide-react';
import { useMusicContext } from '@/contexts/MusicContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

type ControlState = 'hidden' | 'mini' | 'expanded';

interface FloatingMusicControlProps {
  isGameActive?: boolean;
  isGamePaused?: boolean;
}

export const FloatingMusicControl: React.FC<FloatingMusicControlProps> = ({
  isGameActive = false,
  isGamePaused = false
}) => {
  const { 
    isPlaying, 
    currentTrack, 
    volume, 
    muted,
    play, 
    pause, 
    setVolume,
    toggleMute,
    playNext,
    playPrevious,
    currentSource,
    playlist,
    shuffleMode,
    repeatMode,
    toggleShuffle,
    toggleRepeat
  } = useMusicContext();

  const [state, setState] = useState<ControlState>('mini');
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const volumeIndicatorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const controlRef = useRef<HTMLDivElement>(null);

  // 重置隐藏计时器
  const resetHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    setState('expanded');

    hideTimerRef.current = setTimeout(() => {
      if (!isHovering) {
        if (isGameActive && !isGamePaused) {
          setState('hidden');
        } else {
          setState('mini');
        }
      }
    }, 5000);
  }, [isHovering, isGameActive, isGamePaused]);

  // 显示音量指示器
  const showVolumeIndicatorTemp = useCallback(() => {
    setShowVolumeIndicator(true);
    
    if (volumeIndicatorTimerRef.current) {
      clearTimeout(volumeIndicatorTimerRef.current);
    }

    volumeIndicatorTimerRef.current = setTimeout(() => {
      setShowVolumeIndicator(false);
    }, 1000);
  }, []);

  // 处理滚轮音量调节
  const handleVolumeWheel = useCallback((deltaY: number) => {
    const delta = deltaY > 0 ? -5 : 5;
    const newVolume = Math.max(0, Math.min(100, volume + delta));
    
    setVolume(newVolume);
    showVolumeIndicatorTemp();
    resetHideTimer();
  }, [volume, setVolume, showVolumeIndicatorTemp, resetHideTimer]);

  // 控件内滚轮事件
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleVolumeWheel(e.deltaY);
  }, [handleVolumeWheel]);

  // 监听控件滚轮事件
  useEffect(() => {
    const control = controlRef.current;
    if (!control) return;

    control.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      control.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // ✅ 全局滚轮音量控制 - 游戏进行中时在任意位置都可以调节音量
  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      // 只在游戏活动且有音乐时响应全局滚轮
      if (!isGameActive || !currentSource) return;
      
      // 检查是否在某些需要滚轮的元素上（如滚动区域）
      const target = e.target as HTMLElement;
      if (target.closest('.scroll-area') || target.closest('[data-no-music-wheel]')) {
        return;
      }
      
      // 调节音量
      handleVolumeWheel(e.deltaY);
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleGlobalWheel);
    };
  }, [isGameActive, currentSource, handleVolumeWheel]);

  // 游戏状态变化时自动调整显示状态
  useEffect(() => {
    if (isGameActive && !isGamePaused && !isHovering) {
      setState('hidden');
    } else if (isGamePaused || !isGameActive) {
      setState('mini');
    }
  }, [isGameActive, isGamePaused, isHovering]);

  // 清理计时器
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      if (volumeIndicatorTimerRef.current) {
        clearTimeout(volumeIndicatorTimerRef.current);
      }
    };
  }, []);

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
    resetHideTimer();
  };

  const handlePrevious = () => {
    playPrevious();
    resetHideTimer();
  };

  const handleNext = () => {
    playNext();
    resetHideTimer();
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    showVolumeIndicatorTemp();
    resetHideTimer();
  };

  const handleMuteToggle = () => {
    toggleMute();
    resetHideTimer();
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
    setState('expanded');
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    resetHideTimer();
  };
  
  const handleShuffleToggle = () => {
    toggleShuffle();
    resetHideTimer();
  };
  
  const handleRepeatToggle = () => {
    toggleRepeat();
    resetHideTimer();
  };
  
  // 获取循环模式图标
  const getRepeatIcon = () => {
    if (repeatMode === 'one') return <Repeat1 className="w-4 h-4" />;
    return <Repeat className="w-4 h-4" />;
  };
  
  // 获取循环模式提示
  const getRepeatLabel = () => {
    if (repeatMode === 'none') return '不循环';
    if (repeatMode === 'all') return '列表循环';
    return '单曲循环';
  };

  // 如果没有音乐播放源，不显示
  if (!currentSource && !currentTrack) {
    return null;
  }

  // 是否处于游戏保护模式（游戏进行中不能暂停音乐）
  const isGameProtected = isGameActive && !isGamePaused;

  return (
    <div
      ref={controlRef}
      className={cn(
        "fixed bottom-6 right-6 z-[1000] transition-all duration-300 ease-out",
        state === 'hidden' && "opacity-0 pointer-events-none scale-95",
        state === 'mini' && "opacity-100",
        state === 'expanded' && "opacity-100"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 音量指示器 */}
      {showVolumeIndicator && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/90 text-white px-4 py-2 rounded-lg text-lg font-bold animate-fade-in whitespace-nowrap z-10">
          {muted ? '🔇 静音' : `🔊 ${Math.round(volume)}%`}
        </div>
      )}

      {/* Mini 状态 - 圆形按钮 */}
      {state === 'mini' && (
        <button
          onClick={handlePlayPause}
          className="w-14 h-14 rounded-full bg-black/80 backdrop-blur-md border border-primary/30 hover:border-primary/60 flex items-center justify-center transition-all hover:scale-110 hover:shadow-lg hover:shadow-primary/20"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-primary" />
          ) : (
            <Play className="w-6 h-6 text-primary ml-1" />
          )}
        </button>
      )}

      {/* Expanded 状态 - 游戏保护模式（只显示音量和切歌） */}
      {state === 'expanded' && isGameProtected && (
        <div className="w-72 bg-black/90 backdrop-blur-md rounded-2xl border border-primary/20 p-3 shadow-2xl shadow-primary/10">
          {/* 曲目信息 - 简化 */}
          <div className="flex items-center gap-2 mb-3">
            <Music className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="text-sm text-white truncate flex-1">
              {currentTrack?.title || '背景音乐'}
            </div>
            <div className="text-xs text-green-400">
              ▶ 播放中
            </div>
          </div>

          {/* 切歌按钮 */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              className="text-gray-300 hover:text-white hover:bg-white/10"
              aria-label="Previous"
              disabled={playlist.length <= 1}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            
            <span className="text-xs text-gray-400 px-2">
              切歌
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              className="text-gray-300 hover:text-white hover:bg-white/10"
              aria-label="Next"
              disabled={playlist.length <= 1}
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* 音量控制 */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMuteToggle}
              className="text-gray-300 hover:text-white hover:bg-white/10 flex-shrink-0 w-8 h-8"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>

            <div className="flex-1">
              <Slider
                value={[muted ? 0 : volume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="cursor-pointer"
              />
            </div>

            <div className="text-xs text-gray-400 w-8 text-right">
              {muted ? '0%' : `${Math.round(volume)}%`}
            </div>
          </div>

          {/* 提示文本 */}
          <div className="mt-2 text-xs text-gray-500 text-center">
            🎮 游戏中 • 滚轮调音量 • 暂停后可控制播放
          </div>
        </div>
      )}

      {/* Expanded 状态 - 完整控制面板（非游戏中或暂停时） */}
      {state === 'expanded' && !isGameProtected && (
        <div className="w-80 bg-black/90 backdrop-blur-md rounded-2xl border border-primary/20 p-4 shadow-2xl shadow-primary/10">
          {/* 曲目信息 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Music className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {currentTrack?.title || '游戏背景音乐'}
              </div>
              <div className="text-xs text-gray-400">
                {isPlaying ? '正在播放' : '已暂停'} • {playlist.length} 首歌曲
              </div>
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-center gap-3 mb-4">
            {/* 🆕 随机按钮 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShuffleToggle}
              className={cn(
                "text-gray-300 hover:text-white hover:bg-white/10",
                shuffleMode && "text-primary"
              )}
              aria-label={shuffleMode ? 'Disable shuffle' : 'Enable shuffle'}
              title={shuffleMode ? '随机播放: 开' : '随机播放: 关'}
            >
              <Shuffle className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              className="text-gray-300 hover:text-white hover:bg-white/10"
              aria-label="Previous"
              disabled={playlist.length <= 1}
            >
              <SkipBack className="w-5 h-5" />
            </Button>

            <Button
              variant="default"
              size="icon"
              onClick={handlePlayPause}
              className="w-12 h-12 rounded-full bg-primary hover:bg-primary/80"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="text-gray-300 hover:text-white hover:bg-white/10"
              aria-label="Next"
              disabled={playlist.length <= 1}
            >
              <SkipForward className="w-5 h-5" />
            </Button>
            
            {/* 🆕 循环按钮 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRepeatToggle}
              className={cn(
                "text-gray-300 hover:text-white hover:bg-white/10",
                repeatMode !== 'none' && "text-primary"
              )}
              aria-label={getRepeatLabel()}
              title={getRepeatLabel()}
            >
              {getRepeatIcon()}
            </Button>
          </div>

          {/* 音量控制 */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMuteToggle}
              className="text-gray-300 hover:text-white hover:bg-white/10 flex-shrink-0"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </Button>

            <div className="flex-1">
              <Slider
                value={[muted ? 0 : volume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="cursor-pointer"
              />
            </div>

            <div className="text-xs text-gray-400 w-10 text-right">
              {muted ? '0%' : `${Math.round(volume)}%`}
            </div>
          </div>

          {/* 提示文本 */}
          <div className="mt-3 text-xs text-gray-500 text-center">
            {shuffleMode ? '🔀 随机' : '📋 顺序'} • {getRepeatLabel()} • 滚轮调音量
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingMusicControl;
