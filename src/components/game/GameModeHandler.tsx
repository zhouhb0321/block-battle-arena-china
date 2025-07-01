
import React, { useState, useEffect } from 'react';
import GameModeSelector from '../GameModeSelector';
import GameCountdown from '../GameCountdown';
import { GAME_MODES, type GameMode } from '@/utils/gameTypes';

interface GameModeHandlerProps {
  gameConfig?: any;
  onModeReady: (mode: GameMode) => void;
  onBackToMenu: () => void;
}

export const GameModeHandler: React.FC<GameModeHandlerProps> = ({
  gameConfig,
  onModeReady,
  onBackToMenu
}) => {
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [showModeSelector, setShowModeSelector] = useState(!gameConfig);
  const [showCountdown, setShowCountdown] = useState(false);

  // Use gameConfig if provided, otherwise show mode selector
  useEffect(() => {
    if (gameConfig && gameConfig.gameMode) {
      console.log('Setting game mode from config:', gameConfig.gameMode);
      setGameMode(gameConfig.gameMode);
      setShowModeSelector(false);
      setShowCountdown(true);
    }
  }, [gameConfig]);

  const handleModeSelect = (mode: GameMode) => {
    console.log('Mode selected:', mode);
    setGameMode(mode);
    setShowModeSelector(false);
    setShowCountdown(true);
  };

  const handleCountdownEnd = () => {
    console.log('Countdown ended, starting game...');
    setShowCountdown(false);
    if (gameMode) {
      onModeReady(gameMode);
    }
  };

  const handleBackToModeSelector = () => {
    console.log('Back to mode selector');
    setGameMode(null);
    setShowCountdown(false);
    setShowModeSelector(true);
    onBackToMenu();
  };

  if (showModeSelector) {
    return (
      <GameModeSelector
        onModeSelect={handleModeSelect}
        onBack={handleBackToModeSelector}
      />
    );
  }

  if (showCountdown) {
    return (
      <div className="fixed inset-0 z-50">
        <GameCountdown
          show={showCountdown}
          onCountdownEnd={handleCountdownEnd}
        />
      </div>
    );
  }

  return null;
};
