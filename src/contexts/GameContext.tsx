
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';
import type { GameSettings } from '@/utils/gameTypes';

interface GameContextType {
  gameSettings: GameSettings;
  updateSettings: (settings: Partial<GameSettings>) => void;
  updateGameSettings: (settings: Partial<GameSettings>) => void;
  resetGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  refreshSettings: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { settings, saveSettings, reloadSettings } = useUserSettings();
  
  // Convert UserSettings to GameSettings
  const convertToGameSettings = (userSettings: typeof settings): GameSettings => ({
    enableGhost: userSettings.enableGhost,
    enableSound: userSettings.enableSound,
    masterVolume: userSettings.masterVolume,
    musicVolume: userSettings.musicVolume,
    backgroundMusic: userSettings.backgroundMusic,
    arr: userSettings.arr,
    das: userSettings.das,
    sdf: userSettings.sdf,
    dcd: userSettings.dcd,
    controls: userSettings.controls,
    ghostOpacity: userSettings.ghostOpacity,
    enableWallpaper: userSettings.enableWallpaper,
    undoSteps: userSettings.undoSteps,
    wallpaperChangeInterval: userSettings.wallpaperChangeInterval,
  });

  const [gameSettings, setGameSettings] = useState<GameSettings>(() => convertToGameSettings(settings));

  // 同步用户设置到游戏设置
  useEffect(() => {
    console.log('同步用户设置到游戏设置:', settings);
    setGameSettings(convertToGameSettings(settings));
  }, [settings]);

  const updateSettings = async (newSettings: Partial<GameSettings>) => {
    console.log('更新游戏设置:', newSettings);
    
    // 立即更新本地状态
    const updatedSettings = { ...gameSettings, ...newSettings };
    setGameSettings(updatedSettings);
    
    try {
      // 保存到数据库/本地存储
      await saveSettings(newSettings);
      console.log('设置已保存并同步');
    } catch (error) {
      console.error('保存设置失败:', error);
      // 如果保存失败，回滚本地状态
      setGameSettings(gameSettings);
      throw error;
    }
  };

  const updateGameSettings = async (newSettings: Partial<GameSettings>) => {
    await updateSettings(newSettings);
  };

  const refreshSettings = async () => {
    console.log('刷新设置');
    await reloadSettings();
  };

  const resetGame = () => {
    console.log('游戏重置');
  };

  const pauseGame = () => {
    console.log('游戏暂停');
  };

  const resumeGame = () => {
    console.log('游戏继续');
  };

  return (
    <GameContext.Provider value={{
      gameSettings,
      updateSettings,
      updateGameSettings,  
      resetGame,
      pauseGame,
      resumeGame,
      refreshSettings
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
