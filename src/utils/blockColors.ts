
// 官方标准方块颜色配置 (参考 tetriswiki.cn)
export const TETROMINO_COLORS = {
  I: '#00FFFF', // 青色
  O: '#FFFF00', // 黄色
  T: '#800080', // 紫色
  S: '#00FF00', // 绿色
  Z: '#FF0000', // 红色
  J: '#0000FF', // 蓝色
  L: '#FFA500'  // 橙色
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
