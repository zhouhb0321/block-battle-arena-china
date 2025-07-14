
// 统一的方块颜色配置 - 使用更柔和的颜色
export const TETROMINO_COLORS = {
  I: '#6b7280', // 柔和的灰色
  O: '#a3a3a3', // 浅灰色
  T: '#8b7355', // 土黄色
  S: '#9ca3af', // 中性灰
  Z: '#94a3b8', // 蓝灰色
  J: '#71717a', // 深灰色
  L: '#a78bfa'  // 淡紫色
};

// 方块类型到颜色的映射（用于游戏板渲染）
export const TETROMINO_TYPE_TO_COLOR: { [key: number]: string } = {
  0: 'transparent', // 空格
  1: TETROMINO_COLORS.I,
  2: TETROMINO_COLORS.O,
  3: TETROMINO_COLORS.T,
  4: TETROMINO_COLORS.S,
  5: TETROMINO_COLORS.Z,
  6: TETROMINO_COLORS.J,
  7: TETROMINO_COLORS.L
};

// 获取方块类型的颜色
export const getTetrominoColor = (type: string): string => {
  return TETROMINO_COLORS[type as keyof typeof TETROMINO_COLORS] || '#6b7280';
};

// 获取数字ID对应的颜色
export const getBlockColor = (typeId: number): string => {
  return TETROMINO_TYPE_TO_COLOR[typeId] || '#6b7280';
};
