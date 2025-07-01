
// 重力系统 - 根据标准俄罗斯方块重力表
export interface GravityLevel {
  level: number;
  requiredLines: number;
  totalLines: number;
  gravity: number; // G值
  dropTime: number; // 秒每行
}

export const GRAVITY_LEVELS: GravityLevel[] = [
  { level: 1, requiredLines: 3, totalLines: 3, gravity: 0.0167, dropTime: 1.0 },
  { level: 2, requiredLines: 5, totalLines: 8, gravity: 0.0259, dropTime: 0.643 },
  { level: 3, requiredLines: 7, totalLines: 15, gravity: 0.0412, dropTime: 0.404 },
  { level: 4, requiredLines: 9, totalLines: 24, gravity: 0.0670, dropTime: 0.249 },
  { level: 5, requiredLines: 11, totalLines: 35, gravity: 0.111, dropTime: 0.150 },
  { level: 6, requiredLines: 13, totalLines: 48, gravity: 0.189, dropTime: 0.0880 },
  { level: 7, requiredLines: 15, totalLines: 63, gravity: 0.330, dropTime: 0.0505 },
  { level: 8, requiredLines: 17, totalLines: 80, gravity: 0.588, dropTime: 0.0283 },
  { level: 9, requiredLines: 19, totalLines: 99, gravity: 1.08, dropTime: 0.0155 },
  { level: 10, requiredLines: 21, totalLines: 120, gravity: 2.01, dropTime: 0.00827 },
  { level: 11, requiredLines: 24, totalLines: 144, gravity: 3.87, dropTime: 0.00431 },
  { level: 12, requiredLines: 26, totalLines: 170, gravity: 7.62, dropTime: 0.00219 },
  { level: 13, requiredLines: 28, totalLines: 198, gravity: 15.4, dropTime: 0.00108 },
  { level: 14, requiredLines: 30, totalLines: 228, gravity: 20, dropTime: 0.00052 },
  { level: 15, requiredLines: 32, totalLines: 260, gravity: 20, dropTime: 0.00024 }
];

export const calculateGravityLevel = (totalLines: number): GravityLevel => {
  for (let i = GRAVITY_LEVELS.length - 1; i >= 0; i--) {
    if (totalLines >= GRAVITY_LEVELS[i].totalLines) {
      return GRAVITY_LEVELS[i];
    }
  }
  return GRAVITY_LEVELS[0];
};

export const calculateDropSpeed = (totalLines: number): number => {
  const gravityLevel = calculateGravityLevel(totalLines);
  // 将G值转换为毫秒间隔
  // G值表示每帧下降的行数（60fps）
  // 转换为毫秒：(1 / (G * 60)) * 1000
  if (gravityLevel.gravity >= 1) {
    // 当G值>=1时，每帧下降多行，计算变复杂
    return Math.max(16, 1000 / (gravityLevel.gravity * 60));
  } else {
    // 当G值<1时，多帧下降一行
    return Math.max(16, gravityLevel.dropTime * 1000);
  }
};

export const getGravityInfo = (totalLines: number) => {
  const gravityLevel = calculateGravityLevel(totalLines);
  return {
    level: gravityLevel.level,
    gravity: gravityLevel.gravity,
    dropSpeed: calculateDropSpeed(totalLines),
    requiredForNext: GRAVITY_LEVELS[gravityLevel.level]?.totalLines || null
  };
};
