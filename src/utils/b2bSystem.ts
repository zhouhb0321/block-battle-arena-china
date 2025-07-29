
// B2B奖励系统
export interface B2BReward {
  minCount: number;
  maxCount: number;
  displayText: string;
  attackBonus: number;
}

export const B2B_REWARDS: B2BReward[] = [
  { minCount: 0, maxCount: 1, displayText: '', attackBonus: 0 },
  { minCount: 2, maxCount: 3, displayText: 'B2B x1 - B2B x2', attackBonus: 1 },
  { minCount: 4, maxCount: 8, displayText: 'B2B x3 - B2B x7', attackBonus: 2 },
  { minCount: 9, maxCount: 24, displayText: 'B2B x8 - B2B x23', attackBonus: 3 },
  { minCount: 25, maxCount: 67, displayText: 'B2B x24 - B2B x66', attackBonus: 4 },
  { minCount: 68, maxCount: 999, displayText: 'B2B x67+', attackBonus: 5 }
];

export const getB2BReward = (b2bCount: number): B2BReward => {
  for (const reward of B2B_REWARDS) {
    if (b2bCount >= reward.minCount && b2bCount <= reward.maxCount) {
      return reward;
    }
  }
  return B2B_REWARDS[0]; // 默认返回无奖励
};

export const calculateB2BAttackBonus = (b2bCount: number): number => {
  const reward = getB2BReward(b2bCount);
  return reward.attackBonus;
};

export const getB2BDisplayText = (b2bCount: number): string => {
  if (b2bCount < 2) return '';
  
  if (b2bCount <= 3) return `B2B x${b2bCount}`;
  if (b2bCount <= 8) return `B2B x${b2bCount}`;
  if (b2bCount <= 24) return `B2B x${b2bCount}`;
  if (b2bCount <= 67) return `B2B x${b2bCount}`;
  
  return `B2B x${b2bCount}`;
};
