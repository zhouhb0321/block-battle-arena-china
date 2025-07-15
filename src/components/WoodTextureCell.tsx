
import React from 'react';
import { getBlockColor } from '@/utils/blockColors';

interface WoodTextureCellProps {
  cellType: string | null;
  isGhost?: boolean;
  className?: string;
}

const WoodTextureCell: React.FC<WoodTextureCellProps> = ({ 
  cellType, 
  isGhost = false, 
  className = '' 
}) => {
  if (!cellType) {
    return (
      <div 
        className={`w-full h-full border border-gray-300/20 bg-gray-900/10 ${className}`}
      />
    );
  }

  // Get consistent color for the piece type
  const color = getBlockColor(cellType);
  
  // Create wood texture effect with consistent colors
  const baseStyle = {
    backgroundColor: color,
    opacity: isGhost ? 0.3 : 1,
    border: `2px solid ${color}`,
    borderColor: isGhost ? `${color}80` : color,
  };

  const woodGrainStyle = {
    background: `
      linear-gradient(45deg, 
        ${color} 25%, 
        transparent 25%, 
        transparent 50%, 
        ${color} 50%, 
        ${color} 75%, 
        transparent 75%
      ),
      linear-gradient(-45deg, 
        ${color} 25%, 
        transparent 25%, 
        transparent 50%, 
        ${color} 50%, 
        ${color} 75%, 
        transparent 75%
      )
    `,
    backgroundSize: '8px 8px',
    backgroundPosition: '0 0, 4px 4px',
    opacity: isGhost ? 0.3 : 0.9,
  };

  return (
    <div 
      className={`w-full h-full relative overflow-hidden ${className}`}
      style={baseStyle}
    >
      {/* Wood grain texture overlay */}
      <div 
        className="absolute inset-0"
        style={woodGrainStyle}
      />
      
      {/* Inner highlight for 3D effect */}
      <div 
        className="absolute inset-1 border border-white/20 pointer-events-none"
        style={{
          backgroundColor: `${color}40`,
          borderColor: isGhost ? 'transparent' : 'rgba(255, 255, 255, 0.2)'
        }}
      />
      
      {/* Debug info for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-0 left-0 text-xs text-white bg-black/50 px-1">
          {cellType}
        </div>
      )}
    </div>
  );
};

export default WoodTextureCell;
