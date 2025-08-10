
// TETR.IO 积分系统
export const calculateScore = (
  action: {
    linesCleared: number;
    tSpin: 'none' | 'mini' | 'normal';
    isB2B: boolean;
    combo: number; // 从0开始计数
    isPerfectClear: boolean;
  }
): { score: number; isDifficult: boolean } => {
  const { linesCleared, tSpin, isB2B, combo, isPerfectClear } = action;
  let baseScore = 0;
  let isDifficultAction = false;

  if (tSpin !== 'none') {
    isDifficultAction = true;
    switch (linesCleared) {
      case 0: // T-Spin
        baseScore = tSpin === 'mini' ? 100 : 400;
        break;
      case 1: // T-Spin Single
        baseScore = tSpin === 'mini' ? 200 : 800;
        break;
      case 2: // T-Spin Double
        baseScore = tSpin === 'mini' ? 400 : 1200;
        break;
      case 3: // T-Spin Triple
        baseScore = 1600;
        break;
    }
  } else {
    switch (linesCleared) {
      case 1: baseScore = 100; break; // 消一
      case 2: baseScore = 300; break; // 消二
      case 3: baseScore = 500; break; // 消三
      case 4: baseScore = 800; isDifficultAction = true; break; // 消四 (Tetris)
    }
  }

  let finalScore = baseScore;

  // 背靠背 (B2B) 奖励
  if (isDifficultAction && isB2B) {
    finalScore = Math.floor(baseScore * 1.5);
  }

  // 连击 (Combo) 奖励
  if (combo > 0) {
    finalScore += 50 * combo;
  }

  // 全清 (Perfect Clear) 奖励
  if (isPerfectClear) {
    finalScore += 3500;
  }

  return { score: finalScore, isDifficult: isDifficultAction };
};

// 计算攻击行数 - 修正参数数量
export const calculateAttackLines = (
  linesCleared: number,
  tSpin: { type: string; isMini: boolean } | null,
  b2b: boolean,
  combo: number
): number => {
  let attack = 0;

  if (tSpin) {
    if (tSpin.isMini) {
      attack += b2b ? 1 : 0; // Mini T-Spin
    } else {
      attack += b2b ? 4 : 2; // Regular T-Spin
    }
  } else {
    switch (linesCleared) {
      case 1:
        attack += 0;
        break;
      case 2:
        attack += 1;
        break;
      case 3:
        attack += 2;
        break;
      case 4:
        attack += b2b ? 5 : 4;
        break;
      default:
        break;
    }
  }

  if (combo > 1) {
    attack += comboMatrix[Math.min(combo, comboMatrix.length - 1)]; // 连击奖励
  }

  return attack;
};

// 连击奖励矩阵
const comboMatrix = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5];
