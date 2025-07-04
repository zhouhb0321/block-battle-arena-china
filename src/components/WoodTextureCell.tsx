
import React from 'react';

interface WoodTextureCellProps {
  cellValue: number | string;
  rowIndex: number;
  cellSize: number;
  isClearing?: boolean;
}

const WoodTextureCell: React.FC<WoodTextureCellProps> = ({
  cellValue,
  rowIndex,
  cellSize,
  isClearing = false
}) => {
  const baseStyle = {
    width: `${cellSize}px`,
    height: `${cellSize}px`,
  };
  
  // 空方块样式
  if (cellValue === 0) {
    return (
      <div
        style={{
          ...baseStyle,
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
        }}
      />
    );
  }
  
  // 幽灵方块样式
  if (typeof cellValue === 'string' && cellValue.startsWith('ghost-')) {
    const color = cellValue.replace('ghost-', '');
    return (
      <div
        style={{
          ...baseStyle,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: `2px dashed ${color}`,
          opacity: 0.6,
          borderRadius: '2px',
        }}
      />
    );
  }
  
  // 活动方块样式（实心方块）
  if (typeof cellValue === 'string' && cellValue.startsWith('solid-')) {
    const color = cellValue.replace('solid-', '');
    return (
      <div
        className={`wood-texture-block ${isClearing ? 'clearing' : ''}`}
        style={{
          ...baseStyle,
          backgroundColor: color,
          border: `1px solid ${color}`,
          borderRadius: '3px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 木纹纹理叠加层 */}
        <div
          className="wood-grain-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              linear-gradient(
                45deg,
                rgba(0,0,0,0.1) 0%,
                transparent 25%,
                rgba(0,0,0,0.05) 50%,
                transparent 75%,
                rgba(0,0,0,0.1) 100%
              ),
              linear-gradient(
                90deg,
                rgba(255,255,255,0.1) 0%,
                transparent 20%,
                rgba(255,255,255,0.05) 40%,
                transparent 60%,
                rgba(255,255,255,0.1) 80%,
                transparent 100%
              )
            `,
            backgroundSize: '8px 8px, 12px 4px',
          }}
        />
        
        {/* 高光效果 */}
        <div
          className="highlight-overlay"
          style={{
            position: 'absolute',
            top: '1px',
            left: '1px',
            right: '3px',
            height: '30%',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)',
            borderRadius: '2px 2px 0 0',
          }}
        />
        
        {/* 阴影效果 */}
        <div
          className="shadow-overlay"
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '20%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)',
            borderRadius: '0 0 2px 2px',
          }}
        />
      </div>
    );
  }
  
  // 已放置的方块样式（带木纹效果）
  const colors = ['', '#00f0f0', '#f0f000', '#a000f0', '#00f000', '#f00000', '#0000f0', '#f0a000', '#666666'];
  const backgroundColor = colors[cellValue as number] || '#666666';
  
  return (
    <div
      className={`wood-texture-block placed ${isClearing ? 'clearing' : ''}`}
      style={{
        ...baseStyle,
        backgroundColor,
        border: `1px solid ${backgroundColor}`,
        borderRadius: '3px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 木纹纹理效果 */}
      <div
        className="wood-grain-overlay"
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at center, rgba(0,0,0,0.1) 0%, transparent 70%),
            linear-gradient(
              30deg,
              rgba(0,0,0,0.15) 0%,
              transparent 15%,
              rgba(0,0,0,0.08) 30%,
              transparent 45%,
              rgba(0,0,0,0.12) 60%,
              transparent 75%,
              rgba(0,0,0,0.1) 90%,
              transparent 100%
            ),
            linear-gradient(
              120deg,
              rgba(255,255,255,0.1) 0%,
              transparent 25%,
              rgba(255,255,255,0.06) 50%,
              transparent 75%,
              rgba(255,255,255,0.08) 100%
            )
          `,
          backgroundSize: '100% 100%, 6px 6px, 10px 8px',
        }}
      />
      
      {/* 立体高光效果 */}
      <div
        className="bevel-highlight"
        style={{
          position: 'absolute',
          top: '0',
          left: '0',
          right: '2px',
          bottom: '2px',
          border: '1px solid rgba(255,255,255,0.4)',
          borderBottomColor: 'transparent',
          borderRightColor: 'transparent',
          borderRadius: '2px',
          pointerEvents: 'none',
        }}
      />
      
      {/* 立体阴影效果 */}
      <div
        className="bevel-shadow"
        style={{
          position: 'absolute',
          top: '2px',
          left: '2px',
          right: '0',
          bottom: '0',
          border: '1px solid rgba(0,0,0,0.4)',
          borderTopColor: 'transparent',
          borderLeftColor: 'transparent',
          borderRadius: '2px',
          pointerEvents: 'none',
        }}
      />
      
      {/* 微光效果 */}
      <div
        className="shimmer-overlay"
        style={{
          position: 'absolute',
          top: '1px',
          left: '1px',
          width: '40%',
          height: '40%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(1px)',
        }}
      />
    </div>
  );
};

export default WoodTextureCell;
