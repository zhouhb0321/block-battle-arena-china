
// 方块皮肤系统 - 提供6种不同的方块视觉效果
export interface BlockSkin {
  id: string;
  name: string;
  description: string;
  getBlockStyle: (color: string, isGhost?: boolean) => React.CSSProperties;
  getBlockClass: (color: string, isGhost?: boolean) => string;
}

// 颜色亮度调整工具函数
function adjustBrightness(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

// 方块皮肤定义
export const BLOCK_SKINS: BlockSkin[] = [
  {
    id: 'wood',
    name: '立体风格',
    description: '默认的 TETR.IO 风格立体方块',
    getBlockStyle: (color: string, isGhost = false) => {
      if (isGhost) {
        return {
          backgroundColor: 'rgba(40, 40, 40, 0.3)',
          border: '2px dashed #555',
          borderRadius: '2px',
          opacity: 0.5,
        };
      }
      const lighter = adjustBrightness(color, 50);
      const darker = adjustBrightness(color, -50);
      return {
        backgroundColor: color,
        border: `2px solid ${darker}`,
        boxShadow: `inset 2px 2px 0 ${lighter}, inset -2px -2px 0 ${darker}`,
        borderRadius: '2px',
      };
    },
    getBlockClass: (_color: string, isGhost = false) => 
      isGhost ? 'ghost-block' : 'beveled-block'
  },
  {
    id: 'flat',
    name: '纯平风格',
    description: '简洁的纯平设计，无装饰',
    getBlockStyle: (color: string, isGhost = false) => {
      if (isGhost) {
        return {
          backgroundColor: 'rgba(40, 40, 40, 0.3)',
          border: '2px dashed #555',
          borderRadius: '0px',
          opacity: 0.5,
        };
      }
      return {
        backgroundColor: color,
        border: `1px solid ${adjustBrightness(color, -60)}`,
        borderRadius: '0px',
      };
    },
    getBlockClass: () => 'flat-block'
  },
  {
    id: '3d',
    name: '强立体风格',
    description: '更强的3D效果立体方块',
    getBlockStyle: (color: string, isGhost = false) => {
      if (isGhost) {
        return {
          backgroundColor: 'rgba(40, 40, 40, 0.3)',
          border: '2px dashed #555',
          borderRadius: '2px',
          opacity: 0.5,
        };
      }
      return {
        backgroundColor: color,
        border: `2px solid ${adjustBrightness(color, -50)}`,
        borderRadius: '2px',
        boxShadow: `3px 3px 6px rgba(0,0,0,0.4), inset 2px 2px 4px rgba(255,255,255,0.4), inset -2px -2px 4px rgba(0,0,0,0.2)`,
        background: `linear-gradient(135deg, ${adjustBrightness(color, 40)} 0%, ${color} 50%, ${adjustBrightness(color, -40)} 100%)`
      };
    },
    getBlockClass: () => '3d-block'
  },
  {
    id: 'colorful',
    name: '彩色风格',
    description: '多彩渐变的彩虹方案',
    getBlockStyle: (color: string, isGhost = false) => {
      if (isGhost) {
        return {
          backgroundColor: 'rgba(40, 40, 40, 0.3)',
          border: '2px dashed #555',
          borderRadius: '3px',
          opacity: 0.5,
        };
      }
      return {
        backgroundColor: color,
        border: `2px solid ${adjustBrightness(color, -40)}`,
        borderRadius: '3px',
        background: `radial-gradient(circle, ${adjustBrightness(color, 50)} 0%, ${color} 70%, ${adjustBrightness(color, -20)} 100%)`,
        boxShadow: `0 0 6px ${color}60`
      };
    },
    getBlockClass: () => 'colorful-block'
  },
  {
    id: 'classic',
    name: '经典风格',
    description: '传统俄罗斯方块的经典样式',
    getBlockStyle: (color: string, isGhost = false) => {
      if (isGhost) {
        return {
          backgroundColor: 'rgba(40, 40, 40, 0.3)',
          border: '2px dashed #555',
          borderRadius: '1px',
          opacity: 0.5,
        };
      }
      return {
        backgroundColor: color,
        border: `2px solid ${adjustBrightness(color, -50)}`,
        borderRadius: '1px',
        boxShadow: `inset 1px 1px 2px rgba(255,255,255,0.3)`
      };
    },
    getBlockClass: () => 'classic-block'
  },
  {
    id: 'hui',
    name: '回字风格',
    description: '中式"回"字设计，实心对称美学',
    getBlockStyle: (color: string, isGhost = false) => {
      if (isGhost) {
        return {
          backgroundColor: 'rgba(40, 40, 40, 0.3)',
          border: '2px dashed #555',
          borderRadius: '1px',
          opacity: 0.5,
        };
      }
      return {
        backgroundColor: color,
        border: `3px solid ${adjustBrightness(color, -40)}`,
        borderRadius: '1px',
        position: 'relative' as const,
        boxShadow: `inset 0 0 0 2px ${adjustBrightness(color, -20)}`,
        color: color
      };
    },
    getBlockClass: (_color: string, isGhost = false) => isGhost ? 'hui-ghost-block' : 'hui-block'
  }
];

// 获取当前选中的皮肤
export const getCurrentSkin = (skinId: string): BlockSkin => {
  return BLOCK_SKINS.find(skin => skin.id === skinId) || BLOCK_SKINS[0];
};

// 垃圾行颜色定义 - 更清晰的灰色
export const GARBAGE_COLOR = '#888888';
export const isGarbageBlock = (cellValue: number | string): boolean => {
  return cellValue === 8 || cellValue === GARBAGE_COLOR;
};

// 根据方块类型编号获取颜色 - 与 blockColors.ts 完全一致
export const getColorByTypeId = (typeId: number): string => {
  const colors = ['', '#00B8B8', '#B8B800', '#8800AA', '#00B800', '#B80000', '#0044B8', '#B86600'];
  return colors[typeId] || '#666666';
};
