
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

  // 便捷方法 - 修复格式并简化
  const showTetris = useCallback((isTSpin = false, isB2B = false) => {
    let text = isTSpin ? 'T-SPIN TETRIS' : 'TETRIS';
    if (isB2B) text = `B2B ${text}`;
    addAchievement(text, 'tetris');
  }, [addAchievement]);

  const showTSpin = useCallback((lines: number, isMini = false, isB2B = false) => {
    let text = '';
    if (isMini) {
      text = `MINI T-SPIN`;
      if (lines > 0) text += ` ${lines === 1 ? 'SINGLE' : lines === 2 ? 'DOUBLE' : 'TRIPLE'}`;
    } else {
      text = `T-SPIN`;
      if (lines > 0) text += ` ${lines === 1 ? 'SINGLE' : lines === 2 ? 'DOUBLE' : 'TRIPLE'}`;
    }
    if (isB2B) text = `B2B ${text}`;
    
    // 修复：确保成就实时更新
    console.log(`显示T-Spin成就: ${text}, 消除行数: ${lines}`);
    addAchievement(text, 'tspin');
  }, [addAchievement]);

  // 修复Combo显示 - 每次combo都显示，最大100
  const showCombo = useCallback((comboCount: number) => {
    if (comboCount > 0 && comboCount <= 100) {
      // 修复：显示正确的combo格式
      addAchievement(`COMBO ${comboCount}`, 'combo');
    }
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
