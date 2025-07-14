
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';
import type { GameSettings } from '@/utils/gameTypes';

interface GameContextType {
  gameSettings: GameSettings;
  updateGameSettings: (settings: Partial<GameSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};

const convertToGameSettings = (userSettings: any): GameSettings => ({
  enableGhost: userSettings.enableGhost,
  enableSound: userSettings.enableSound,
  masterVolume: userSettings.masterVolume,
  musicVolume: userSettings.musicVolume,
  backgroundMusic: userSettings.backgroundMusic,
  arr: userSettings.arr,
  das: userSettings.das,
  sdf: userSettings.sdf,
  controls: userSettings.controls,
  ghostOpacity: userSettings.ghostOpacity,
  enableWallpaper: userSettings.enableWallpaper,
  wallpaperOpacity: userSettings.wallpaperOpacity || 100,
  autoPlayMusic: userSettings.autoPlayMusic || false,
  loopMusic: userSettings.loopMusic || true,
  enableLineAnimation: userSettings.enableLineAnimation || true,
  enableAchievementAnimation: userSettings.enableAchievementAnimation || true,
  enableLandingEffect: userSettings.enableLandingEffect || true,
  blockSkin: userSettings.blockSkin || 'wood'
});

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, saveSettings, reloadSettings } = useUserSettings();
  const [gameSettings, setGameSettings] = useState<GameSettings>(convertToGameSettings(settings));

  useEffect(() => {
    setGameSettings(convertToGameSettings(settings));
  }, [settings]);

  const updateGameSettings = async (newSettings: Partial<GameSettings>) => {
    const updatedSettings = { ...gameSettings, ...newSettings };
    setGameSettings(updatedSettings);
    
    // Convert back to user settings format and save
    await saveSettings({
      enableGhost: updatedSettings.enableGhost,
      enableSound: updatedSettings.enableSound,
      masterVolume: updatedSettings.masterVolume,
      musicVolume: updatedSettings.musicVolume,
      backgroundMusic: updatedSettings.backgroundMusic,
      arr: updatedSettings.arr,
      das: updatedSettings.das,
      sdf: updatedSettings.sdf,
      controls: updatedSettings.controls,
      ghostOpacity: updatedSettings.ghostOpacity,
      enableWallpaper: updatedSettings.enableWallpaper,
      wallpaperOpacity: updatedSettings.wallpaperOpacity,
      autoPlayMusic: updatedSettings.autoPlayMusic,
      loopMusic: updatedSettings.loopMusic,
      enableLineAnimation: updatedSettings.enableLineAnimation,
      enableAchievementAnimation: updatedSettings.enableAchievementAnimation,
      enableLandingEffect: updatedSettings.enableLandingEffect,
      blockSkin: updatedSettings.blockSkin
    });
  };

  const refreshSettings = async () => {
    await reloadSettings();
  };

  return (
    <GameContext.Provider value={{ gameSettings, updateGameSettings, refreshSettings }}>
      {children}
    </GameContext.Provider>
  );
};
