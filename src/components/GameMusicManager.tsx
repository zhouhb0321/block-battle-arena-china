import React, { useEffect } from 'react';
import { useMusicContext } from '@/contexts/MusicContext';

interface GameMusicManagerProps {
  isGameActive: boolean;
  isGamePaused: boolean;
  ignoreWhenReplayOpen?: boolean;
  isReplayOpen?: boolean;
}

export const GameMusicManager: React.FC<GameMusicManagerProps> = ({
  isGameActive,
  isGamePaused,
  ignoreWhenReplayOpen = false,
  isReplayOpen = false
}) => {
  const { requestPlayback, releasePlayback } = useMusicContext();

  useEffect(() => {
    // 回放打开时豁免音乐控制
    if (ignoreWhenReplayOpen && isReplayOpen) {
      releasePlayback('game');
      return;
    }

    if (isGameActive && !isGamePaused) {
      requestPlayback('game', {
        id: 'game-music',
        url: '/music/WotLK_main_title.mp3',
        title: 'Game Music'
      });
    } else {
      releasePlayback('game');
    }
  }, [isGameActive, isGamePaused, ignoreWhenReplayOpen, isReplayOpen, requestPlayback, releasePlayback]);

  return null;
};

export default GameMusicManager;