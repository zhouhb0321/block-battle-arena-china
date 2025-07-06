
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
  blockSkin: 'wood'
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

  // 拉取云端设置
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
        // 转换数据库字段为 UserSettings
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
            ...data.controls,
            backToMenu: data.back_to_menu ?? 'KeyB',
          },
          ghostOpacity: data.ghost_opacity ?? 50,
          blockSkin: data.block_skin ?? 'wood',
        };
        setSettings(cloudSettings);
        window.localStorage.setItem('userSettings', JSON.stringify(cloudSettings));
      }
    } catch (error) {
      console.error('拉取云端设置失败:', error);
    } finally {
      setLoading(false);
    }
  }, [setSettings]);

  // 登录后自动拉取云端设置
  useEffect(() => {
    if (user && !user.isGuest && user.id) {
      fetchCloudSettings(user.id);
    }
  }, [user, fetchCloudSettings]);

  // 保存设置到云端 - 完全重写避免spread运算符
  const saveSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    // 验证输入参数
    if (!newSettings || typeof newSettings !== 'object' || Array.isArray(newSettings)) {
      console.error('Invalid settings provided');
      return;
    }

    setSettings(prevSettings => {
      // 使用Object.assign创建新对象，完全避免spread操作
      const mergedSettings = Object.assign({}, prevSettings);
      
      // 逐个检查并更新属性
      if (newSettings.enableGhost !== undefined) mergedSettings.enableGhost = newSettings.enableGhost;
      if (newSettings.enableSound !== undefined) mergedSettings.enableSound = newSettings.enableSound;
      if (newSettings.masterVolume !== undefined) mergedSettings.masterVolume = newSettings.masterVolume;
      if (newSettings.musicVolume !== undefined) mergedSettings.musicVolume = newSettings.musicVolume;
      if (newSettings.backgroundMusic !== undefined) mergedSettings.backgroundMusic = newSettings.backgroundMusic;
      if (newSettings.arr !== undefined) mergedSettings.arr = newSettings.arr;
      if (newSettings.das !== undefined) mergedSettings.das = newSettings.das;
      if (newSettings.sdf !== undefined) mergedSettings.sdf = newSettings.sdf;
      if (newSettings.controls !== undefined) mergedSettings.controls = newSettings.controls;
      if (newSettings.ghostOpacity !== undefined) mergedSettings.ghostOpacity = newSettings.ghostOpacity;
      if (newSettings.blockSkin !== undefined) mergedSettings.blockSkin = newSettings.blockSkin;
      
      // 游客只存本地
      if (!user || user.isGuest || !user.id) {
        window.localStorage.setItem('userSettings', JSON.stringify(mergedSettings));
        return mergedSettings;
      }
      
      // 登录用户同步到云端
      const dbSettings: any = {
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
        block_skin: mergedSettings.blockSkin ?? 'wood',
      };
      
      supabase
        .from('user_settings')
        .update(dbSettings)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('云端设置保存失败:', error);
          }
        });
      
      window.localStorage.setItem('userSettings', JSON.stringify(mergedSettings));
      return mergedSettings;
    });
  }, [setSettings, user]);

  // 只更新本地（如游客）- 完全重写避免spread运算符
  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    // 验证输入参数
    if (!newSettings || typeof newSettings !== 'object' || Array.isArray(newSettings)) {
      console.error('Invalid settings provided');
      return;
    }

    setSettings(prevSettings => {
      // 使用Object.assign创建新对象，完全避免spread操作
      const updatedSettings = Object.assign({}, prevSettings);
      
      // 逐个检查并更新属性
      if (newSettings.enableGhost !== undefined) updatedSettings.enableGhost = newSettings.enableGhost;
      if (newSettings.enableSound !== undefined) updatedSettings.enableSound = newSettings.enableSound;
      if (newSettings.masterVolume !== undefined) updatedSettings.masterVolume = newSettings.masterVolume;
      if (newSettings.musicVolume !== undefined) updatedSettings.musicVolume = newSettings.musicVolume;
      if (newSettings.backgroundMusic !== undefined) updatedSettings.backgroundMusic = newSettings.backgroundMusic;
      if (newSettings.arr !== undefined) updatedSettings.arr = newSettings.arr;
      if (newSettings.das !== undefined) updatedSettings.das = newSettings.das;
      if (newSettings.sdf !== undefined) updatedSettings.sdf = newSettings.sdf;
      if (newSettings.controls !== undefined) updatedSettings.controls = newSettings.controls;
      if (newSettings.ghostOpacity !== undefined) updatedSettings.ghostOpacity = newSettings.ghostOpacity;
      if (newSettings.blockSkin !== undefined) updatedSettings.blockSkin = newSettings.blockSkin;
      
      // 游客自动存本地
      if (!user || user.isGuest || !user.id) {
        window.localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
      }
      return updatedSettings;
    });
  }, [setSettings, user]);

  // 强制从云端刷新
  const reloadSettings = useCallback(async () => {
    if (user && !user.isGuest && user.id) {
      await fetchCloudSettings(user.id);
    } else {
      // 游客只刷新本地
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
