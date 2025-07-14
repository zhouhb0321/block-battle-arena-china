
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

  // Detect music files in public/music/ directory
  const detectMusicFiles = useCallback(async () => {
    try {
      const extensions = ['mp3', 'wav', 'ogg', 'm4a'];
      const musicFiles: MusicFile[] = [];
      
      // Try to load common music file names
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
            // File doesn't exist, continue
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

  useEffect(() => {
    detectMusicFiles();
  }, [detectMusicFiles]);

  return {
    availableMusic,
    currentTrack,
    setCurrentTrack,
    isLoading,
    detectMusicFiles
  };
};
