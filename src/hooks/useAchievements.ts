
import { useState, useCallback } from 'react';

export interface Achievement {
  id: string;
  text: string;
  type: 'tetris' | 'tspin' | 'combo' | 'perfect' | 'level' | 'clear';
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

    setAchievements(prev => {
      // 避免重复刷旧成就
      const last = prev[prev.length - 1];
      if (last && last.text === text && (Date.now() - last.timestamp) < 300) {
        return prev;
      }
      // 只保留最新的一个成就，清除所有旧成就
      return [newAchievement];
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

  // 修复Combo显示 - 每次combo都显示，从1开始
  const showCombo = useCallback((comboCount: number) => {
    if (comboCount >= 1 && comboCount <= 100) {
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

  // 普通消行成就（Single/Double/Triple）
  const showLineClear = useCallback((lines: number, isB2B = false, b2bCount?: number) => {
    const clearType = lines === 1 ? 'SINGLE' : 
                      lines === 2 ? 'DOUBLE' : 
                      lines === 3 ? 'TRIPLE' : '';
    if (!clearType) return;
    
    const prefix = isB2B && b2bCount && b2bCount > 1 ? `B2B x${b2bCount} ` : '';
    addAchievement(`${prefix}${clearType}`, 'clear');
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
    showLevelUp,
    showLineClear
  };
};
