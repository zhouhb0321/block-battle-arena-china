import React, { useEffect } from 'react';
import { useAutoPlayMusic } from '@/hooks/useAutoPlayMusic';

interface GameMusicManagerProps {
  isGameActive: boolean;
  isGamePaused: boolean;
}

export const GameMusicManager: React.FC<GameMusicManagerProps> = ({
  isGameActive,
  isGamePaused
}) => {
  const { playMusic, pauseMusic, stopMusic } = useAutoPlayMusic(isGameActive);

  useEffect(() => {
    if (isGameActive && !isGamePaused) {
      playMusic();
    } else if (isGamePaused) {
      pauseMusic();
    } else {
      stopMusic();
    }
  }, [isGameActive, isGamePaused, playMusic, pauseMusic, stopMusic]);

  return null; // This component doesn't render anything
};

export default GameMusicManager;