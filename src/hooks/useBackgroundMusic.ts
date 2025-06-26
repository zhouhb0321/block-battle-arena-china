
import { useState, useEffect, useRef } from 'react';

export interface MusicTrack {
  id: string;
  name: string;
  url: string;
  duration: number;
}

// 免版权电子音乐和轻音乐列表
const MUSIC_TRACKS: MusicTrack[] = [
  { id: 'electronic1', name: '电子旋律 - 数字梦境', url: '/music/electronic1.mp3', duration: 180 },
  { id: 'electronic2', name: '电子旋律 - 霓虹之光', url: '/music/electronic2.mp3', duration: 200 },
  { id: 'electronic3', name: '电子旋律 - 赛博空间', url: '/music/electronic3.mp3', duration: 165 },
  { id: 'electronic4', name: '电子旋律 - 未来世界', url: '/music/electronic4.mp3', duration: 190 },
  { id: 'electronic5', name: '电子旋律 - 像素风暴', url: '/music/electronic5.mp3', duration: 175 },
  { id: 'lofi1', name: '轻音乐 - 午后阳光', url: '/music/lofi1.mp3', duration: 210 },
  { id: 'lofi2', name: '轻音乐 - 咖啡时光', url: '/music/lofi2.mp3', duration: 195 },
  { id: 'lofi3', name: '轻音乐 - 雨夜思绪', url: '/music/lofi3.mp3', duration: 185 },
  { id: 'lofi4', name: '轻音乐 - 温柔晚风', url: '/music/lofi4.mp3', duration: 205 },
  { id: 'lofi5', name: '轻音乐 - 静谧森林', url: '/music/lofi5.mp3', duration: 225 },
  { id: 'ambient1', name: '环境音乐 - 星空漫步', url: '/music/ambient1.mp3', duration: 300 },
  { id: 'ambient2', name: '环境音乐 - 深海探索', url: '/music/ambient2.mp3', duration: 280 },
  { id: 'ambient3', name: '环境音乐 - 山谷回声', url: '/music/ambient3.mp3', duration: 250 },
  { id: 'chiptune1', name: '8位音乐 - 复古冒险', url: '/music/chiptune1.mp3', duration: 150 },
  { id: 'chiptune2', name: '8位音乐 - 像素英雄', url: '/music/chiptune2.mp3', duration: 140 },
  { id: 'chiptune3', name: '8位音乐 - 街机时代', url: '/music/chiptune3.mp3', duration: 160 },
  { id: 'synthwave1', name: '合成波 - 霓虹夜晚', url: '/music/synthwave1.mp3', duration: 220 },
  { id: 'synthwave2', name: '合成波 - 赛车狂飙', url: '/music/synthwave2.mp3', duration: 200 },
  { id: 'synthwave3', name: '合成波 - 未来都市', url: '/music/synthwave3.mp3', duration: 240 },
  { id: 'minimal1', name: '极简音乐 - 简约之美', url: '/music/minimal1.mp3', duration: 270 },
  { id: 'minimal2', name: '极简音乐 - 纯净心境', url: '/music/minimal2.mp3', duration: 260 },
  { id: 'downtempo1', name: '慢节拍 - 放松时光', url: '/music/downtempo1.mp3', duration: 290 },
  { id: 'downtempo2', name: '慢节拍 - 冥想空间', url: '/music/downtempo2.mp3', duration: 310 },
  { id: 'house1', name: '浩室音乐 - 舞动节拍', url: '/music/house1.mp3', duration: 180 },
  { id: 'house2', name: '浩室音乐 - 活力四射', url: '/music/house2.mp3', duration: 195 },
  { id: 'trance1', name: '迷幻音乐 - 心灵之旅', url: '/music/trance1.mp3', duration: 420 },
  { id: 'trance2', name: '迷幻音乐 - 梦境漂浮', url: '/music/trance2.mp3', duration: 380 },
  { id: 'dnb1', name: '鼓打贝斯 - 节奏风暴', url: '/music/dnb1.mp3', duration: 210 },
  { id: 'dnb2', name: '鼓打贝斯 - 速度激情', url: '/music/dnb2.mp3', duration: 230 },
  { id: 'classical1', name: '新古典 - 钢琴诗篇', url: '/music/classical1.mp3', duration: 320 }
];

export const useBackgroundMusic = () => {
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.src = currentTrack.url;
      audioRef.current.volume = volume;
      
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [currentTrack, volume, isPlaying]);

  const playTrack = (track: MusicTrack) => {
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const pauseMusic = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const resumeMusic = () => {
    setIsPlaying(true);
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  };

  const stopMusic = () => {
    setIsPlaying(false);
    setCurrentTrack(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const setMusicVolume = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return {
    musicTracks: MUSIC_TRACKS,
    currentTrack,
    isPlaying,
    volume,
    playTrack,
    pauseMusic,
    resumeMusic,
    stopMusic,
    setMusicVolume
  };
};
