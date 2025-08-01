import { useEffect, useRef, useCallback, useState } from 'react';
import { useUserSettings } from './useUserSettings';
import { supabase } from '@/integrations/supabase/client';

interface MusicTrack {
  id: string;
  title: string;
  url: string;
}

export const useAutoPlayMusic = (isGameActive: boolean) => {
  const { settings } = useUserSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackRef = useRef<MusicTrack | null>(null);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);

  // 获取音乐文件列表
  const fetchMusicTracks = useCallback(async (): Promise<MusicTrack[]> => {
    try {
      const { data, error } = await supabase.storage
        .from('music-files')
        .list('', {
          limit: 100,
          sortBy: { column: 'name', order: 'asc' }
        });
      
      if (error) {
        console.error('获取音乐文件列表失败:', error);
        return [];
      }
      
      const musicTracks: MusicTrack[] = [];
      for (const file of data || []) {
        if (file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
          const { data: { publicUrl } } = supabase.storage
            .from('music-files')
            .getPublicUrl(file.name);
          
          musicTracks.push({
            id: file.id || file.name,
            title: file.name.replace(/\.[^/.]+$/, ''),
            url: publicUrl
          });
        }
      }
      
      return musicTracks;
    } catch (error) {
      console.error('获取音乐文件异常:', error);
      return [];
    }
  }, []);

  // 初始化音乐列表
  useEffect(() => {
    const initializeTracks = async () => {
      const musicTracks = await fetchMusicTracks();
      setTracks(musicTracks);
      
      // 选择第一首音轨作为默认
      if (musicTracks.length > 0 && !currentTrackRef.current) {
        currentTrackRef.current = musicTracks[0];
      }
    };
    
    initializeTracks();
  }, [fetchMusicTracks]);

  // 播放音乐
  const playMusic = useCallback(async () => {
    if (!audioRef.current || !currentTrackRef.current || !settings.enableSound) return;
    
    try {
      // 设置音量
      audioRef.current.volume = (settings.musicVolume || 30) / 100;
      audioRef.current.loop = true;
      
      // 播放音乐
      await audioRef.current.play();
    } catch (error) {
      console.error('自动播放音乐失败:', error);
    }
  }, [settings.enableSound, settings.musicVolume]);

  // 暂停音乐
  const pauseMusic = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  // 停止音乐
  const stopMusic = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  // 游戏状态变化时的音乐控制
  useEffect(() => {
    if (isGameActive && settings.enableSound) {
      playMusic();
    } else {
      pauseMusic();
    }
  }, [isGameActive, settings.enableSound, playMusic, pauseMusic]);

  // 初始化音频元素
  useEffect(() => {
    if (!audioRef.current && currentTrackRef.current) {
      const audio = new Audio(currentTrackRef.current.url);
      audio.loop = true;
      audio.volume = (settings.musicVolume || 30) / 100;
      audioRef.current = audio;
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [settings.musicVolume]);

  return {
    playMusic,
    pauseMusic,
    stopMusic,
    currentTrack: currentTrackRef.current,
    isSupported: tracks.length > 0
  };
};