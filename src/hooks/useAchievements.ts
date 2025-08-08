
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
    setAchievements(prev => {
      const now = Date.now();

      // 优化：处理Combo和B2B的叠加显示
      if (type === 'combo' || (type === 'tspin' && text.includes('B2B')) || (type === 'tetris' && text.includes('B2B'))) {
        const existingIndex = prev.findIndex(a => a.type === type || (a.type === 'tspin' && type === 'tetris') || (a.type === 'tetris' && type === 'tspin'));

        if (existingIndex !== -1) {
          const updatedAchievements = [...prev];
          updatedAchievements[existingIndex] = {
            ...updatedAchievements[existingIndex],
            id: `${Date.now()}-${Math.random()}`, // 更新ID以重新触发动画
            text,
            timestamp: now
          };
          return updatedAchievements;
        }
      }

      const newAchievement: Achievement = {
        id: `${Date.now()}-${Math.random()}`,
        text,
        type,
        timestamp: now
      };

      // 避免快速重复完全相同的成就
      const last = prev[prev.length - 1];
      if (last && last.text === text && last.type === type && (now - last.timestamp) < 500) {
        return prev;
      }

      return [...prev, newAchievement];
    });
  }, []);

  const removeAchievement = useCallback((id: string) => {
    setAchievements(prev => prev.filter(achievement => achievement.id !== id));
  }, []);

  const clearAchievements = useCallback(() => {
    setAchievements([]);
  }, []);

  // 便捷方法 - 修复格式并简化
  const showTetris = useCallback((isTSpin = false, isB2B = false, b2bCount?: number) => {
    let prefix = '';
    if (isB2B) {
      prefix = b2bCount && b2bCount > 0 ? `B2B x${b2bCount} ` : 'B2B ';
    }
    const core = isTSpin ? 'T-SPIN TETRIS' : 'TETRIS';
    addAchievement(`${prefix}${core}`, 'tetris');
  }, [addAchievement]);

  const showTSpin = useCallback((lines: number, isMini = false, isB2B = false, b2bCount?: number) => {
    let text = '';
    if (isMini) {
      text = `MINI T-SPIN`;
      if (lines > 0) text += ` ${lines === 1 ? 'SINGLE' : lines === 2 ? 'DOUBLE' : 'TRIPLE'}`;
    } else {
      text = `T-SPIN`;
      if (lines > 0) text += ` ${lines === 1 ? 'SINGLE' : lines === 2 ? 'DOUBLE' : 'TRIPLE'}`;
    }
    if (isB2B) {
      text = b2bCount && b2bCount > 0 ? `B2B x${b2bCount} ${text}` : `B2B ${text}`;
    }
    console.log(`显示T-Spin成就: ${text}, 消除行数: ${lines}`);
    addAchievement(text, 'tspin');
  }, [addAchievement]);

  // 修复Combo显示 - 每次combo都显示，最大100
  const showCombo = useCallback((comboCount: number) => {
    if (comboCount > 0 && comboCount <= 100) {
      addAchievement(`COMBO x${comboCount}`, 'combo');
    }
  }, [addAchievement]);

  const showPerfectClear = useCallback(() => {
    addAchievement('PERFECT CLEAR!', 'perfect');
  }, [addAchievement]);

  const showLevelUp = useCallback((level: number) => {
    addAchievement(`LEVEL ${level}`, 'level');
  }, [addAchievement]);

  // 通用旋转成就（L/J/S/Z/I 等）
  const showSpin = useCallback((piece: string, lines: number, isB2B = false, b2bCount?: number) => {
    let core = `${piece.toUpperCase()}-SPIN`;
    if (lines > 0) core += ` ${lines === 1 ? 'SINGLE' : lines === 2 ? 'DOUBLE' : 'TRIPLE'}`;
    const prefix = isB2B ? (b2bCount && b2bCount > 0 ? `B2B x${b2bCount} ` : 'B2B ') : '';
    addAchievement(`${prefix}${core}`,'tspin');
  }, [addAchievement]);

  return {
    achievements,
    removeAchievement,
    clearAchievements,
    showTetris,
    showTSpin,
    showSpin,
    showCombo,
    showPerfectClear,
    showLevelUp
  };
};
