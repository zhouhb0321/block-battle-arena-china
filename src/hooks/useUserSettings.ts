
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

  // 保存设置到云端
  const saveSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    setSettings(prevSettings => {
      const merged = { ...prevSettings, ...newSettings };
      // 游客只存本地
      if (!user || user.isGuest || !user.id) {
        window.localStorage.setItem('userSettings', JSON.stringify(merged));
        return merged;
      }
      // 登录用户同步到云端
      const dbSettings: any = {
        enable_ghost: merged.enableGhost,
        enable_sound: merged.enableSound,
        master_volume: merged.masterVolume,
        music_volume: merged.musicVolume,
        background_music: merged.backgroundMusic,
        arr: merged.arr,
        das: merged.das,
        sdf: merged.sdf,
        controls: merged.controls,
        ghost_opacity: merged.ghostOpacity,
        back_to_menu: merged.controls.backToMenu,
        block_skin: merged.blockSkin ?? 'wood',
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
      window.localStorage.setItem('userSettings', JSON.stringify(merged));
      return merged;
    });
  }, [setSettings, user]);

  // 只更新本地（如游客）
  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettings(prevSettings => {
      const updatedSettings = { ...prevSettings, ...newSettings };
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
