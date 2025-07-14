
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserSettings {
  enableGhost: boolean;
  enableSound: boolean;
  masterVolume: number;
  musicVolume: number;
  backgroundMusic: string;
  arr: number;
  das: number;
  sdf: number;
  controls: {
    moveLeft: string;
    moveRight: string;
    softDrop: string;
    hardDrop: string;
    rotateClockwise: string;
    rotateCounterclockwise: string;
    rotate180: string;
    hold: string;
    pause: string;
    backToMenu: string;
  };
  ghostOpacity: number;
  blockSkin?: string;
  enableWallpaper: boolean;
  wallpaperOpacity: number;
  autoPlayMusic: boolean;
  loopMusic: boolean;
  enableLineAnimation: boolean;
  enableAchievementAnimation: boolean;
  enableLandingEffect: boolean;
}

const DEFAULT_GUEST_SETTINGS: UserSettings = {
  enableGhost: true,
  enableSound: true,
  masterVolume: 50,
  musicVolume: 30,
  backgroundMusic: '',
  arr: 10,
  das: 133,
  sdf: 30,
  controls: {
    moveLeft: 'ArrowLeft',
    moveRight: 'ArrowRight',
    softDrop: 'ArrowDown',
    hardDrop: 'Space',
    rotateClockwise: 'ArrowUp',
    rotateCounterclockwise: 'KeyZ',
    rotate180: 'KeyA',
    hold: 'KeyC',
    pause: 'Escape',
    backToMenu: 'KeyB',
  },
  ghostOpacity: 50,
  blockSkin: 'wood',
  enableWallpaper: true,
  wallpaperOpacity: 100,
  autoPlayMusic: false,
  loopMusic: true,
  enableLineAnimation: true,
  enableAchievementAnimation: true,
  enableLandingEffect: true,
};

const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error("Error accessing localStorage:", error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error("Error setting localStorage:", error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
};

export const useUserSettings = () => {
  const { user } = useAuth ? useAuth() : { user: null };
  const [settings, setSettings] = useLocalStorage<UserSettings>('userSettings', DEFAULT_GUEST_SETTINGS);
  const [loading, setLoading] = useState(false);

  // Fetch cloud settings
  const fetchCloudSettings = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', uid)
        .single();
      if (error) throw error;
      if (data) {
        // Type-safe conversion from database to UserSettings
        const controlsData = data.controls as any;
        const cloudSettings: UserSettings = {
          enableGhost: data.enable_ghost,
          enableSound: data.enable_sound,
          masterVolume: data.master_volume,
          musicVolume: data.music_volume ?? 30,
          backgroundMusic: data.background_music ?? '',
          arr: data.arr,
          das: data.das,
          sdf: data.sdf,
          controls: {
            moveLeft: controlsData?.moveLeft || 'ArrowLeft',
            moveRight: controlsData?.moveRight || 'ArrowRight',
            softDrop: controlsData?.softDrop || 'ArrowDown',
            hardDrop: controlsData?.hardDrop || 'Space',
            rotateClockwise: controlsData?.rotateClockwise || 'ArrowUp',
            rotateCounterclockwise: controlsData?.rotateCounterclockwise || 'KeyZ',
            rotate180: controlsData?.rotate180 || 'KeyA',
            hold: controlsData?.hold || 'KeyC',
            pause: controlsData?.pause || 'Escape',
            backToMenu: controlsData?.backToMenu || data.back_to_menu || 'KeyB',
          },
          ghostOpacity: data.ghost_opacity ?? 50,
          blockSkin: data.block_skin ?? 'wood',
          enableWallpaper: data.enable_wallpaper ?? true,
          wallpaperOpacity: data.wallpaper_opacity ?? 100,
          autoPlayMusic: data.auto_play_music ?? false,
          loopMusic: data.loop_music ?? true,
          enableLineAnimation: data.enable_line_animation ?? true,
          enableAchievementAnimation: data.enable_achievement_animation ?? true,
          enableLandingEffect: data.enable_landing_effect ?? true,
        };
        setSettings(cloudSettings);
        window.localStorage.setItem('userSettings', JSON.stringify(cloudSettings));
      }
    } catch (error) {
      console.error('Failed to fetch cloud settings:', error);
    } finally {
      setLoading(false);
    }
  }, [setSettings]);

  // Auto-fetch cloud settings after login
  useEffect(() => {
    if (user && !user.isGuest && user.id) {
      fetchCloudSettings(user.id);
    }
  }, [user, fetchCloudSettings]);

  // Save settings to cloud - using completely type-safe approach
  const saveSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    if (!newSettings || typeof newSettings !== 'object' || Array.isArray(newSettings)) {
      console.error('Invalid settings provided');
      return;
    }

    setSettings(prevSettings => {
      const mergedSettings: UserSettings = {
        enableGhost: newSettings.enableGhost !== undefined ? newSettings.enableGhost : prevSettings.enableGhost,
        enableSound: newSettings.enableSound !== undefined ? newSettings.enableSound : prevSettings.enableSound,
        masterVolume: newSettings.masterVolume !== undefined ? newSettings.masterVolume : prevSettings.masterVolume,
        musicVolume: newSettings.musicVolume !== undefined ? newSettings.musicVolume : prevSettings.musicVolume,
        backgroundMusic: newSettings.backgroundMusic !== undefined ? newSettings.backgroundMusic : prevSettings.backgroundMusic,
        arr: newSettings.arr !== undefined ? newSettings.arr : prevSettings.arr,
        das: newSettings.das !== undefined ? newSettings.das : prevSettings.das,
        sdf: newSettings.sdf !== undefined ? newSettings.sdf : prevSettings.sdf,
        controls: newSettings.controls !== undefined ? newSettings.controls : prevSettings.controls,
        ghostOpacity: newSettings.ghostOpacity !== undefined ? newSettings.ghostOpacity : prevSettings.ghostOpacity,
        blockSkin: newSettings.blockSkin !== undefined ? newSettings.blockSkin : prevSettings.blockSkin,
        enableWallpaper: newSettings.enableWallpaper !== undefined ? newSettings.enableWallpaper : prevSettings.enableWallpaper,
        wallpaperOpacity: newSettings.wallpaperOpacity !== undefined ? newSettings.wallpaperOpacity : prevSettings.wallpaperOpacity,
        autoPlayMusic: newSettings.autoPlayMusic !== undefined ? newSettings.autoPlayMusic : prevSettings.autoPlayMusic,
        loopMusic: newSettings.loopMusic !== undefined ? newSettings.loopMusic : prevSettings.loopMusic,
        enableLineAnimation: newSettings.enableLineAnimation !== undefined ? newSettings.enableLineAnimation : prevSettings.enableLineAnimation,
        enableAchievementAnimation: newSettings.enableAchievementAnimation !== undefined ? newSettings.enableAchievementAnimation : prevSettings.enableAchievementAnimation,
        enableLandingEffect: newSettings.enableLandingEffect !== undefined ? newSettings.enableLandingEffect : prevSettings.enableLandingEffect,
      };
      
      // Guests only save locally
      if (!user || user.isGuest || !user.id) {
        window.localStorage.setItem('userSettings', JSON.stringify(mergedSettings));
        return mergedSettings;
      }
      
      // Logged in users sync to cloud
      const dbSettings = {
        enable_ghost: mergedSettings.enableGhost,
        enable_sound: mergedSettings.enableSound,
        master_volume: mergedSettings.masterVolume,
        music_volume: mergedSettings.musicVolume,
        background_music: mergedSettings.backgroundMusic,
        arr: mergedSettings.arr,
        das: mergedSettings.das,
        sdf: mergedSettings.sdf,
        controls: mergedSettings.controls,
        ghost_opacity: mergedSettings.ghostOpacity,
        back_to_menu: mergedSettings.controls.backToMenu,
        block_skin: mergedSettings.blockSkin || 'wood',
        enable_wallpaper: mergedSettings.enableWallpaper,
        wallpaper_opacity: mergedSettings.wallpaperOpacity,
        auto_play_music: mergedSettings.autoPlayMusic,
        loop_music: mergedSettings.loopMusic,
        enable_line_animation: mergedSettings.enableLineAnimation,
        enable_achievement_animation: mergedSettings.enableAchievementAnimation,
        enable_landing_effect: mergedSettings.enableLandingEffect,
      };
      
      supabase
        .from('user_settings')
        .update(dbSettings)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Failed to save cloud settings:', error);
          }
        });
      
      window.localStorage.setItem('userSettings', JSON.stringify(mergedSettings));
      return mergedSettings;
    });
  }, [setSettings, user]);

  // Update settings locally only (like for guests) - using completely type-safe approach
  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    if (!newSettings || typeof newSettings !== 'object' || Array.isArray(newSettings)) {
      console.error('Invalid settings provided');
      return;
    }

    setSettings(prevSettings => {
      const updatedSettings: UserSettings = {
        enableGhost: newSettings.enableGhost !== undefined ? newSettings.enableGhost : prevSettings.enableGhost,
        enableSound: newSettings.enableSound !== undefined ? newSettings.enableSound : prevSettings.enableSound,
        masterVolume: newSettings.masterVolume !== undefined ? newSettings.masterVolume : prevSettings.masterVolume,
        musicVolume: newSettings.musicVolume !== undefined ? newSettings.musicVolume : prevSettings.musicVolume,
        backgroundMusic: newSettings.backgroundMusic !== undefined ? newSettings.backgroundMusic : prevSettings.backgroundMusic,
        arr: newSettings.arr !== undefined ? newSettings.arr : prevSettings.arr,
        das: newSettings.das !== undefined ? newSettings.das : prevSettings.das,
        sdf: newSettings.sdf !== undefined ? newSettings.sdf : prevSettings.sdf,
        controls: newSettings.controls !== undefined ? newSettings.controls : prevSettings.controls,
        ghostOpacity: newSettings.ghostOpacity !== undefined ? newSettings.ghostOpacity : prevSettings.ghostOpacity,
        blockSkin: newSettings.blockSkin !== undefined ? newSettings.blockSkin : prevSettings.blockSkin,
        enableWallpaper: newSettings.enableWallpaper !== undefined ? newSettings.enableWallpaper : prevSettings.enableWallpaper,
        wallpaperOpacity: newSettings.wallpaperOpacity !== undefined ? newSettings.wallpaperOpacity : prevSettings.wallpaperOpacity,
        autoPlayMusic: newSettings.autoPlayMusic !== undefined ? newSettings.autoPlayMusic : prevSettings.autoPlayMusic,
        loopMusic: newSettings.loopMusic !== undefined ? newSettings.loopMusic : prevSettings.loopMusic,
        enableLineAnimation: newSettings.enableLineAnimation !== undefined ? newSettings.enableLineAnimation : prevSettings.enableLineAnimation,
        enableAchievementAnimation: newSettings.enableAchievementAnimation !== undefined ? newSettings.enableAchievementAnimation : prevSettings.enableAchievementAnimation,
        enableLandingEffect: newSettings.enableLandingEffect !== undefined ? newSettings.enableLandingEffect : prevSettings.enableLandingEffect,
      };
      
      // Guests auto-save locally
      if (!user || user.isGuest || !user.id) {
        window.localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
      }
      return updatedSettings;
    });
  }, [setSettings, user]);

  // Force refresh from cloud
  const reloadSettings = useCallback(async () => {
    if (user && !user.isGuest && user.id) {
      await fetchCloudSettings(user.id);
    } else {
      // Guests only refresh locally
      try {
        const item = window.localStorage.getItem('userSettings');
        if (item) {
          setSettings(JSON.parse(item));
        }
      } catch (error) {
        console.error('Error reloading settings:', error);
      }
    }
  }, [user, fetchCloudSettings, setSettings]);

  return {
    settings,
    updateSettings,
    saveSettings,
    reloadSettings,
    loading,
  };
};
