
// 优化的标准方块颜色配置 - 更鲜明的版本，确保在所有主题下都清晰可见
export const TETROMINO_COLORS = {
  I: '#00FFFF', // 亮青色 (更鲜明)
  O: '#FFFF00', // 亮黄色 (更鲜明)
  T: '#AA00FF', // 亮紫色 (更鲜明)
  S: '#00FF00', // 亮绿色 (更鲜明)
  Z: '#FF0000', // 亮红色 (更鲜明)
  J: '#0088FF', // 亮蓝色 (更鲜明)
  L: '#FF8800'  // 亮橙色 (更鲜明)
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
