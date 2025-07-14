
import { useEffect } from 'react';
import { toast } from 'sonner';

interface AchievementDetectorProps {
  linesCleared: number;
  tSpinResult: { type: string; isMini: boolean } | null;
  combo: number;
  b2b: number;
  tetris: boolean;
  onAchievement: (achievement: string) => void;
}

export const AchievementDetector: React.FC<AchievementDetectorProps> = ({
  linesCleared,
  tSpinResult,
  combo,
  b2b,
  tetris,
  onAchievement
}) => {
  useEffect(() => {
    // Tetris 成就检测
    if (tetris && linesCleared === 4) {
      if (b2b > 1) {
        onAchievement(`B2B Tetris! ${b2b}x`);
        toast.success(`B2B Tetris! ${b2b}连击`, { duration: 2000 });
      } else {
        onAchievement('Tetris!');
        toast.success('Tetris!', { duration: 2000 });
      }
    }

    // T-Spin 成就检测
    if (tSpinResult) {
      const tSpinName = tSpinResult.isMini ? `T-Spin Mini ${tSpinResult.type}` : `T-Spin ${tSpinResult.type}`;
      if (b2b > 1) {
        onAchievement(`B2B ${tSpinName}! ${b2b}x`);
        toast.success(`B2B ${tSpinName}! ${b2b}连击`, { duration: 2000 });
      } else {
        onAchievement(tSpinName + '!');
        toast.success(tSpinName + '!', { duration: 2000 });
      }
    }

    // Combo 成就检测
    if (combo >= 4) {
      onAchievement(`${combo + 1} Combo!`);
      toast.success(`${combo + 1} 连击!`, { duration: 1500 });
    }

    // B2B 成就检测
    if (b2b >= 3) {
      onAchievement(`Back-to-Back ${b2b}x!`);
      toast.success(`连续特殊消行 ${b2b}次!`, { duration: 1500 });
    }

    // 特殊组合成就
    if (combo >= 6 && (tetris || tSpinResult)) {
      onAchievement('Perfect Clear Combo!');
      toast.success('完美连击组合!', { duration: 3000 });
    }
  }, [linesCleared, tSpinResult, combo, b2b, tetris, onAchievement]);

  return null; // 这是一个逻辑组件，不渲染UI
};

export default AchievementDetector;
