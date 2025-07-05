
import { useState, useEffect, useCallback } from 'react';

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
  const [settings, setSettings] = useLocalStorage<UserSettings>('userSettings', DEFAULT_GUEST_SETTINGS);

  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettings(prevSettings => ({ ...prevSettings, ...newSettings }));
  }, [setSettings]);

  const saveSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    updateSettings(newSettings);
  }, [updateSettings]);

  const reloadSettings = useCallback(async () => {
    try {
      const item = window.localStorage.getItem('userSettings');
      if (item) {
        setSettings(JSON.parse(item));
      }
    } catch (error) {
      console.error("Error reloading settings:", error);
    }
  }, [setSettings]);

  return { 
    settings, 
    updateSettings,
    saveSettings,
    reloadSettings
  };
};
