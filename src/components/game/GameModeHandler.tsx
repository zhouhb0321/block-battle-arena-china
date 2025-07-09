
import React, { useState, useEffect } from 'react';
import GameModeSelector from '../GameModeSelector';
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

  // 使用配置的游戏模式或显示选择器
  useEffect(() => {
    if (gameConfig && gameConfig.gameMode) {
      console.log('Setting game mode from config:', gameConfig.gameMode);
      const mode = gameConfig.gameMode;
      setGameMode(mode);
      // 直接回调，不需要倒计时
      onModeReady(mode);
    }
  }, [gameConfig, onModeReady]);

  const handleModeSelect = (mode: GameMode) => {
    console.log('Mode selected:', mode);
    setGameMode(mode);
    // 直接回调，不需要倒计时
    onModeReady(mode);
  };

  const handleBackToModeSelector = () => {
    console.log('Back to mode selector');
    setGameMode(null);
    onBackToMenu();
  };

  // 如果已经有配置的模式，不显示选择器
  if (gameConfig && gameConfig.gameMode) {
    return null;
  }

  return (
    <GameModeSelector
      onModeSelect={handleModeSelect}
      onBack={handleBackToModeSelector}
    />
  );
};
