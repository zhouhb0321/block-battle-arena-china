
// 统一的方块颜色配置
export const TETROMINO_COLORS = {
  I: '#4a9d9c', // 柔和的青色
  O: '#c4a661', // 柔和的黄色
  T: '#8b6bb1', // 柔和的紫色
  S: '#6b9b6b', // 柔和的绿色
  Z: '#b87575', // 柔和的红色
  J: '#5d7fb8', // 柔和的蓝色
  L: '#c4906b'  // 柔和的橙色
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
