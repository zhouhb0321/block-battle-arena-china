/**
 * 全局音乐管理上下文
 * 统一管理所有音乐播放，解决多音频源冲突问题
 * 支持从 Supabase Storage 动态加载音乐
 */

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { supabase } from '@/integrations/supabase/client';

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
  isLoading: boolean;
  
  // 控制函数
  play: () => void;
  pause: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  
  // 播放列表控制
  playNext: () => void;
  playPrevious: () => void;
  playlist: MusicTrack[];
  currentTrackIndex: number;
  refreshPlaylist: () => Promise<void>;
  
  // 优先级控制
  requestPlayback: (source: MusicSource, track?: MusicTrack) => void;
  releasePlayback: (source: MusicSource) => void;
  
  // 当前控制源
  currentSource: MusicSource | null;
}

const MusicContext = createContext<MusicContextType | null>(null);

// 默认播放列表（当 Storage 加载失败时使用）
const DEFAULT_PLAYLIST: MusicTrack[] = [
  { id: 'game-music', url: '/music/WotLK_main_title.mp3', title: 'WotLK Main Title' }
];

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, saveSettings } = useUserSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [muted, setMuted] = useState(false);
  const [currentSource, setCurrentSource] = useState<MusicSource | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [playlist, setPlaylist] = useState<MusicTrack[]>(DEFAULT_PLAYLIST);
  const [isLoading, setIsLoading] = useState(true);
  
  // 优先级定义：manual > replay > game
  const sourcePriority: Record<MusicSource, number> = {
    manual: 3,
    replay: 2,
    game: 1
  };
  
  // 从 Supabase Storage 加载音乐列表
  const loadPlaylistFromStorage = useCallback(async () => {
    setIsLoading(true);
    try {
      // 从 music-files bucket 获取文件列表
      const { data, error } = await supabase.storage
        .from('music-files')
        .list('', { limit: 100 });
      
      if (error) {
        console.warn('[MusicContext] 加载音乐列表失败:', error);
        setPlaylist(DEFAULT_PLAYLIST);
        return;
      }
      
      if (data && data.length > 0) {
        const audioFiles = data.filter(file => 
          file.name.endsWith('.mp3') || 
          file.name.endsWith('.ogg') || 
          file.name.endsWith('.wav') ||
          file.name.endsWith('.m4a')
        );
        
        if (audioFiles.length > 0) {
          const tracks: MusicTrack[] = audioFiles.map(file => {
            const { data: urlData } = supabase.storage
              .from('music-files')
              .getPublicUrl(file.name);
            
            return {
              id: file.name,
              url: urlData.publicUrl,
              title: file.name
                .replace(/\.(mp3|ogg|wav|m4a)$/i, '')
                .replace(/_/g, ' ')
                .replace(/-/g, ' ')
            };
          });
          
          console.log(`[MusicContext] 从 Storage 加载了 ${tracks.length} 首音乐`);
          setPlaylist(tracks);
          
          // 设置第一首为当前音轨
          if (!currentTrack && tracks.length > 0) {
            setCurrentTrack(tracks[0]);
            if (audioRef.current) {
              audioRef.current.src = tracks[0].url;
            }
          }
          return;
        }
      }
      
      // 没有找到音乐文件，使用默认列表
      console.log('[MusicContext] Storage 中没有音乐文件，使用默认列表');
      setPlaylist(DEFAULT_PLAYLIST);
      
    } catch (err) {
      console.warn('[MusicContext] 加载播放列表异常:', err);
      setPlaylist(DEFAULT_PLAYLIST);
    } finally {
      setIsLoading(false);
    }
  }, [currentTrack]);
  
  // 初始化：加载播放列表
  useEffect(() => {
    loadPlaylistFromStorage();
  }, []);
  
  // 初始化音频元素
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
      
      // 播放结束时自动播放下一首（如果不是循环模式）
      audioRef.current.addEventListener('ended', () => {
        // 由于 loop=true，这个事件通常不会触发
        // 但保留以备将来支持非循环模式
      });
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
    } else if (!currentTrack && playlist.length > 0) {
      // 如果没有当前音轨，使用播放列表第一首
      const firstTrack = playlist[0];
      if (audioRef.current) {
        audioRef.current.src = firstTrack.url;
        audioRef.current.load();
      }
      setCurrentTrack(firstTrack);
    }
    
    // 开始播放
    play();
  }, [currentSource, currentTrack, playlist, play]);
  
  const releasePlayback = useCallback((source: MusicSource) => {
    console.log(`[MusicContext] ${source} 释放播放权`);
    
    // 只有当前控制源才能释放
    if (currentSource === source) {
      pause();
      setCurrentSource(null);
    }
  }, [currentSource, pause]);
  
  const playNext = useCallback(() => {
    if (playlist.length === 0) return;
    
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    setCurrentTrackIndex(nextIndex);
    const nextTrack = playlist[nextIndex];
    
    if (audioRef.current && nextTrack) {
      audioRef.current.src = nextTrack.url;
      audioRef.current.load();
      setCurrentTrack(nextTrack);
      
      if (isPlaying) {
        audioRef.current.play().catch(console.warn);
      }
    }
  }, [currentTrackIndex, playlist, isPlaying]);
  
  const playPrevious = useCallback(() => {
    if (playlist.length === 0) return;
    
    const prevIndex = currentTrackIndex === 0 ? playlist.length - 1 : currentTrackIndex - 1;
    setCurrentTrackIndex(prevIndex);
    const prevTrack = playlist[prevIndex];
    
    if (audioRef.current && prevTrack) {
      audioRef.current.src = prevTrack.url;
      audioRef.current.load();
      setCurrentTrack(prevTrack);
      
      if (isPlaying) {
        audioRef.current.play().catch(console.warn);
      }
    }
  }, [currentTrackIndex, playlist, isPlaying]);
  
  const refreshPlaylist = useCallback(async () => {
    await loadPlaylistFromStorage();
  }, [loadPlaylistFromStorage]);
  
  return (
    <MusicContext.Provider
      value={{
        isPlaying,
        currentTrack,
        volume: settings.musicVolume || 30,
        muted,
        isLoading,
        play,
        pause,
        stop,
        setVolume,
        toggleMute,
        playNext,
        playPrevious,
        playlist,
        currentTrackIndex,
        refreshPlaylist,
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
