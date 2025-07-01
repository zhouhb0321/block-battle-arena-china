
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
    console.log('Starting game with type:', gameType, 'mode:', gameMode);
    setGameConfig({ gameType, gameMode });
    setGameStarted(true);
  };

  const handleBackToMenu = () => {
    console.log('Back to menu from game');
    setGameStarted(false);
    setGameConfig(null);
    onBackToMenu();
  };

  const handleBackToModeSelect = () => {
    console.log('Back to mode selection');
    setGameStarted(false);
    setGameConfig(null);
  };

  if (gameStarted && gameConfig) {
    return (
      <TetrisGame 
        gameConfig={gameConfig}
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
