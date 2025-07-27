
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, SkipForward, Volume2, Shuffle, Music } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';

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
  const { settings, updateSettings } = useUserSettings();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [availableTracks, setAvailableTracks] = useState<MusicTrack[]>([]);
  const [isShuffled, setIsShuffled] = useState(true);
  const [playOrder, setPlayOrder] = useState<number[]>([]);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [volume, setVolume] = useState(70); // 新增音量状态
  const [isMuted, setIsMuted] = useState(false); // 新增静音状态

  // 默认音乐列表 - 只保留存在的文件
  const defaultTracks: MusicTrack[] = [
    {
      id: 'wotlk-main',
      title: 'WotLK Main Title',
      filename: 'WotLK_main_title.mp3',
      url: '/music/WotLK_main_title.mp3'
    }
  ];

  // 检查音频文件是否存在
  const checkAudioExists = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.addEventListener('canplaythrough', () => resolve(true), { once: true });
      audio.addEventListener('error', () => resolve(false), { once: true });
      audio.addEventListener('abort', () => resolve(false), { once: true });
      audio.src = url;
      audio.load();
    });
  };

  // 初始化可用音轨 - 简化版本
  useEffect(() => {
    const initializeAudioTracks = async () => {
      console.log('正在检查可用音乐文件...');
      const validTracks: MusicTrack[] = [];
      
      for (const track of defaultTracks) {
        console.log(`检查音乐文件: ${track.url}`);
        const exists = await checkAudioExists(track.url);
        if (exists) {
          console.log(`✓ 找到音乐文件: ${track.title}`);
          validTracks.push(track);
        } else {
          console.log(`✗ 音乐文件不存在: ${track.url}`);
        }
      }
      
      console.log(`总共找到 ${validTracks.length} 个可用音乐文件`);
      setAvailableTracks(validTracks);
      
      if (validTracks.length > 0) {
        // 选择用户设置的背景音乐或第一首
        const preferredTrack = validTracks.findIndex(track => track.id === settings.backgroundMusic);
        setCurrentTrack(preferredTrack >= 0 ? preferredTrack : 0);
      }
    };

    initializeAudioTracks();
  }, [settings.backgroundMusic]);

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
      const volume = (settings.masterVolume / 100) * ((settings.musicVolume || 70) / 100);
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, [settings.masterVolume, settings.musicVolume]);

  // 处理用户交互
  const handleUserInteraction = () => {
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
      console.log('用户首次交互，允许自动播放');
    }
  };

  // 播放音乐
  const handlePlay = async () => {
    if (!audioRef.current || availableTracks.length === 0) return;
    
    handleUserInteraction();
    
    try {
      await audioRef.current.play();
      setIsPlaying(true);
      console.log(`开始播放: ${availableTracks[currentTrack]?.title}`);
    } catch (error) {
      console.error('播放失败:', error);
      // 尝试播放下一首
      handleNext();
    }
  };

  // 暂停音乐
  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      console.log('音乐已暂停');
    }
  };

  // 下一首
  const handleNext = () => {
    if (playOrder.length === 0) return;
    
    const currentOrderIndex = playOrder.findIndex(index => index === currentTrack);
    const nextOrderIndex = (currentOrderIndex + 1) % playOrder.length;
    const nextTrack = playOrder[nextOrderIndex];
    
    setCurrentTrack(nextTrack);
    updateSettings({ backgroundMusic: availableTracks[nextTrack]?.id });
    console.log(`切换到下一首: ${availableTracks[nextTrack]?.title}`);
  };

  // 音轨结束处理
  const handleTrackEnd = () => {
    console.log('当前音轨播放结束，自动播放下一首');
    handleNext();
  };

  // 随机播放切换
  const toggleShuffle = () => {
    setIsShuffled(!isShuffled);
    console.log(`随机播放: ${!isShuffled ? '开启' : '关闭'}`);
  };

  // 音量调节
  const handleVolumeChange = (values: number[]) => {
    updateSettings({ musicVolume: values[0] });
  };

  // 自动播放逻辑
  useEffect(() => {
    if (autoPlay && availableTracks.length > 0 && settings.enableSound && hasUserInteracted) {
      console.log('尝试自动播放音乐');
      handlePlay();
    }
  }, [autoPlay, availableTracks.length, settings.enableSound, hasUserInteracted]);

  // 自动播放功能
  useEffect(() => {
    if (autoPlay && availableTracks.length > 0 && !hasUserInteracted) {
      const timer = setTimeout(() => {
        if (audioRef.current && !isPlaying) {
          handlePlay(); // 使用 handlePlay 替代 playMusic
        }
      }, 1000); // 延迟1秒自动播放
      
      return () => clearTimeout(timer);
    }
  }, [autoPlay, availableTracks, hasUserInteracted, isPlaying]);

  // 鼠标滚轮音量控制
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -5 : 5;
    const newVolume = Math.max(0, Math.min(100, volume + delta));
    setVolume(newVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
    
    // 保存音量设置
    if (onVolumeChange) {
      onVolumeChange(newVolume);
    }
  }, [volume, onVolumeChange]);

  // 静音切换
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    if (audioRef.current) {
      audioRef.current.muted = newMuted;
    }
    
    // 保存静音设置
    if (onMuteChange) {
      onMuteChange(newMuted);
    }
  }, [isMuted, onMuteChange]);

  const currentTrackData = availableTracks[currentTrack];

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="w-4 h-4" />
          <span>背景音乐</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleShuffle}
            className={isShuffled ? 'text-blue-600' : 'text-gray-400'}
            title={isShuffled ? '随机播放' : '顺序播放'}
          >
            <Shuffle className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentTrackData ? (
          <>
            <div className="text-center">
              <p className="text-sm font-medium truncate" title={currentTrackData.title}>
                {currentTrackData.title}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {availableTracks.length} 首音乐 {isShuffled ? '(随机)' : '(顺序)'}
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={isPlaying ? handlePause : handlePlay}
                onMouseDown={handleUserInteraction}
                disabled={!settings.enableSound}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleUserInteraction();
                  handleNext();
                }}
                disabled={availableTracks.length <= 1 || !settings.enableSound}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              <Slider
                value={[settings.musicVolume || 70]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="flex-1"
                disabled={!settings.enableSound}
              />
              <span className="text-sm text-gray-500 w-8">
                {settings.musicVolume || 70}
              </span>
            </div>

            {!hasUserInteracted && (
              <p className="text-xs text-yellow-600 text-center">
                点击播放按钮开始音乐
              </p>
            )}
          </>
        ) : (
          <div className="text-center text-gray-500">
            <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">没有找到音乐文件</p>
            <p className="text-xs mt-1">
              请将音乐文件放在 public/music/ 目录下
            </p>
          </div>
        )}

        {currentTrackData && (
          <audio
            ref={audioRef}
            src={currentTrackData.url}
            onEnded={handleTrackEnd}
            onError={(e) => {
              console.error('音频播放错误:', e);
              console.log('尝试播放下一首...');
              handleNext();
            }}
            preload="metadata"
          />
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedMusicPlayer;
