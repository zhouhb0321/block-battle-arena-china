
import { useCallback, useEffect, useState } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { toast } from 'sonner';
import type { GameSettings } from '@/utils/gameTypes';

interface SettingsHint {
  key: keyof GameSettings;
  title: string;
  description: string;
  value: any;
  recommended?: any;
  isRecommended?: boolean;
}

export const useSettingsBinding = () => {
  const { settings, saveSettings } = useUserSettings();
  
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
    controls: userSettings.controls,
    ghostOpacity: userSettings.ghostOpacity,
    enableWallpaper: userSettings.enableWallpaper,
    undoSteps: userSettings.undoSteps,
    wallpaperChangeInterval: userSettings.wallpaperChangeInterval,
  });

  const [tempSettings, setTempSettings] = useState<GameSettings>(() => convertToGameSettings(settings));
  const [hasChanges, setHasChanges] = useState(false);
  const [hints, setHints] = useState<SettingsHint[]>([]);

  // 同步设置到临时状态
  useEffect(() => {
    const gameSettings = convertToGameSettings(settings);
    setTempSettings(gameSettings);
    setHasChanges(false);
    generateHints(gameSettings);
  }, [settings]);

  // 生成智能提示
  const generateHints = useCallback((currentSettings: GameSettings) => {
    const newHints: SettingsHint[] = [];

    // DAS建议
    if (currentSettings.das > 100) {
      newHints.push({
        key: 'das',
        title: 'DAS设置建议',
        description: '您的DAS设置较高，建议降低到67ms以获得更好的手感',
        value: currentSettings.das,
        recommended: 67,
        isRecommended: true
      });
    }

    // ARR建议
    if (currentSettings.arr > 50) {
      newHints.push({
        key: 'arr',
        title: 'ARR设置建议',
        description: '您的ARR设置较高，建议降低到33ms以提高操作流畅度',
        value: currentSettings.arr,
        recommended: 33,
        isRecommended: true
      });
    }

    // 音量建议
    if (currentSettings.masterVolume > 80) {
      newHints.push({
        key: 'masterVolume',
        title: '音量建议',
        description: '主音量过高可能影响听觉体验，建议调整到50-70之间',
        value: currentSettings.masterVolume,
        recommended: 60,
        isRecommended: false
      });
    }

    // 幽灵方块建议
    if (!currentSettings.enableGhost) {
      newHints.push({
        key: 'enableGhost',
        title: '幽灵方块建议',
        description: '开启幽灵方块可以帮助您更准确地放置方块',
        value: currentSettings.enableGhost,
        recommended: true,
        isRecommended: true
      });
    }

    setHints(newHints);
  }, []);

  // 批量更新设置
  const updateSetting = useCallback((key: keyof GameSettings, value: any) => {
    const newSettings = { ...tempSettings, [key]: value };
    setTempSettings(newSettings);
    setHasChanges(true);
    generateHints(newSettings);
  }, [tempSettings]);

  // 应用推荐设置
  const applyRecommendation = useCallback((hint: SettingsHint) => {
    if (hint.recommended !== undefined) {
      updateSetting(hint.key as keyof GameSettings, hint.recommended);
      toast.success(`已应用推荐设置: ${hint.title}`);
    }
  }, [updateSetting]);

  // 保存设置
  const commitSettings = useCallback(async () => {
    try {
      await saveSettings(tempSettings);
      setHasChanges(false);
      toast.success('设置已保存');
    } catch (error) {
      console.error('保存设置失败:', error);
      toast.error('保存设置失败');
    }
  }, [tempSettings, saveSettings]);

  // 重置设置
  const resetSettings = useCallback(() => {
    const gameSettings = convertToGameSettings(settings);
    setTempSettings(gameSettings);
    setHasChanges(false);
    generateHints(gameSettings);
    toast.info('设置已重置');
  }, [settings]);

  // 应用所有推荐设置
  const applyAllRecommendations = useCallback(() => {
    const recommendedHints = hints.filter(hint => hint.isRecommended);
    let newSettings = { ...tempSettings };
    
    recommendedHints.forEach(hint => {
      if (hint.recommended !== undefined) {
        (newSettings as any)[hint.key] = hint.recommended;
      }
    });

    setTempSettings(newSettings);
    setHasChanges(true);
    generateHints(newSettings);
    toast.success(`已应用${recommendedHints.length}项推荐设置`);
  }, [hints, tempSettings]);

  return {
    settings: tempSettings,
    hasChanges,
    loading: false,
    hints,
    updateSetting,
    commitSettings,
    resetSettings,
    applyRecommendation,
    applyAllRecommendations
  };
};
