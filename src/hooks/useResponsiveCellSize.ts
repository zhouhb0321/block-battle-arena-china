
import { useState, useEffect } from 'react';

interface UseResponsiveCellSizeOptions {
  minSize?: number;
  maxSize?: number;
  isMultiplayer?: boolean;
}

export const useResponsiveCellSize = ({ 
  minSize = 24, 
  maxSize = 36, 
  isMultiplayer = false 
}: UseResponsiveCellSizeOptions = {}) => {
  const [cellSize, setCellSize] = useState(30);

  useEffect(() => {
    const calculateCellSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // For multiplayer, use smaller sizes to fit both boards
      if (isMultiplayer) {
        if (width < 1200) return 24;
        if (width < 1400) return 26;
        if (width < 1600) return 28;
        return 30;
      }
      
      // Single player responsive sizing - larger sizes
      if (width < 768) return 28;
      if (width < 1024) return 30;
      if (width < 1280) return 32;
      if (width < 1536) return 34;
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
