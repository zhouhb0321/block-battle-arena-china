/**
 * 悬浮音乐控制面板
 * 支持自动隐藏、滚轮调节音量、上下曲切换
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music } from 'lucide-react';
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
    currentSource
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

  // 滚轮调节音量
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const delta = e.deltaY > 0 ? -5 : 5;
    const newVolume = Math.max(0, Math.min(100, volume + delta));
    
    setVolume(newVolume);
    showVolumeIndicatorTemp();
    resetHideTimer();
  }, [volume, setVolume, showVolumeIndicatorTemp, resetHideTimer]);

  // 监听滚轮事件
  useEffect(() => {
    const control = controlRef.current;
    if (!control) return;

    control.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      control.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

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

  // 如果没有音乐播放源，不显示
  if (!currentSource && !currentTrack) {
    return null;
  }

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
      {showVolumeIndicator && state === 'expanded' && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/90 text-white px-4 py-2 rounded-lg text-lg font-bold animate-fade-in whitespace-nowrap">
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

      {/* Expanded 状态 - 完整控制面板 */}
      {state === 'expanded' && (
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
                {isPlaying ? '正在播放' : '已暂停'}
              </div>
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              className="text-gray-300 hover:text-white hover:bg-white/10"
              aria-label="Previous"
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
            >
              <SkipForward className="w-5 h-5" />
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
                disabled={muted}
              />
            </div>

            <div className="text-xs text-gray-400 w-10 text-right">
              {muted ? '0%' : `${Math.round(volume)}%`}
            </div>
          </div>

          {/* 提示文本 */}
          <div className="mt-3 text-xs text-gray-500 text-center">
            滚轮调节音量 • 5秒后自动隐藏
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingMusicControl;
