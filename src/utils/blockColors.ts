
// 标准方块颜色配置 - 进一步降低饱和度和亮度，减少视觉疲劳
export const TETROMINO_COLORS = {
  I: '#5A8A8A', // 青色（更低的饱和度）
  O: '#8A8A5A', // 黄色（更低的饱和度） 
  T: '#6A5A8A', // 紫色（更低的饱和度）
  S: '#5A8A5A', // 绿色（更低的饱和度）
  Z: '#8A5A5A', // 红色（更低的饱和度）
  J: '#5A6A8A', // 蓝色（更低的饱和度）
  L: '#8A6A5A'  // 橙色（更低的饱和度）
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
