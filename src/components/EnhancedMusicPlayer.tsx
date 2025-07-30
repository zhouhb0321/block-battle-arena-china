import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipForward, Shuffle, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { supabase } from '@/integrations/supabase/client';

interface MusicTrack {
  id: string;
  title: string;
  filename: string;
  url: string;
}

interface EnhancedMusicPlayerProps {
  autoPlay?: boolean;
  onVolumeChange?: (volume: number) => void;
  onMuteChange?: (muted: boolean) => void;
  initialVolume?: number;
  initialMuted?: boolean;
}

const EnhancedMusicPlayer: React.FC<EnhancedMusicPlayerProps> = ({ 
  autoPlay = false,
  onVolumeChange,
  onMuteChange,
  initialVolume = 70,
  initialMuted = false
}) => {
  const { settings } = useUserSettings();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [availableTracks, setAvailableTracks] = useState<MusicTrack[]>([]);
  const [userInteracted, setUserInteracted] = useState(false);
  const [muted, setMuted] = useState(initialMuted || false);
  const [isLoading, setIsLoading] = useState(true);
  const [isShuffled, setIsShuffled] = useState(false);
  const [playOrder, setPlayOrder] = useState<number[]>([]);

  // 默认音乐轨道
  const DEFAULT_MUSIC_TRACKS: MusicTrack[] = [
    {
      id: 'wotlk-main',
      title: 'WotLK Main Title',
      filename: 'WotLK_main_title.mp3',
      url: '/music/WotLK_main_title.mp3'
    }
  ];

  // 检查音频文件是否可访问
  const checkAudioExists = useCallback(async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }, []);
  
  // 从Supabase Storage获取音乐文件列表
  const fetchMusicFiles = useCallback(async (): Promise<MusicTrack[]> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      
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
      
      const tracks: MusicTrack[] = [];
      for (const file of data || []) {
        if (file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
          const { data: { publicUrl } } = supabase.storage
            .from('music-files')
            .getPublicUrl(file.name);
          
          tracks.push({
            id: file.id || file.name,
            title: file.name.replace(/\.[^/.]+$/, ''),
            filename: file.name,
            url: publicUrl
          });
        }
      }
      
      return tracks;
    } catch (error) {
      console.error('获取音乐文件异常:', error);
      return [];
    }
  }, []);

  // 初始化可用音轨列表
  useEffect(() => {
    const initializeTracks = async () => {
      setIsLoading(true);
      let tracks: MusicTrack[] = [];
      
      // 首先尝试从Supabase Storage获取音乐文件
      const storageTracks = await fetchMusicFiles();
      if (storageTracks.length > 0) {
        tracks = storageTracks;
      } else {
        // 如果Storage中没有文件，使用默认音轨
        const validTracks: MusicTrack[] = [];
        for (const track of DEFAULT_MUSIC_TRACKS) {
          const exists = await checkAudioExists(track.url);
          if (exists) {
            validTracks.push(track);
          }
        }
        tracks = validTracks;
      }
      
      setAvailableTracks(tracks);
      
      // 设置初始播放音轨
      if (tracks.length > 0 && !currentTrack) {
        setCurrentTrack(tracks[0]);
      }
      
      setIsLoading(false);
    };
    
    initializeTracks();
  }, [fetchMusicFiles, checkAudioExists, currentTrack]);

  // 初始化播放顺序
  useEffect(() => {
    if (availableTracks.length > 0) {
      if (isShuffled) {
        const shuffled = [...Array(availableTracks.length).keys()].sort(() => Math.random() - 0.5);
        setPlayOrder(shuffled);
      } else {
        setPlayOrder([...Array(availableTracks.length).keys()]);
      }
    }
  }, [isShuffled, availableTracks.length]);

  // 设置音量
  useEffect(() => {
    if (audioRef.current) {
      const effectiveVolume = muted ? 0 : (settings.musicVolume || 30) / 100;
      audioRef.current.volume = Math.max(0, Math.min(1, effectiveVolume));
    }
  }, [settings.musicVolume, muted]);

  // 处理用户交互
  const handleUserInteraction = () => {
    if (!userInteracted) {
      setUserInteracted(true);
    }
  };

  // 播放音乐
  const handlePlay = async () => {
    if (!audioRef.current || !currentTrack) return;
    
    handleUserInteraction();
    
    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('播放失败:', error);
      handleNext();
    }
  };

  // 暂停音乐
  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // 下一首
  const handleNext = () => {
    if (availableTracks.length === 0) return;
    
    const currentIndex = availableTracks.findIndex(track => track.id === currentTrack?.id);
    const nextIndex = playOrder.length > 0 
      ? playOrder[(playOrder.findIndex(i => i === currentIndex) + 1) % playOrder.length]
      : (currentIndex + 1) % availableTracks.length;
    
    setCurrentTrack(availableTracks[nextIndex]);
  };

  // 音轨结束处理
  const handleTrackEnd = () => {
    handleNext();
  };

  // 随机播放切换
  const toggleShuffle = () => {
    setIsShuffled(!isShuffled);
  };

  // 音量调节
  const handleVolumeChange = (values: number[]) => {
    const newVolume = values[0];
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : newVolume / 100;
    }
    if (onVolumeChange) {
      onVolumeChange(newVolume);
    }
  };

  // 鼠标滚轮音量控制
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -5 : 5;
    const newVolume = Math.max(0, Math.min(100, (settings.musicVolume || 30) + delta));
    handleVolumeChange([newVolume]);
  }, [settings.musicVolume, handleVolumeChange]);

  // 静音切换
  const toggleMute = useCallback(() => {
    const newMuted = !muted;
    setMuted(newMuted);
    
    if (audioRef.current) {
      audioRef.current.muted = newMuted;
    }
    
    if (onMuteChange) {
      onMuteChange(newMuted);
    }
  }, [muted, onMuteChange]);

  // 自动播放功能
  useEffect(() => {
    if (autoPlay && availableTracks.length > 0 && userInteracted && settings.enableSound) {
      handlePlay();
    }
  }, [autoPlay, availableTracks.length, userInteracted, settings.enableSound]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>背景音乐播放器</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const initializeTracks = async () => {
                  setIsLoading(true);
                  const storageTracks = await fetchMusicFiles();
                  if (storageTracks.length > 0) {
                    setAvailableTracks(storageTracks);
                    if (!currentTrack) {
                      setCurrentTrack(storageTracks[0]);
                    }
                  }
                  setIsLoading(false);
                };
                initializeTracks();
              }}
              disabled={isLoading}
              title="刷新音乐列表"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleShuffle}
              className={`${isShuffled ? 'bg-primary/20' : ''}`}
            >
              <Shuffle className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={isPlaying ? handlePause : handlePlay}
              disabled={!currentTrack}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={availableTracks.length <= 1}
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2" onWheel={handleWheel}>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <Slider
            value={[settings.musicVolume || 30]}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            className="flex-1"
            disabled={!settings.enableSound}
          />
          <span className="text-sm w-8">{settings.musicVolume || 30}</span>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          {isLoading ? (
            <p>加载音乐文件中...</p>
          ) : availableTracks.length > 0 ? (
            <>
              <p>当前播放: {currentTrack?.title || '无'}</p>
              <p className={`text-xs ${isPlaying ? 'text-green-500' : 'text-gray-400'}`}>
                {isPlaying ? '播放中' : '已暂停'} | 共 {availableTracks.length} 首歌曲
              </p>
            </>
          ) : (
            <div className="space-y-1">
              <p>未找到音乐文件</p>
              <p className="text-xs">请通过管理面板上传音乐文件</p>
            </div>
          )}
        </div>

        {currentTrack && (
          <audio
            ref={audioRef}
            src={currentTrack.url}
            onEnded={handleTrackEnd}
            onError={(e) => {
              console.error('音频播放错误:', e);
              handleNext();
            }}
            loop={false}
            preload="metadata"
          />
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedMusicPlayer;