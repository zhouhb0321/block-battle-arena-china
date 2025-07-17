
// 方块皮肤系统 - 提供6种不同的方块视觉效果
export interface BlockSkin {
  id: string;
  name: string;
  description: string;
  getBlockStyle: (color: string, isGhost?: boolean) => React.CSSProperties;
  getBlockClass: (color: string, isGhost?: boolean) => string;
}

// 方块皮肤定义
export const BLOCK_SKINS: BlockSkin[] = [
  {
    id: 'wood',
    name: '木纹风格',
    description: '默认的木纹纹理效果',
    getBlockStyle: (color: string, isGhost = false) => ({
      backgroundColor: isGhost ? 'transparent' : color,
      border: isGhost ? `2px dashed ${color}` : `1px solid ${adjustBrightness(color, -20)}`,
      opacity: isGhost ? 0.3 : 1,
      backgroundImage: isGhost ? 'none' : 'linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.1) 75%)',
      backgroundSize: '6px 6px'
    }),
    getBlockClass: (color: string, isGhost = false) => 
      isGhost ? 'ghost-block' : 'wood-texture-block'
  },
  {
    id: 'flat',
    name: '纯平风格',
    description: '简洁的纯平设计，无装饰',
    getBlockStyle: (color: string, isGhost = false) => ({
      backgroundColor: isGhost ? 'transparent' : color,
      border: isGhost ? `2px dashed ${color}` : 'none',
      opacity: isGhost ? 0.4 : 1,
      borderRadius: '0px',
    }),
    getBlockClass: () => 'flat-block'
  },
  {
    id: '3d',
    name: '立体风格',
    description: '3D效果的立体方块',
    getBlockStyle: (color: string, isGhost = false) => ({
      backgroundColor: isGhost ? 'transparent' : color,
      border: isGhost ? `2px dashed ${color}` : `2px outset ${color}`,
      opacity: isGhost ? 0.4 : 1,
      borderRadius: '2px',
      boxShadow: isGhost ? 'none' : `2px 2px 4px rgba(0,0,0,0.3), inset 1px 1px 2px rgba(255,255,255,0.3)`,
      background: isGhost ? 'transparent' : `linear-gradient(135deg, ${adjustBrightness(color, 30)} 0%, ${color} 50%, ${adjustBrightness(color, -30)} 100%)`
    }),
    getBlockClass: () => '3d-block'
  },
  {
    id: 'colorful',
    name: '彩色风格',
    description: '多彩渐变的彩虹方案',
    getBlockStyle: (color: string, isGhost = false) => ({
      backgroundColor: isGhost ? 'transparent' : color,
      border: isGhost ? `2px dashed ${color}` : `1px solid ${adjustBrightness(color, -40)}`,
      opacity: isGhost ? 0.4 : 1,
      borderRadius: '3px',
      background: isGhost ? 'transparent' : `radial-gradient(circle, ${adjustBrightness(color, 50)} 0%, ${color} 70%, ${adjustBrightness(color, -20)} 100%)`,
      boxShadow: isGhost ? 'none' : `0 0 6px ${color}60`
    }),
    getBlockClass: () => 'colorful-block'
  },
  {
    id: 'classic',
    name: '经典风格',
    description: '传统俄罗斯方块的经典样式',
    getBlockStyle: (color: string, isGhost = false) => {
      // 经典俄罗斯方块颜色映射
      const classicColors: { [key: string]: string } = {
        '#00f0f0': '#00FFFF', // I - 青色
        '#f0f000': '#FFFF00', // O - 黄色  
        '#a000f0': '#FF00FF', // T - 紫色
        '#00f000': '#00FF00', // S - 绿色
        '#f00000': '#FF0000', // Z - 红色
        '#0000f0': '#0000FF', // J - 蓝色
        '#f0a000': '#FFA500'  // L - 橙色
      };
      
      const classicColor = classicColors[color] || color;
      
      return {
        backgroundColor: isGhost ? 'transparent' : classicColor,
        border: isGhost ? `2px dashed ${classicColor}` : `2px solid ${adjustBrightness(classicColor, -50)}`,
        opacity: isGhost ? 0.3 : 1,
        borderRadius: '1px',
      };
    },
    getBlockClass: () => 'classic-block'
  },
  {
    id: 'hui',
    name: '回字风格',
    description: '中式"回"字设计，实心对称美学',
    getBlockStyle: (color: string, isGhost = false) => ({
      backgroundColor: isGhost ? 'transparent' : color,
      border: isGhost ? `2px dashed ${color}` : `2px solid ${adjustBrightness(color, -30)}`,
      opacity: isGhost ? 0.4 : 1,
      borderRadius: '1px',
      position: 'relative' as const,
      boxShadow: isGhost ? 'none' : `inset 0 0 0 1px ${adjustBrightness(color, -20)}`,
      color: color // 设置颜色给 CSS 伪元素使用
    }),
    getBlockClass: (color: string, isGhost = false) => isGhost ? 'hui-ghost-block' : 'hui-block'
  }
];

// 颜色亮度调整工具函数
function adjustBrightness(color: string, amount: number): string {
  // 简单的颜色亮度调整
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

// 获取当前选中的皮肤
export const getCurrentSkin = (skinId: string): BlockSkin => {
  return BLOCK_SKINS.find(skin => skin.id === skinId) || BLOCK_SKINS[0];
};

// 垃圾行颜色定义
export const GARBAGE_COLOR = '#666666';
export const isGarbageBlock = (cellValue: number | string): boolean => {
  return cellValue === 8 || cellValue === GARBAGE_COLOR;
};

// 根据方块类型编号获取颜色
export const getColorByTypeId = (typeId: number): string => {
  const colors = ['', '#00f0f0', '#f0f000', '#a000f0', '#00f000', '#f00000', '#0000f0', '#f0a000'];
  return colors[typeId] || '#666666';
};
