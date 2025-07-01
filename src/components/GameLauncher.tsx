
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import TetrisGame from './TetrisGame';
import SinglePlayerMenu from './menus/SinglePlayerMenu';

interface GameLauncherProps {
  onBackToMenu: () => void;
}

const GameLauncher: React.FC<GameLauncherProps> = ({ onBackToMenu }) => {
  const { user } = useAuth();
  const [gameStarted, setGameStarted] = useState(false);
  const [gameConfig, setGameConfig] = useState<any>(null);

  const handleGameStart = (gameType: string, gameMode: any) => {
    console.log('Starting game with:', { gameType, gameMode });
    setGameConfig({ gameType, gameMode });
    setGameStarted(true);
  };

  const handleBackToMenu = () => {
    setGameStarted(false);
    setGameConfig(null);
    onBackToMenu();
  };

  const handleBackToModeSelect = () => {
    setGameStarted(false);
    setGameConfig(null);
  };

  if (gameStarted && gameConfig) {
    return (
      <TetrisGame 
        onBackToMenu={handleBackToModeSelect}
      />
    );
  }

  return (
    <SinglePlayerMenu 
      onGameStart={handleGameStart}
      onBack={handleBackToMenu}
    />
  );
};

export default GameLauncher;
