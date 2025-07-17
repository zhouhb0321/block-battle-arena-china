
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

  // 总是跳过游戏模式选择器，直接使用默认模式或配置的模式
  if (!gameConfig || !gameConfig.gameMode) {
    // 如果没有配置模式，使用默认的40L模式
    const defaultMode = { id: 'sprint40', displayName: '40行冲刺', description: '尽快消除40行方块', isTimeAttack: false, targetLines: 40 };
    onModeReady(defaultMode);
    return null;
  }

  // 如果有配置的模式，直接使用
  return null;
};
