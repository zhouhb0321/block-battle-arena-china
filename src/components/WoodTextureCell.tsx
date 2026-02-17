
import React from 'react';
import { getBlockColor } from '@/utils/blockColors';

interface WoodTextureCellProps {
  cellValue: number | string;
  rowIndex: number;
  cellSize: number;
  isClearing?: boolean;
  className?: string;
}

// Helper to adjust color brightness
function adjustBrightness(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

const WoodTextureCell: React.FC<WoodTextureCellProps> = ({
  cellValue,
  rowIndex,
  cellSize,
  isClearing = false,
  className = ''
}) => {
  const baseStyle = {
    width: `${cellSize}px`,
    height: `${cellSize}px`,
  };
  
  // Empty cell
  if (cellValue === 0) {
    return (
      <div
        className={className}
        style={{
          ...baseStyle,
          backgroundColor: '#1a1a1a',
          border: '1px solid #2a2a2a',
        }}
      />
    );
  }
  
  // Ghost piece - dark semi-transparent outline
  if (typeof cellValue === 'string' && cellValue.startsWith('ghost-')) {
    return (
      <div
        className={className}
        style={{
          ...baseStyle,
          backgroundColor: 'rgba(40, 40, 40, 0.3)',
          border: '2px dashed #555',
          opacity: 0.5,
          borderRadius: '2px',
        }}
      />
    );
  }
  
  // Active piece (solid) - beveled style
  if (typeof cellValue === 'string' && cellValue.startsWith('solid-')) {
    const color = cellValue.replace('solid-', '');
    const lighter = adjustBrightness(color, 50);
    const darker = adjustBrightness(color, -50);
    return (
      <div
        className={`beveled-block ${isClearing ? 'clearing' : ''} ${className}`}
        style={{
          ...baseStyle,
          backgroundColor: color,
          border: `2px solid ${darker}`,
          boxShadow: `inset 2px 2px 0 ${lighter}, inset -2px -2px 0 ${darker}`,
          borderRadius: '2px',
        }}
      />
    );
  }
  
  // Garbage block
  if (cellValue === 8) {
    return (
      <div
        className={`garbage-block ${isClearing ? 'clearing' : ''} ${className}`}
        style={{
          ...baseStyle,
          backgroundColor: '#888888',
          border: '2px solid #666666',
          boxShadow: 'inset 1px 1px 0 #999999, inset -1px -1px 0 #666666',
          borderRadius: '1px',
        }}
      />
    );
  }
  
  // Placed pieces - beveled style using unified color system
  const backgroundColor = getBlockColor(cellValue as number);
  const lighter = adjustBrightness(backgroundColor, 50);
  const darker = adjustBrightness(backgroundColor, -50);
  
  return (
    <div
      className={`beveled-block placed ${isClearing ? 'clearing' : ''} ${className}`}
      style={{
        ...baseStyle,
        backgroundColor,
        border: `2px solid ${darker}`,
        boxShadow: `inset 2px 2px 0 ${lighter}, inset -2px -2px 0 ${darker}`,
        borderRadius: '2px',
      }}
    />
  );
};

export default WoodTextureCell;
