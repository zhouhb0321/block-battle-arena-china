
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import TetrisGame from './TetrisGame';


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

  // Check if a game mode was pre-selected from the home page
  React.useEffect(() => {
    const selectedMode = (window as any).selectedGameMode;
    if (selectedMode) {
      handleGameStart('singleplayer', selectedMode);
      (window as any).selectedGameMode = null; // Clear the selection
    }
  }, []);

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

  // If no game mode was pre-selected, start with endless mode
  React.useEffect(() => {
    if (!gameStarted && !gameConfig) {
      handleGameStart('singleplayer', { id: 'endless', title: 'Endless Mode', description: 'Practice mode' });
    }
  }, [gameStarted, gameConfig]);

  return (
    <div className="text-center p-8">
      <p className="text-muted-foreground">Loading game...</p>
    </div>
  );
};

export default GameLauncher;
