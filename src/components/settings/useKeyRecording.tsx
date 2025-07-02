
import { useState, useEffect } from 'react';
import type { GameSettings } from '@/utils/gameTypes';

export const useKeyRecording = (
  tempSettings: GameSettings,
  updateSetting: (key: keyof GameSettings, value: any) => void,
  setHasChanges: () => void
) => {
  const [recordingKey, setRecordingKey] = useState<string | null>(null);

  const handleControlChange = (controlName: string, keyCode: string) => {
    // Check if this key is already used by another control
    const existingControl = Object.entries(tempSettings.controls).find(
      ([key, value]) => key !== controlName && value === keyCode
    );

    if (existingControl) {
      // Swap the keys
      const [existingKey] = existingControl;
      const oldKeyCode = tempSettings.controls[controlName as keyof typeof tempSettings.controls];
      
      const newControls = {
        ...tempSettings.controls,
        [controlName]: keyCode,
        [existingKey]: oldKeyCode
      };
      
      updateSetting('controls', newControls);
    } else {
      const newControls = { ...tempSettings.controls, [controlName]: keyCode };
      updateSetting('controls', newControls);
    }
    
    setHasChanges();
  };

  const handleKeyRecord = (controlName: string) => {
    setRecordingKey(controlName);
    
    const handleKeyPress = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      handleControlChange(controlName, e.code);
      setRecordingKey(null);
      
      document.removeEventListener('keydown', handleKeyPress);
    };
    
    document.addEventListener('keydown', handleKeyPress, { once: true });
    
    setTimeout(() => {
      setRecordingKey(null);
      document.removeEventListener('keydown', handleKeyPress);
    }, 5000);
  };

  return {
    recordingKey,
    handleKeyRecord
  };
};
