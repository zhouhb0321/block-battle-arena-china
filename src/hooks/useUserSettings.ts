
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { GameSettings } from '@/utils/gameTypes';

const defaultSettings: GameSettings = {
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
    pause: 'Escape'
  },
  enableGhost: true,
  enableSound: true,
  masterVolume: 50
};

export const useUserSettings = () => {
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // 加载用户设置
  const loadSettings = async () => {
    if (!user || user.isGuest) {
      // 游客用户使用localStorage
      const savedSettings = localStorage.getItem('tetris_settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings({ ...defaultSettings, ...parsed });
        } catch (error) {
          console.error('Failed to parse saved settings:', error);
        }
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
        setLoading(false);
        return;
      }

      if (data) {
        setSettings({
          das: data.das,
          arr: data.arr,
          sdf: data.sdf,
          controls: data.controls,
          enableGhost: data.enable_ghost,
          enableSound: data.enable_sound,
          masterVolume: data.master_volume
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    
    setLoading(false);
  };

  // 保存用户设置
  const saveSettings = async (newSettings: Partial<GameSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    if (!user || user.isGuest) {
      // 游客用户保存到localStorage
      localStorage.setItem('tetris_settings', JSON.stringify(updatedSettings));
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
          master_volume: updatedSettings.masterVolume
        });

      if (error) {
        console.error('Error saving settings:', error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [user]);

  return {
    settings,
    saveSettings,
    loading
  };
};
