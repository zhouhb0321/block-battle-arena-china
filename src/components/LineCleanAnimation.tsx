
import React, { useEffect, useState } from 'react';

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
  const [animationPhase, setAnimationPhase] = useState<'growing' | 'shrinking' | 'done'>('growing');

  useEffect(() => {
    if (isVisible) {
      setAnimationPhase('growing');
      
      // Growing phase
      const growTimer = setTimeout(() => {
        setAnimationPhase('shrinking');
      }, 120);

      // Shrinking phase
      const shrinkTimer = setTimeout(() => {
        setAnimationPhase('done');
        onComplete();
      }, 240);

      return () => {
        clearTimeout(growTimer);
        clearTimeout(shrinkTimer);
      };
    }
  }, [isVisible, onComplete]);

  if (!isVisible || animationPhase === 'done') {
    return null;
  }

  const getAnimationClasses = () => {
    switch (animationPhase) {
      case 'growing':
        return 'animate-pulse scale-110 opacity-100';
      case 'shrinking':
        return 'scale-90 opacity-0 transition-all duration-150';
      default:
        return '';
    }
  };

  const getTextColor = () => {
    if (text.includes('TETRIS')) return 'text-yellow-400';
    if (text.includes('T-SPIN')) return 'text-purple-400';
    if (text.includes('COMBO')) return 'text-blue-400';
    return 'text-green-400';
  };

  return (
    <div className="absolute left-0 top-0 w-full flex justify-center items-center pointer-events-none z-50">
      <div className={`${getAnimationClasses()} ${getTextColor()} font-bold text-lg transform transition-all duration-200`}>
        {text}
      </div>
    </div>
  );
};

export default LineCleanAnimation;
