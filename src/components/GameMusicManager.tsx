import React, { useEffect } from 'react';
import { useAutoPlayMusic } from '@/hooks/useAutoPlayMusic';

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
  const { playMusic, pauseMusic, stopMusic } = useAutoPlayMusic(isGameActive);

  useEffect(() => {
    // 回放打开时豁免音乐控制
    if (ignoreWhenReplayOpen && isReplayOpen) {
      return;
    }

    if (isGameActive && !isGamePaused) {
      playMusic();
    } else if (isGamePaused) {
      pauseMusic();
    } else {
      stopMusic();
    }
  }, [isGameActive, isGamePaused, playMusic, pauseMusic, stopMusic, ignoreWhenReplayOpen, isReplayOpen]);

  return null; // This component doesn't render anything
};

export default GameMusicManager;