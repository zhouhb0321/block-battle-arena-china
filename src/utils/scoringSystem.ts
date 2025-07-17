
// 计算得分 - 修正参数数量
export const calculateScore = (
  linesCleared: number,
  level: number,
  tSpin: { type: string; isMini: boolean } | null,
  b2b: boolean,
  combo: number,
  isPerfectClear: boolean
): number => {
  let score = 0;

  if (isPerfectClear) {
    score += 3500; // 全清奖励
  }

  if (tSpin) {
    if (tSpin.isMini) {
      score += level * (b2b ? 100 : 800); // Mini T-Spin
    } else {
      score += level * (b2b ? 1200 : 400); // Regular T-Spin
    }
  } else {
    switch (linesCleared) {
      case 1:
        score += 100 * level;
        break;
      case 2:
        score += 300 * level;
        break;
      case 3:
        score += 500 * level;
        break;
      case 4:
        score += 800 * level;
        break;
      default:
        break;
    }
  }

  if (combo > 0) {
    score += 50 * combo * level; // 连击奖励
  }

  return score;
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
