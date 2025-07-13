
import { getCurrentSkin, isGarbageBlock, GARBAGE_COLOR } from './blockSkins';
import type { UserSettings } from '@/hooks/useUserSettings';

// 柔和色板（优化的低饱和度配色）
export const SOFT_COLORS = {
  I: '#4A90E2', // 柔和蓝
  O: '#F5C842', // 柔和黄
  T: '#9B59B6', // 柔和紫
  S: '#58B368', // 柔和绿
  Z: '#E74C3C', // 柔和红
  J: '#3498DB', // 柔和蓝
  L: '#E67E22', // 柔和橙
};

export const getSoftColor = (typeId: number): string => {
  const colorMap: { [key: number]: string } = {
    1: SOFT_COLORS.I,
    2: SOFT_COLORS.O,
    3: SOFT_COLORS.T,
    4: SOFT_COLORS.S,
    5: SOFT_COLORS.Z,
    6: SOFT_COLORS.J,
    7: SOFT_COLORS.L,
  };
  return colorMap[typeId] || SOFT_COLORS.I;
};

export interface BlockRenderConfig {
  cellSize: number;
  isGhost?: boolean;
  isLockDelay?: boolean;
  isHidden?: boolean;
  isClearing?: boolean;
  ghostOpacity?: number;
  theme?: 'light' | 'dark';
}

export const getBlockStyle = (
  cellValue: number | string,
  config: BlockRenderConfig,
  settings: UserSettings
): { style: React.CSSProperties; className: string } => {
  const { cellSize, isGhost = false, isLockDelay = false, isHidden = false, isClearing = false, ghostOpacity = 50, theme = 'dark' } = config;
  const currentSkin = getCurrentSkin(settings.blockSkin || 'wood');
  let style: React.CSSProperties = {};
  let className = '';

  if (typeof cellValue === 'string') {
    if (cellValue.startsWith('ghost-')) {
      // 优化的幽灵方块样式
      const baseColor = theme === 'dark' ? '#FFFFFF' : '#666666';
      style = {
        backgroundColor: 'transparent',
        border: `3px dashed ${baseColor}`,
        borderRadius: '3px',
        opacity: (ghostOpacity / 100) * 0.8 + 0.2,
        boxShadow: `0 0 8px 2px ${baseColor}40, inset 0 0 4px ${baseColor}20`,
        zIndex: 2,
      };
      className = 'ghost-block';
    } else if (cellValue.startsWith('lock-delay-')) {
      const color = cellValue.replace('lock-delay-', '');
      style = currentSkin.getBlockStyle(color, false);
      className = `${currentSkin.getBlockClass(color, false)} lock-delay-flash`;
    } else if (cellValue.startsWith('solid-')) {
      const color = cellValue.replace('solid-', '');
      style = currentSkin.getBlockStyle(color, false);
      className = currentSkin.getBlockClass(color, false);
    }
  } else if (cellValue !== 0) {
    if (isGarbageBlock(cellValue)) {
      style = {
        backgroundColor: GARBAGE_COLOR,
        border: `1px solid ${GARBAGE_COLOR}`,
        opacity: isHidden ? 0.3 : 1,
      };
      className = 'garbage-block';
    } else {
      const color = getSoftColor(cellValue);
      style = {
        backgroundColor: color,
        border: `1px solid #444`,
        borderRadius: '2px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 2px rgba(0,0,0,0.1)',
        opacity: isHidden ? 0.7 : 1,
      };
      className = 'soft-block';
    }
  } else {
    // 空方块
    style = {
      backgroundColor: 'transparent',
      border: theme === 'light' ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.05)',
    };
    className = 'empty-block';
  }

  style = {
    ...style,
    width: cellSize,
    height: cellSize,
    boxSizing: 'border-box',
    margin: 0.5,
  };

  if (isClearing) className += ' clearing-line';
  return { style, className };
};

export const createBlockElement = (
  cellValue: number | string,
  config: BlockRenderConfig,
  settings: UserSettings,
  key: string
): { style: React.CSSProperties; className: string; key: string } => {
  const { style, className } = getBlockStyle(cellValue, config, settings);
  return { style, className, key };
};

export const renderBlockPreview = (
  pieceType: number | null,
  config: BlockRenderConfig,
  settings: UserSettings,
  key: string
): { style: React.CSSProperties; className: string; key: string } => {
  if (!pieceType) {
    return {
      key,
      className: 'game-cell empty-block',
      style: {
        width: config.cellSize,
        height: config.cellSize,
        backgroundColor: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxSizing: 'border-box',
        margin: 0.5,
      }
    };
  }
  return createBlockElement(pieceType, config, settings, key);
};
