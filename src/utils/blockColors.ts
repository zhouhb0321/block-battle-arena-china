
// 优化的标准方块颜色配置 - 柔和版本
export const TETROMINO_COLORS = {
  I: '#00C4D4', // 柔和青色
  O: '#F4D03F', // 柔和黄色
  T: '#A569BD', // 柔和紫色
  S: '#58D68D', // 柔和绿色
  Z: '#E74C3C', // 柔和红色
  J: '#5DADE2', // 柔和蓝色
  L: '#F39C12'  // 柔和橙色
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
  return TETROMINO_COLORS[type as keyof typeof TETROMINO_COLORS] || '#666666';
};

// 获取数字ID对应的颜色
export const getBlockColor = (typeId: number): string => {
  return TETROMINO_TYPE_TO_COLOR[typeId] || '#666666';
};
