/**
 * 全局音乐管理上下文
 * 统一管理所有音乐播放，解决多音频源冲突问题
 */

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';

interface MusicTrack {
  id: string;
  url: string;
  title?: string;
}

type MusicSource = 'manual' | 'replay' | 'game';

interface MusicContextType {
  // 播放状态
  isPlaying: boolean;
  currentTrack: MusicTrack | null;
  volume: number;
  muted: boolean;
  
  // 控制函数
  play: () => void;
  pause: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  
  // 优先级控制
  requestPlayback: (source: MusicSource, track?: MusicTrack) => void;
  releasePlayback: (source: MusicSource) => void;
  
  // 当前控制源
  currentSource: MusicSource | null;
}

const MusicContext = createContext<MusicContextType | null>(null);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, saveSettings } = useUserSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [muted, setMuted] = useState(false);
  const [currentSource, setCurrentSource] = useState<MusicSource | null>(null);
  
  // 优先级定义：manual > replay > game
  const sourcePriority: Record<MusicSource, number> = {
    manual: 3,
    replay: 2,
    game: 1
  };
  
  // 初始化音频元素
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);
  
  // 同步音量设置
  useEffect(() => {
    if (audioRef.current) {
      const effectiveVolume = muted ? 0 : (settings.musicVolume || 30) / 100;
      audioRef.current.volume = Math.max(0, Math.min(1, effectiveVolume));
    }
  }, [settings.musicVolume, muted]);
  
  const play = useCallback(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.play().catch(err => {
        console.warn('[MusicContext] Play failed:', err);
      });
      setIsPlaying(true);
    }
  }, [currentTrack]);
  
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);
  
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);
  
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(100, volume));
    saveSettings({ musicVolume: clampedVolume });
    
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : clampedVolume / 100;
    }
  }, [muted, saveSettings]);
  
  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const newMuted = !prev;
      if (audioRef.current) {
        audioRef.current.volume = newMuted ? 0 : (settings.musicVolume || 30) / 100;
      }
      return newMuted;
    });
  }, [settings.musicVolume]);
  
  const requestPlayback = useCallback((source: MusicSource, track?: MusicTrack) => {
    console.log(`[MusicContext] ${source} 请求播放权`, track);
    
    // 检查优先级
    if (currentSource && sourcePriority[source] <= sourcePriority[currentSource]) {
      console.log(`[MusicContext] ${source} 优先级低于 ${currentSource}，请求被拒绝`);
      return;
    }
    
    // 更新当前控制源
    setCurrentSource(source);
    
    // 如果提供了新音轨，切换音轨
    if (track && track.id !== currentTrack?.id) {
      if (audioRef.current) {
        audioRef.current.src = track.url;
        audioRef.current.load();
      }
      setCurrentTrack(track);
    }
    
    // 开始播放
    play();
  }, [currentSource, currentTrack, play]);
  
  const releasePlayback = useCallback((source: MusicSource) => {
    console.log(`[MusicContext] ${source} 释放播放权`);
    
    // 只有当前控制源才能释放
    if (currentSource === source) {
      pause();
      setCurrentSource(null);
    }
  }, [currentSource, pause]);
  
  return (
    <MusicContext.Provider
      value={{
        isPlaying,
        currentTrack,
        volume: settings.musicVolume || 30,
        muted,
        play,
        pause,
        stop,
        setVolume,
        toggleMute,
        requestPlayback,
        releasePlayback,
        currentSource
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export const useMusicContext = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusicContext must be used within MusicProvider');
  }
  return context;
};
