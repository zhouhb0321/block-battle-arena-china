
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { GameSettings } from '@/utils/gameTypes';
import { toast } from 'sonner';

const DEFAULT_SETTINGS: GameSettings = {
  das: 167,
  arr: 33,
  sdf: 20,
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
    backToMenu: 'KeyB'
  },
  enableGhost: true,
  enableSound: true,
  masterVolume: 50,
  backgroundMusic: '',
  musicVolume: 30,
  ghostOpacity: 50
};

export const useUserSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    setLoading(true);
    
    if (!user || user.isGuest) {
      const savedSettings = localStorage.getItem('tetris_settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch (error) {
          console.error('Error parsing saved settings:', error);
          setSettings(DEFAULT_SETTINGS);
        }
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
        setSettings(DEFAULT_SETTINGS);
        setLoading(false);
        return;
      }

      if (data) {
        const loadedSettings: GameSettings = {
          das: data.das,
          arr: data.arr,
          sdf: data.sdf,
          controls: data.controls as any,
          enableGhost: data.enable_ghost,
          enableSound: data.enable_sound,
          masterVolume: data.master_volume,
          backgroundMusic: data.background_music || '',
          musicVolume: data.music_volume || 30,
          ghostOpacity: data.ghost_opacity || 50
        };
        setSettings(loadedSettings);
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<GameSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    if (!user || user.isGuest) {
      localStorage.setItem('tetris_settings', JSON.stringify(updatedSettings));
      toast.success('设置已保存到本地');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          das: updatedSettings.das,
          arr: updatedSettings.arr,
          sdf: updatedSettings.sdf,
          controls: updatedSettings.controls,
          enable_ghost: updatedSettings.enableGhost,
          enable_sound: updatedSettings.enableSound,
          master_volume: updatedSettings.masterVolume,
          background_music: updatedSettings.backgroundMusic,
          music_volume: updatedSettings.musicVolume,
          ghost_opacity: updatedSettings.ghostOpacity
        });

      if (error) {
        console.error('Error saving settings:', error);
        toast.error('保存设置失败: ' + error.message);
        throw error;
      } else {
        toast.success('设置已成功保存');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('保存设置时出现错误');
      throw error;
    }
  };

  return {
    settings,
    saveSettings,
    loading,
    reloadSettings: loadSettings
  };
};
