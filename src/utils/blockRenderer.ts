import { getCurrentSkin, getColorByTypeId, isGarbageBlock, GARBAGE_COLOR } from './blockSkins';
import type { UserSettings } from '@/hooks/useUserSettings';

// 优化的方块颜色 - 更柔和的色调
export const OPTIMIZED_COLORS = {
  I: '#4FC3F7', // 浅蓝色
  O: '#FFD54F', // 金黄色
  T: '#9C27B0', // 紫色
  S: '#4CAF50', // 绿色
  Z: '#F44336', // 红色
  J: '#2196F3', // 蓝色
  L: '#FF9800', // 橙色
};

// 获取优化的方块颜色
export const getOptimizedColor = (typeId: number): string => {
  const colorMap: { [key: number]: string } = {
    1: OPTIMIZED_COLORS.I,
    2: OPTIMIZED_COLORS.O,
    3: OPTIMIZED_COLORS.T,
    4: OPTIMIZED_COLORS.S,
    5: OPTIMIZED_COLORS.Z,
    6: OPTIMIZED_COLORS.J,
    7: OPTIMIZED_COLORS.L,
  };
  return colorMap[typeId] || OPTIMIZED_COLORS.I;
};

// 统一的方块渲染配置
export interface BlockRenderConfig {
  cellSize: number;
  isGhost?: boolean;
  isLockDelay?: boolean;
  isHidden?: boolean;
  isClearing?: boolean;
  ghostOpacity?: number;
  theme?: 'light' | 'dark';
}

// 获取方块样式
export const getBlockStyle = (
  cellValue: number | string,
  config: BlockRenderConfig,
  settings: UserSettings
): { style: React.CSSProperties; className: string } => {
  const { cellSize, isGhost = false, isLockDelay = false, isHidden = false, isClearing = false, ghostOpacity = 50, theme = 'dark' } = config;
  const currentSkin = getCurrentSkin(settings.blockSkin || 'wood');
  
  let style: React.CSSProperties = {};
  let className = '';

  // 处理字符串类型的方块（幽灵、锁定延迟等）
  if (typeof cellValue === 'string') {
    if (cellValue.startsWith('ghost-')) {
      const color = cellValue.replace('ghost-', '');
      const opacity = (ghostOpacity / 100) * 0.8;
      
      // 优化的幽灵方块样式
      if (theme === 'light') {
        style = {
          backgroundColor: `rgba(100, 100, 100, ${opacity * 0.4})`,
          border: `2px dashed #666666`,
          borderRadius: '3px',
          opacity: 1,
        };
      } else {
        style = {
          backgroundColor: `rgba(60, 60, 60, ${opacity * 0.5})`,
          border: `2px dashed #888888`,
          borderRadius: '3px',
          opacity: opacity + 0.3,
        };
      }
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
    // 处理数字类型的方块
    if (isGarbageBlock(cellValue)) {
      style = {
        backgroundColor: GARBAGE_COLOR,
        border: `1px solid ${GARBAGE_COLOR}`,
        opacity: isHidden ? 0.3 : 1,
      };
      className = 'garbage-block';
    } else {
      const color = getOptimizedColor(cellValue);
      style = currentSkin.getBlockStyle(color, false);
      className = currentSkin.getBlockClass(color, false);
    }
  } else {
    // 空方块
    if (isHidden) {
      style = {
        backgroundColor: 'transparent',
        border: 'none',
      };
    } else {
      if (theme === 'light') {
        style = {
          backgroundColor: 'transparent',
          border: '1px solid rgba(0, 0, 0, 0.1)',
        };
      } else {
        style = {
          backgroundColor: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        };
      }
    }
    className = 'empty-block';
  }

  // 应用通用样式
  style = {
    ...style,
    width: cellSize,
    height: cellSize,
    boxSizing: 'border-box',
  };

  // 处理隐藏行
  if (isHidden) {
    style.opacity = (style.opacity as number || 1) * 0.3;
  }

  // 处理消除行动画
  if (isClearing) {
    className += ' clearing-line';
  }

  return { style, className };
};

// 渲染单个方块
export const renderBlock = (
  cellValue: number | string,
  config: BlockRenderConfig,
  settings: UserSettings,
  key: string
): JSX.Element => {
  const { style, className } = getBlockStyle(cellValue, config, settings);
  
  return (
    <div
      key={key}
      className={`game-cell ${className}`}
      style={style}
    />
  );
};

// 渲染方块预览（用于NEXT和HOLD区域）
export const renderBlockPreview = (
  pieceType: number | null,
  config: BlockRenderConfig,
  settings: UserSettings,
  key: string
): JSX.Element => {
  if (!pieceType) {
    return (
      <div
        key={key}
        className="game-cell empty-block"
        style={{
          width: config.cellSize,
          height: config.cellSize,
          backgroundColor: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxSizing: 'border-box',
        }}
      />
    );
  }

  return renderBlock(pieceType, config, settings, key);
}; 