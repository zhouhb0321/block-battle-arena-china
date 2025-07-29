
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, SkipForward, Volume2, Shuffle } from 'lucide-react';

// 默认音乐列表（你需要将这些文件放到 public/music/ 目录下）
const DEFAULT_MUSIC_TRACKS = [
  {
    id: 'tetris-theme-a',
    title: 'Tetris Theme A',
    filename: 'tetris-theme-a.mp3',
    url: '/music/tetris-theme-a.mp3'
  },
  {
    id: 'tetris-theme-b',
    title: 'Tetris Theme B', 
    filename: 'tetris-theme-b.mp3',
    url: '/music/tetris-theme-b.mp3'
  },
  {
    id: 'korobeiniki',
    title: 'Korobeiniki (Traditional)',
    filename: 'korobeiniki.mp3',
    url: '/music/korobeiniki.mp3'
  },
  {
    id: 'electronic-beat',
    title: 'Electronic Beat',
    filename: 'electronic-beat.mp3',
    url: '/music/electronic-beat.mp3'
  }
];

interface MusicPlayerProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  selectedTrack?: string;
  onTrackChange?: (trackId: string) => void;
  autoPlay?: boolean;
  shuffle?: boolean;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({
  volume,
  onVolumeChange,
  selectedTrack,
  onTrackChange,
  autoPlay = false,
  shuffle = true
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [availableTracks, setAvailableTracks] = useState(DEFAULT_MUSIC_TRACKS);
  const [isShuffled, setIsShuffled] = useState(shuffle);
  const [playOrder, setPlayOrder] = useState<number[]>([]);

  // 初始化播放顺序
  useEffect(() => {
    if (isShuffled) {
      const shuffled = [...Array(availableTracks.length).keys()].sort(() => Math.random() - 0.5);
      setPlayOrder(shuffled);
    } else {
      setPlayOrder([...Array(availableTracks.length).keys()]);
    }
  }, [isShuffled, availableTracks.length]);

  // 设置音量
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // 自动播放
  useEffect(() => {
    if (autoPlay && availableTracks.length > 0) {
      handlePlay();
    }
  }, [autoPlay, availableTracks.length]);

  const handlePlay = async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('播放失败:', error);
        // 如果当前音乐文件播放失败，尝试下一首
        handleNext();
      }
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleNext = () => {
    if (playOrder.length === 0) return;
    
    const currentOrderIndex = playOrder.findIndex(index => index === currentTrack);
    const nextOrderIndex = (currentOrderIndex + 1) % playOrder.length;
    const nextTrack = playOrder[nextOrderIndex];
    
    setCurrentTrack(nextTrack);
    if (onTrackChange) {
      onTrackChange(availableTracks[nextTrack].id);
    }
  };

  const handleTrackEnd = () => {
    handleNext();
  };

  const toggleShuffle = () => {
    setIsShuffled(!isShuffled);
  };

  const currentTrackData = availableTracks[currentTrack];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>背景音乐</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleShuffle}
            className={isShuffled ? 'text-blue-600' : 'text-gray-400'}
          >
            <Shuffle className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentTrackData && (
          <div className="text-center">
            <p className="text-sm font-medium">{currentTrackData.title}</p>
          </div>
        )}
        
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={isPlaying ? handlePause : handlePlay}
            disabled={!currentTrackData}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNext}
            disabled={availableTracks.length <= 1}
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          <Slider
            value={[volume]}
            onValueChange={(values) => onVolumeChange(values[0])}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-sm text-gray-500 w-8">{volume}</span>
        </div>

        <div className="text-xs text-gray-500 text-center">
          {availableTracks.length === 0 ? (
            <p>没有可用的音乐文件</p>
          ) : (
            <p>共 {availableTracks.length} 首音乐 {isShuffled ? '(随机播放)' : '(顺序播放)'}</p>
          )}
        </div>

        {currentTrackData && (
          <audio
            ref={audioRef}
            src={currentTrackData.url}
            onEnded={handleTrackEnd}
            onError={() => {
              console.error('音乐文件加载失败:', currentTrackData.url);
              handleNext();
            }}
            preload="metadata"
          />
        )}
      </CardContent>
    </Card>
  );
};

export default MusicPlayer;
