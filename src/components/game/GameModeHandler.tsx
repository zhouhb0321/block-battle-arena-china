
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

  // 根据配置决定是显示选择器还是直接启动
  if (!gameConfig || !gameConfig.gameMode) {
    // 游客模式：直接启动40L模式
    const defaultMode = { 
      id: 'sprint40', 
      displayName: '40行冲刺', 
      description: '尽快消除40行方块', 
      isTimeAttack: false, 
      targetLines: 40 
    };
    
    useEffect(() => {
      onModeReady(defaultMode);
    }, []);
    
    return null;
  }

  // 如果有配置的模式，直接使用
  return null;
};
