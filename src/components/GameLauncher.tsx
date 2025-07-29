
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

  React.useEffect(() => {
    // Automatically start with endless mode
    console.log('Auto-starting endless mode');
    setGameConfig({ gameType: 'singleplayer', gameMode: { id: 'endless', title: 'Endless Mode', description: 'Practice mode' } });
    setGameStarted(true);
  }, []);

  const handleBackToMenu = () => {
    console.log('Back to menu from game');
    setGameStarted(false);
    setGameConfig(null);
    onBackToMenu();
  };

  if (gameStarted && gameConfig) {
    return (
      <TetrisGame 
        gameConfig={gameConfig}
        onBackToMenu={handleBackToMenu}
      />
    );
  }

  return (
    <div className="text-center p-8 min-h-screen flex flex-col items-center justify-center">
      <div className="mb-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
      <p className="text-muted-foreground mb-4">Loading game...</p>
      <button 
        onClick={handleBackToMenu}
        className="text-primary hover:underline"
      >
        Return to Menu
      </button>
    </div>
  );
};

export default GameLauncher;
