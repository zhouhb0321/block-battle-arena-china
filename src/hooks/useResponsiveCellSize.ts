
import { useState, useEffect } from 'react';

interface UseResponsiveCellSizeOptions {
  minSize?: number;
  maxSize?: number;
  isMultiplayer?: boolean;
}

export const useResponsiveCellSize = ({ 
  minSize = 26, 
  maxSize = 30, 
  isMultiplayer = false 
}: UseResponsiveCellSizeOptions = {}) => {
  const [cellSize, setCellSize] = useState(28);

  useEffect(() => {
    const calculateCellSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // For multiplayer, use smaller sizes to fit both boards
      if (isMultiplayer) {
        if (width < 1400) return Math.max(minSize - 4, 22);
        if (width < 1600) return Math.max(minSize - 2, 24);
        return minSize;
      }
      
      // Single player responsive sizing
      if (width < 768) return minSize;
      if (width < 1024) return minSize + 1;
      if (width < 1280) return minSize + 2;
      if (width < 1536) return maxSize - 1;
      return maxSize;
    };

    const handleResize = () => {
      setCellSize(calculateCellSize());
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [minSize, maxSize, isMultiplayer]);

  return cellSize;
};
