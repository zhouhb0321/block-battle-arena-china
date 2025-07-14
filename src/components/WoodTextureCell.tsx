
import React from 'react';
import { getBlockColor, getTetrominoColor } from '@/utils/blockColors';
import { useTheme } from '@/contexts/ThemeContext';

interface WoodTextureCellProps {
  cellValue: number | string;
  rowIndex: number;
  cellSize: number;
  isClearing?: boolean;
  className?: string;
}

const WoodTextureCell: React.FC<WoodTextureCellProps> = ({
  cellValue,
  rowIndex,
  cellSize,
  isClearing = false,
  className = ''
}) => {
  const { actualTheme } = useTheme();
  
  const baseStyle = {
    width: `${cellSize}px`,
    height: `${cellSize}px`,
  };
  
  // Empty cell styles
  if (cellValue === 0) {
    return (
      <div
        className={className}
        style={{
          ...baseStyle,
          backgroundColor: actualTheme === 'dark' ? '#1a1a1a' : '#f5f5f5',
          border: `1px solid ${actualTheme === 'dark' ? '#333' : '#ddd'}`,
        }}
      />
    );
  }
  
  // 统一处理幽灵方块 - 使用统一的颜色系统
  if (typeof cellValue === 'string' && cellValue.startsWith('ghost-')) {
    const pieceType = cellValue.replace('ghost-', '');
    const baseColor = getTetrominoColor(pieceType);
    
    return (
      <div
        className={className}
        style={{
          ...baseStyle,
          backgroundColor: 'transparent',
          border: `2px dashed ${baseColor}`,
          opacity: 0.4,
          borderRadius: '2px',
        }}
      />
    );
  }
  
  // 统一处理活动方块 - 确保颜色一致性
  if (typeof cellValue === 'string' && cellValue.startsWith('solid-')) {
    const pieceType = cellValue.replace('solid-', '');
    const finalColor = getTetrominoColor(pieceType);
    
    return (
      <div
        className={`wood-texture-block ${isClearing ? 'clearing' : ''} ${className}`}
        style={{
          ...baseStyle,
          backgroundColor: finalColor,
          border: `1px solid ${finalColor}`,
          borderRadius: '3px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {renderWoodTexture()}
      </div>
    );
  }
  
  // 处理已放置的方块 - 使用统一的颜色系统
  const backgroundColor = getBlockColor(cellValue as number);
  
  return (
    <div
      className={`wood-texture-block placed ${isClearing ? 'clearing' : ''} ${className}`}
      style={{
        ...baseStyle,
        backgroundColor,
        border: `1px solid ${backgroundColor}`,
        borderRadius: '3px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {renderWoodTexture()}
    </div>
  );

  // 渲染木纹纹理的辅助函数
  function renderWoodTexture() {
    return (
      <>
        {/* 更柔和的木纹纹理效果 */}
        <div
          className="wood-grain-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(ellipse at center, rgba(0,0,0,0.05) 0%, transparent 70%),
              linear-gradient(
                30deg,
                rgba(0,0,0,0.08) 0%,
                transparent 15%,
                rgba(0,0,0,0.04) 30%,
                transparent 45%,
                rgba(0,0,0,0.06) 60%,
                transparent 75%,
                rgba(0,0,0,0.05) 90%,
                transparent 100%
              ),
              linear-gradient(
                120deg,
                rgba(255,255,255,0.05) 0%,
                transparent 25%,
                rgba(255,255,255,0.03) 50%,
                transparent 75%,
                rgba(255,255,255,0.04) 100%
              )
            `,
            backgroundSize: '100% 100%, 6px 6px, 10px 8px',
            mixBlendMode: 'multiply',
          }}
        />
        
        {/* 更柔和的立体效果 */}
        <div
          className="bevel-highlight"
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            right: '2px',
            bottom: '2px',
            border: '1px solid rgba(255,255,255,0.2)',
            borderBottomColor: 'transparent',
            borderRightColor: 'transparent',
            borderRadius: '2px',
            pointerEvents: 'none',
          }}
        />
        
        <div
          className="bevel-shadow"
          style={{
            position: 'absolute',
            top: '2px',
            left: '2px',
            right: '0',
            bottom: '0',
            border: '1px solid rgba(0,0,0,0.2)',
            borderTopColor: 'transparent',
            borderLeftColor: 'transparent',
            borderRadius: '2px',
            pointerEvents: 'none',
          }}
        />
        
        {/* 更柔和的闪光效果 */}
        <div
          className="shimmer-overlay"
          style={{
            position: 'absolute',
            top: '1px',
            left: '1px',
            width: '30%',
            height: '30%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(1px)',
            animation: 'shimmer 3s ease-in-out infinite',
          }}
        />
      </>
    );
  }
};

export default WoodTextureCell;
