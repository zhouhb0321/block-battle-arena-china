import React from 'react';
import { getCurrentSkin, isGarbageBlock, GARBAGE_COLOR } from './blockSkins';
import { getBlockColor } from './blockColors';
import type { UserSettings } from '@/hooks/useUserSettings';

// Official Tetris Guideline colors (harddrop.com/wiki/Tetris_Guideline)
export const GUIDELINE_COLORS = {
  I: '#00f0f0', // Cyan - I-piece
  O: '#f0f000', // Yellow - O-piece
  T: '#800080', // Purple - T-piece
  S: '#00f000', // Green - S-piece
  Z: '#f00000', // Red - Z-piece
  J: '#0000f0', // Blue - J-piece
  L: '#ffa500', // Orange - L-piece
};

export const getGuidelineColor = (typeId: number | string): string => {
  if (typeof typeId === 'string') {
    // Handle string types like 'I', 'O', etc.
    const upperType = typeId.toUpperCase();
    return GUIDELINE_COLORS[upperType as keyof typeof GUIDELINE_COLORS] || GUIDELINE_COLORS.I;
  }
  
  const colorMap: { [key: number]: string } = {
    1: GUIDELINE_COLORS.I,
    2: GUIDELINE_COLORS.O,
    3: GUIDELINE_COLORS.T,
    4: GUIDELINE_COLORS.S,
    5: GUIDELINE_COLORS.Z,
    6: GUIDELINE_COLORS.J,
    7: GUIDELINE_COLORS.L,
  };
  return colorMap[typeId] || GUIDELINE_COLORS.I;
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
      // 幽灵方块：白色2px虚线+发光
      style = {
        backgroundColor: 'transparent',
        border: '2px dashed #fff',
        borderRadius: '3px',
        opacity: ghostOpacity / 100 * 0.8 + 0.2,
        boxShadow: '0 0 8px 2px rgba(255,255,255,0.3)',
        zIndex: 2,
      };
      className = 'ghost-block';
    } else if (cellValue.startsWith('lock-delay-')) {
      const pieceType = cellValue.replace('lock-delay-', '');
      const color = getBlockColor(pieceType);
      style = {
        backgroundColor: color,
        border: `2px solid #333`,
        borderRadius: '2px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 2px rgba(0,0,0,0.2)',
      };
      className = 'guideline-block lock-delay-flash';
    } else if (cellValue.startsWith('solid-')) {
      const pieceType = cellValue.replace('solid-', '');
      const color = getBlockColor(pieceType);
      style = {
        backgroundColor: color,
        border: `2px solid #333`,
        borderRadius: '2px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 2px rgba(0,0,0,0.2)',
      };
      className = 'guideline-block';
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
      const color = getBlockColor(cellValue);
      style = {
        backgroundColor: color,
        border: `2px solid #333`,
        borderRadius: '2px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 2px rgba(0,0,0,0.2)',
        opacity: isHidden ? 0.7 : 1,
      };
      className = 'guideline-block';
    }
  } else {
    // 空方块
    style = {
      backgroundColor: 'transparent',
      border: theme === 'light' ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.08)',
    };
    className = 'empty-block';
  }

  style = {
    ...style,
    width: cellSize,
    height: cellSize,
    boxSizing: 'border-box',
    margin: 1,
  };

  if (isClearing) className += ' clearing-line';
  return { style, className };
};

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
          margin: 1,
        }}
      />
    );
  }
  return renderBlock(pieceType, config, settings, key);
}; 