
// 方块皮肤系统 - 提供5种不同的方块视觉效果
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
    }),
    getBlockClass: (color: string, isGhost = false) => 
      isGhost ? 'ghost-block' : 'wood-texture-block'
  },
  {
    id: 'solid',
    name: '纯色方块',
    description: '简洁的纯色填充效果',
    getBlockStyle: (color: string, isGhost = false) => ({
      backgroundColor: isGhost ? 'transparent' : color,
      border: isGhost ? `2px dashed ${color}` : `2px solid ${adjustBrightness(color, -30)}`,
      opacity: isGhost ? 0.4 : 1,
      borderRadius: '2px',
    }),
    getBlockClass: () => 'solid-block'
  },
  {
    id: 'outline',
    name: '边框模式',
    description: '只显示方块边框轮廓',
    getBlockStyle: (color: string, isGhost = false) => ({
      backgroundColor: 'transparent',
      border: `3px solid ${color}`,
      opacity: isGhost ? 0.5 : 1,
      borderRadius: '1px',
    }),
    getBlockClass: () => 'outline-block'
  },
  {
    id: 'mono',
    name: '单色模式',
    description: '所有方块使用统一颜色',
    getBlockStyle: (color: string, isGhost = false) => ({
      backgroundColor: isGhost ? 'transparent' : '#ffffff',
      border: isGhost ? '2px dashed #ffffff' : '1px solid #cccccc',
      opacity: isGhost ? 0.3 : 1,
    }),
    getBlockClass: () => 'mono-block'
  },
  {
    id: 'neon',
    name: '霓虹效果',
    description: '发光的霓虹色彩效果',
    getBlockStyle: (color: string, isGhost = false) => ({
      backgroundColor: isGhost ? 'transparent' : color,
      border: `1px solid ${color}`,
      boxShadow: isGhost ? 'none' : `0 0 8px ${color}, inset 0 0 8px rgba(255,255,255,0.2)`,
      opacity: isGhost ? 0.4 : 1,
      borderRadius: '2px',
    }),
    getBlockClass: () => 'neon-block'
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
