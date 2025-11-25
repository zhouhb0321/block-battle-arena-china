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
  dcd: number;
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
  undoSteps: number;
  wallpaperChangeInterval: number;
}

const DEFAULT_GUEST_SETTINGS: UserSettings = {
  enableGhost: true,
  enableSound: true,
  masterVolume: 50,
  musicVolume: 30,
  backgroundMusic: '',
  arr: 20, // ✅ 调整为现代标准 20ms
  das: 133,
  sdf: 20, // ✅ 调整为现代标准 20ms
  dcd: 0, // DAS Cut Delay disabled by default
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
  undoSteps: 50,
  wallpaperChangeInterval: 120,
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

  // Fetch cloud settings with enhanced debugging
  const fetchCloudSettings = useCallback(async (uid: string) => {
    console.log('fetchCloudSettings: 开始获取云端设置', { uid });
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', uid)
        .single();
      
      if (error) {
        console.error('fetchCloudSettings: 获取云端设置失败', error);
        throw error;
      }
      
      if (data) {
        console.log('fetchCloudSettings: 获取到云端设置数据', { 
          controls: data.controls,
          arr: data.arr,
          das: data.das,
          sdf: data.sdf
        });
        
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
          dcd: data.dcd ?? DEFAULT_GUEST_SETTINGS.dcd,
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
          undoSteps: data.undo_steps ?? 50,
          wallpaperChangeInterval: data.wallpaper_change_interval ?? 120,
        };
        
        console.log('fetchCloudSettings: 设置转换完成', { 
          cloudSettings: cloudSettings.controls,
          originalControls: data.controls
        });
        
        setSettings(cloudSettings);
        window.localStorage.setItem('userSettings', JSON.stringify(cloudSettings));
        console.log('fetchCloudSettings: 云端设置应用成功');
      } else {
        console.log('fetchCloudSettings: 未找到云端设置数据');
      }
    } catch (error) {
      console.error('fetchCloudSettings: 获取云端设置时发生错误', error);
    } finally {
      setLoading(false);
    }
  }, [setSettings]);

  // Auto-fetch cloud settings after login with debug logging
  useEffect(() => {
    console.log('useUserSettings: 用户状态变化检测', { 
      hasUser: !!user, 
      isGuest: user?.isGuest, 
      userId: user?.id 
    });
    
    if (user && !user.isGuest && user.id) {
      console.log('useUserSettings: 开始加载云端设置', { userId: user.id });
      fetchCloudSettings(user.id);
    } else if (user?.isGuest) {
      console.log('useUserSettings: 访客用户，使用本地设置');
    } else {
      console.log('useUserSettings: 无用户或用户ID，保持默认设置');
    }
  }, [user, fetchCloudSettings]);

  // Listen for external settings reload triggers
  useEffect(() => {
    const handleSettingsReload = (event: CustomEvent) => {
      console.log('useUserSettings: 收到设置重新加载信号', event.detail);
      const { userId, isGuest } = event.detail;
      if (userId && !isGuest) {
        console.log('useUserSettings: 触发云端设置重新加载', { userId });
        fetchCloudSettings(userId);
      }
    };

    window.addEventListener('userSettingsReload', handleSettingsReload as EventListener);
    return () => {
      window.removeEventListener('userSettingsReload', handleSettingsReload as EventListener);
    };
  }, [fetchCloudSettings]);

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
        dcd: newSettings.dcd !== undefined ? newSettings.dcd : prevSettings.dcd,
        controls: newSettings.controls !== undefined ? newSettings.controls : prevSettings.controls,
        ghostOpacity: newSettings.ghostOpacity !== undefined ? newSettings.ghostOpacity : prevSettings.ghostOpacity,
        blockSkin: newSettings.blockSkin !== undefined ? newSettings.blockSkin : prevSettings.blockSkin,
        enableWallpaper: newSettings.enableWallpaper !== undefined ? newSettings.enableWallpaper : prevSettings.enableWallpaper,
        undoSteps: newSettings.undoSteps !== undefined ? newSettings.undoSteps : prevSettings.undoSteps,
        wallpaperChangeInterval: newSettings.wallpaperChangeInterval !== undefined ? newSettings.wallpaperChangeInterval : prevSettings.wallpaperChangeInterval,
      };
      
      // 先保存到本地存储（访客和注册用户都需要）
      try {
        window.localStorage.setItem('userSettings', JSON.stringify(mergedSettings));
        console.log('设置已保存到本地存储');
      } catch (error) {
        console.error('保存到本地存储失败:', error);
      }
      
      // 只有注册用户才同步到云端
      if (user && !user.isGuest && user.id) {
        const dbSettings = {
          enable_ghost: mergedSettings.enableGhost,
          enable_sound: mergedSettings.enableSound,
          master_volume: mergedSettings.masterVolume,
          music_volume: mergedSettings.musicVolume,
          background_music: mergedSettings.backgroundMusic,
          arr: mergedSettings.arr,
          das: mergedSettings.das,
          sdf: mergedSettings.sdf,
          dcd: mergedSettings.dcd,
          controls: mergedSettings.controls,
          ghost_opacity: mergedSettings.ghostOpacity,
          back_to_menu: mergedSettings.controls.backToMenu,
          block_skin: mergedSettings.blockSkin || 'wood',
          enable_wallpaper: mergedSettings.enableWallpaper,
          undo_steps: mergedSettings.undoSteps,
          wallpaper_change_interval: mergedSettings.wallpaperChangeInterval,
        };
        
        supabase
          .from('user_settings')
          .update(dbSettings)
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error) {
              console.error('Failed to save cloud settings:', error);
            } else {
              console.log('设置已同步到云端');
            }
          });
      } else {
        console.log('访客用户设置仅保存到本地');
      }
      
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
        dcd: newSettings.dcd !== undefined ? newSettings.dcd : prevSettings.dcd,
        controls: newSettings.controls !== undefined ? newSettings.controls : prevSettings.controls,
        ghostOpacity: newSettings.ghostOpacity !== undefined ? newSettings.ghostOpacity : prevSettings.ghostOpacity,
        blockSkin: newSettings.blockSkin !== undefined ? newSettings.blockSkin : prevSettings.blockSkin,
        enableWallpaper: newSettings.enableWallpaper !== undefined ? newSettings.enableWallpaper : prevSettings.enableWallpaper,
        undoSteps: newSettings.undoSteps !== undefined ? newSettings.undoSteps : prevSettings.undoSteps,
        wallpaperChangeInterval: newSettings.wallpaperChangeInterval !== undefined ? newSettings.wallpaperChangeInterval : prevSettings.wallpaperChangeInterval,
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
