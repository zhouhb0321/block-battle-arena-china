
import { useState, useEffect, useCallback } from 'react';

interface MusicFile {
  name: string;
  url: string;
  duration?: number;
}

export const useMusicManager = () => {
  const [availableMusic, setAvailableMusic] = useState<MusicFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<MusicFile | null>(null);

  // 自动检测音乐文件，应用启动时执行
  const detectMusicFiles = useCallback(async () => {
    try {
      const extensions = ['mp3', 'wav', 'ogg', 'm4a'];
      const musicFiles: MusicFile[] = [];
      
      // 预定义的音乐文件列表
      const commonNames = [
        'WotLK_main_title', 'tetris_theme', 'game_music', 'background_music',
        'music1', 'music2', 'music3', 'track1', 'track2', 'track3'
      ];

      for (const name of commonNames) {
        for (const ext of extensions) {
          try {
            const url = `/music/${name}.${ext}`;
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok) {
              musicFiles.push({ 
                name: `${name}.${ext}`, 
                url 
              });
            }
          } catch (error) {
            // 文件不存在，继续检测其他文件
          }
        }
      }

      setAvailableMusic(musicFiles);
      if (musicFiles.length > 0 && !currentTrack) {
        setCurrentTrack(musicFiles[0]);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error detecting music files:', error);
      setIsLoading(false);
    }
  }, [currentTrack]);

  // 应用启动时自动检测
  useEffect(() => {
    detectMusicFiles();
  }, [detectMusicFiles]);

  return {
    availableMusic,
    currentTrack,
    setCurrentTrack,
    isLoading
    // 移除 detectMusicFiles 函数，不再暴露给UI使用
  };
};
