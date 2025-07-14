
// 统一的方块颜色配置 - 使用更柔和、一致的颜色
export const TETROMINO_COLORS = {
  I: '#64b5f6', // 天蓝色
  O: '#ffb74d', // 橙黄色
  T: '#ba68c8', // 紫色
  S: '#81c784', // 绿色
  Z: '#e57373', // 红色
  J: '#4fc3f7', // 蓝色
  L: '#ffab40'  // 橙色
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

// 获取方块类型的颜色 - 统一颜色获取入口
export const getTetrominoColor = (type: string): string => {
  const color = TETROMINO_COLORS[type as keyof typeof TETROMINO_COLORS];
  if (!color) {
    console.warn(`Unknown tetromino type: ${type}, using default color`);
    return TETROMINO_COLORS.I; // 默认颜色
  }
  return color;
};

// 获取数字ID对应的颜色 - 统一颜色获取入口
export const getBlockColor = (typeId: number): string => {
  const color = TETROMINO_TYPE_TO_COLOR[typeId];
  if (!color || color === 'transparent') {
    if (typeId !== 0) { // 0是空格，不需要警告
      console.warn(`Unknown block type ID: ${typeId}, using default color`);
    }
    return typeId === 0 ? 'transparent' : TETROMINO_COLORS.I; // 空格返回透明，其他返回默认颜色
  }
  return color;
};

// 颜色验证函数
export const validateColor = (color: string): boolean => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color) || color === 'transparent';
};

// 获取颜色的幽灵版本（半透明）
export const getGhostColor = (color: string, opacity: number = 0.3): string => {
  if (color === 'transparent') return 'transparent';
  
  // 将十六进制颜色转换为 RGBA
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// 统一颜色主题适配
export const adaptColorForTheme = (color: string, theme: 'light' | 'dark'): string => {
  if (!validateColor(color) || color === 'transparent') return color;
  
  // 对于深色主题，稍微提高亮度
  if (theme === 'dark') {
    const hex = color.replace('#', '');
    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + 20);
    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + 20);
    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + 20);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  return color;
};
