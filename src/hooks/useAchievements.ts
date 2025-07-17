import { useState, useCallback } from 'react';

export interface Achievement {
  id: string;
  text: string;
  type: 'tetris' | 'tspin' | 'combo' | 'perfect' | 'level';
  timestamp: number;
}

export const useAchievements = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const addAchievement = useCallback((text: string, type: Achievement['type']) => {
    const newAchievement: Achievement = {
      id: `${Date.now()}-${Math.random()}`,
      text,
      type,
      timestamp: Date.now()
    };

    setAchievements(prev => [...prev, newAchievement]);
  }, []);

  const removeAchievement = useCallback((id: string) => {
    setAchievements(prev => prev.filter(achievement => achievement.id !== id));
  }, []);

  const clearAchievements = useCallback(() => {
    setAchievements([]);
  }, []);

  // 便捷方法
  const showTetris = useCallback((isTSpin = false, isB2B = false) => {
    let text = isTSpin ? 'T-SPIN QUAD' : 'TETRIS';
    if (isB2B) text = `${text} B2B`;
    addAchievement(text, 'tetris');
  }, [addAchievement]);

  const showTSpin = useCallback((lines: number, isMini = false, isB2B = false) => {
    const miniText = isMini ? 'MINI ' : '';
    const lineText = lines === 1 ? 'SINGLE' : lines === 2 ? 'DOUBLE' : 'TRIPLE';
    let text = `T-SPIN ${miniText}${lineText}`;
    if (isB2B) text = `${text} B2B`;
    addAchievement(text, 'tspin');
  }, [addAchievement]);

  const showCombo = useCallback((comboCount: number) => {
    addAchievement(`${comboCount} COMBO`, 'combo');
  }, [addAchievement]);

  const showPerfectClear = useCallback(() => {
    addAchievement('PERFECT CLEAR!', 'perfect');
  }, [addAchievement]);

  const showLevelUp = useCallback((level: number) => {
    addAchievement(`LEVEL ${level}`, 'level');
  }, [addAchievement]);

  return {
    achievements,
    removeAchievement,
    clearAchievements,
    showTetris,
    showTSpin,
    showCombo,
    showPerfectClear,
    showLevelUp
  };
};