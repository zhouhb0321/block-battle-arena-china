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

  // 便捷方法 - 简化成就文本格式
  const showTetris = useCallback((isTSpin = false, isB2B = false) => {
    let text = isTSpin ? 'T4' : 'TETRIS';
    if (isB2B) text = `B2B ${text}`;
    addAchievement(text, 'tetris');
  }, [addAchievement]);

  const showTSpin = useCallback((lines: number, isMini = false, isB2B = false) => {
    // 简化格式：T1 (T-Spin Single), T2 (T-Spin Double), T3 (T-Spin Triple)
    let text = `T${lines}`;
    if (isMini) text = `MINI ${text}`;
    if (isB2B) text = `B2B ${text}`;
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