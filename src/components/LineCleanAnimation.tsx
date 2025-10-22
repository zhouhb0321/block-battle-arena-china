
import React, { useEffect } from 'react';

interface LineCleanAnimationProps {
  isVisible: boolean;
  text: string;
  onComplete: () => void;
}

const LineCleanAnimation: React.FC<LineCleanAnimationProps> = ({ 
  isVisible, 
  text, 
  onComplete 
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onComplete();
      }, 400); // Animation duration

      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) {
    return null;
  }

  const getTextColor = () => {
    if (text.includes('TETRIS')) return 'text-yellow-300';
    if (text.includes('T-SPIN')) return 'text-purple-500';
    if (text.includes('COMBO')) return 'text-blue-400';
    return 'text-green-400';
  };

  return (
    <div className="absolute inset-0 flex justify-center items-center pointer-events-none z-50">
      <div
        className={`font-bold text-2xl drop-shadow-lg animate-line-clear-text ${getTextColor()}`}
      >
        {text}
      </div>
    </div>
  );
};

export default LineCleanAnimation;
